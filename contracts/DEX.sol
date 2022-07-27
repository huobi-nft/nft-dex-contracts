// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./ICommon.sol";

contract DEX {

    address public manager;
    uint256 public feeDenominator;
    uint256 public maxRoyaltyRate;
    uint256 public feeRate;
    address public feeRecipient;

    mapping(bytes32 => bool) public finalizedOrder;
    mapping(address => uint256) public userNonce;
    mapping(address => mapping(bytes32 => bool)) public canceledOrder;

    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _status;
    bool public initialized;

    struct OrderQuery {
        uint8 state;
        bytes32 order_digest;
        bytes32 tokens_digest;
        bytes order_bytes;
        bytes tokens_bytes;
    }

    struct Sig {
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    event OrderCancelled(address indexed maker, bytes32 indexed order_digest);
    event AllOrdersCancelled(address indexed maker, uint256 current_nonce);
    event FixedPriceOrderMatched(
        address sender,
        address maker,
        address taker,
        bytes32 maker_order_digest,
        bytes32 taker_order_digest,
        bytes maker_order_bytes,
        bytes taker_order_bytes,
        bytes tokens_bytes
    );

    string public name;
    string public version;
    bytes32 public HashEIP712Version;
    bytes32 public HashEIP712Name;
    bytes32 public constant HashEIP712Domain = keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
    bytes32 public constant HashOrderStruct = keccak256(
        "FixedPriceOrder(address maker,address taker,address asset_recipient,address royalty_recipient,uint96 royalty_rate,uint64 start,uint64 expire,uint64 maker_nonce,bool taker_get_nft,bool allow_cex,TokensForExchange tokens)TokensForExchange(address nft,address ft,uint256 nft_id,uint256 nft_amount,uint256 ft_amount)"
    );
    bytes32 public constant HashTokenStruct = keccak256(
        "TokensForExchange(address nft,address ft,uint256 nft_id,uint256 nft_amount,uint256 ft_amount)"
    );

    struct TokensForExchange {
        address nft;
        address ft; // address(0) means local coin of the chain (ETH, HT, MATIC...)
        uint256 nft_id;
        uint256 nft_amount; // 0 for ERC721; x (x > 0) for ERC1155.
        uint256 ft_amount; // fixed_price
    }

    // OrderType: FixedPrice; EnglishAuction; DutchAuction
    // CoNFT TokenID(256bit) => | 160bit(CreatorAddress) | 48bit(CollectionID) | 48bit(InternalTokenID) |
    // 1) FT are transferred through separately tx;
    // 2) FT are transferred through centralized-DB;
    // address maker; // maker can be recovered from order signature, but maker_sig and taker_sig may be confusing.
    struct FixedPriceOrder {
        address maker;
        address taker; // address(0) means anyone can trade
        address asset_recipient;
        address royalty_recipient;
        uint96 royalty_rate;
        // uint96 relayer_rate;
        uint64 start;
        uint64 expire;
        uint64 maker_nonce;
        bool taker_get_nft;
        bool allow_cex;
        TokensForExchange tokens;
    }

    function _HashTokensForExchange(TokensForExchange memory tokens) internal pure returns (bytes32, bytes memory) {
        bytes memory tokens_bytes = abi.encode(HashTokenStruct, tokens.nft, tokens.ft, tokens.nft_id, tokens.nft_amount, tokens.ft_amount);
        bytes32 tokens_digest = keccak256(tokens_bytes);
        return (tokens_digest, tokens_bytes);
    }

    // https://eips.ethereum.org/EIPS/eip-712#definition-of-hashstruct
    function EIP712Encode(FixedPriceOrder memory order, bytes32 _HashTokens) internal pure returns(bytes memory) {
        bytes memory order_bytes = abi.encode(
            HashOrderStruct,
            order.maker,
            order.taker,
            order.asset_recipient,
            order.royalty_recipient,
            order.royalty_rate,
            order.start,
            order.expire,
            order.maker_nonce,
            order.taker_get_nft,
            order.allow_cex,
            _HashTokens
        );
        return order_bytes;
    }

    function orderClone(FixedPriceOrder memory order) pure private returns (FixedPriceOrder memory) {
        return FixedPriceOrder(
            order.maker,
            order.taker,
            order.asset_recipient,
            order.royalty_recipient,
            order.royalty_rate,
            order.start,
            order.expire,
            order.maker_nonce,
            order.taker_get_nft,
            order.allow_cex,
            order.tokens
        );
    }

    modifier onlyOperator() {
        require(IManager(manager).operators(msg.sender), "Caller is not an operator");
        _;
    }

    modifier onlyDAO() {
        require(IManager(manager).DAO() == msg.sender, "Caller is not the DAO");
        _;
    }

    function initialize(address _manager, address _fee_recipient, string memory _name, string memory _version) external {
        require(!initialized, "Contract was initialized");
        initialized = true;
        feeRecipient = _fee_recipient;
        manager = _manager;
        name = _name;
        version = _version;
        HashEIP712Name = keccak256(bytes(name));
        HashEIP712Version = keccak256(bytes(version));
        _status = _NOT_ENTERED;
        feeDenominator = 1000000000; // 1,000,000,000
        maxRoyaltyRate = feeDenominator / 10; // 10%
        feeRate = 20000000;  // 20,000,000 / 1,000,000,000 == 2%
    }

    function setNameVersion(string memory _name, string memory _version) external onlyOperator {
        name = _name;
        version = _version;
        HashEIP712Name = keccak256(bytes(name));
        HashEIP712Version = keccak256(bytes(version));
    }

    function setFeeRate(uint256 _feeRate) external onlyOperator {
        require(_feeRate <= feeDenominator, "Fee rate is too high");
        feeRate = _feeRate;
    }

    function setFeeRecipient(address _feeRecipient) external onlyOperator {
        require(_feeRecipient != address(0), "Fee recipient rate is address(0)");
        feeRecipient = _feeRecipient;
    }

    function setMaxRoyaltyRate(uint256 _maxRoyaltyRate) external onlyOperator {
        require(_maxRoyaltyRate <= feeDenominator, "Royalty rate is too high");
        maxRoyaltyRate = _maxRoyaltyRate;
    }

    // https://ethereum.stackexchange.com/questions/83174/is-it-best-practice-to-check-signature-malleability-in-ecrecover
    // https://crypto.iacr.org/2019/affevents/wac/medias/Heninger-BiasedNonceSense.pdf
    function checkSignature(bytes32 digest, Sig memory signature) public pure returns (address singer) {
        require(uint256(signature.s) <= 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0, "Invalid s parameter");
        require(signature.v == 27 || signature.v == 28, "Invalid v parameter");
        singer = ecrecover(digest, signature.v, signature.r, signature.s);
        require(singer != address(0), "Invalid signature");
        return singer;
    }

    function checkOrder(FixedPriceOrder memory maker_order, address maker, address taker) public view {
        IManager m = IManager(manager);
        uint256 min_price = m.allowedPayment(maker_order.tokens.ft);
        require(maker != taker, "Taker can not be same as maker");
        require(maker_order.taker == address(0) || maker_order.taker == taker, "Taker is not allowed by maker");
        require(min_price != 0 && maker_order.tokens.ft_amount >= min_price, "FT contract is not supported or price is too low");
        require(m.allNftAllowed() || m.allowedNft(maker_order.tokens.nft), "NFT contract is not supported");
        require(maker_order.expire >= block.timestamp && block.timestamp >= maker_order.start, "Time error");
        require(maker_order.maker_nonce == userNonce[maker], "Maker nonce doesn't match");
        require(maker_order.royalty_rate <= maxRoyaltyRate, "Royalty rate is too high");
    }

    // If msg.sender is CEX operator, no need to transfer FT/ERC20
    function cexFixedPrice(FixedPriceOrder memory maker_order, Sig memory maker_sig, address taker) external onlyOperator nonReentrant {
        require(maker_order.allow_cex, "Cex is not permitted by maker"); // onlyCex
        require(maker_order.taker_get_nft, "Taker should be the nft buyer");

        (bytes32 tokens_digest, bytes memory tokens_bytes) = _HashTokensForExchange(maker_order.tokens);
        bytes memory maker_order_bytes = EIP712Encode(maker_order, tokens_digest);
        bytes32 maker_order_digest = _hashTypedDataV4(keccak256(maker_order_bytes));
        address maker = checkSignature(maker_order_digest, maker_sig);

        require(!finalizedOrder[maker_order_digest], "Order has been finalized or canceled");
        require(!canceledOrder[maker][maker_order_digest], "Order has been finalized or canceled");
        finalizedOrder[maker_order_digest] = true;
        checkOrder(maker_order, maker, taker);

        transfer_nft(maker_order, maker, taker);

        emit FixedPriceOrderMatched(msg.sender, maker, taker, maker_order_digest, bytes32(0), maker_order_bytes, "", tokens_bytes);
    }

    function dexFixedPrice(
        FixedPriceOrder memory maker_order,
        Sig memory maker_sig,
        Sig memory taker_sig,
        address taker_asset_recipient
    ) external payable nonReentrant {

        FixedPriceOrder memory taker_order = orderClone(maker_order);
        taker_order.asset_recipient = taker_asset_recipient;

        (bytes32 tokens_digest, bytes memory tokens_bytes) = _HashTokensForExchange(maker_order.tokens);
        bytes memory maker_order_bytes = EIP712Encode(maker_order, tokens_digest);
        bytes memory taker_order_bytes = EIP712Encode(taker_order, tokens_digest);

        bytes32 maker_order_digest = _hashTypedDataV4(keccak256(maker_order_bytes));
        bytes32 taker_order_digest = _hashTypedDataV4(keccak256(taker_order_bytes));

        address maker = checkSignature(maker_order_digest, maker_sig);
        address taker = checkSignature(taker_order_digest, taker_sig);

        require(!finalizedOrder[maker_order_digest] && !finalizedOrder[taker_order_digest], "Order is finalized or canceled");
        require(!canceledOrder[maker][maker_order_digest] && !canceledOrder[taker][taker_order_digest], "Order is finalized or canceled");
        finalizedOrder[maker_order_digest] = true;
        finalizedOrder[taker_order_digest] = true;
        checkOrder(maker_order, maker, taker);

        require(maker != taker_order.asset_recipient && taker != maker_order.asset_recipient, "Transferring asset to oneself is not supported");
        if (maker_order.taker_get_nft) {
            transfer_nft(maker_order, maker, taker_order.asset_recipient);
            transfer_ft(maker_order, taker, maker_order.asset_recipient);
        } else {
            transfer_nft(maker_order, taker, maker_order.asset_recipient);
            transfer_ft(maker_order, maker, taker_order.asset_recipient);
        }
        // TODO ??? checking [owner of NFT] changed & [amount of FT's owner] increased accordingly

        emit FixedPriceOrderMatched(msg.sender, maker, taker, maker_order_digest, taker_order_digest, maker_order_bytes, taker_order_bytes, tokens_bytes);
    }

    function _transferFrom(address token_contract, address token_owner, address token_recipient, uint256 token_id_or_amount) private {
        IProxy user_proxy = IProxy(IRegistry(IManager(manager).registry()).proxies(token_owner));
        require(address(user_proxy) != address(0), "User proxy is not existed");
        bytes memory call_data = abi.encodeWithSignature("transferFrom(address,address,uint256)", token_owner, token_recipient, token_id_or_amount);
        user_proxy.proxyAssert(token_contract, false, 0, call_data);
        // IERC721(order.tokens.nft).transferFrom(nft_owner, nft_recipient, nft_id);
        // IERC20(order.tokens.ft).transferFrom(ft_owner, ft_recipient, ft_amount);
    }

    function transfer_nft(FixedPriceOrder memory order, address nft_owner, address nft_recipient) private {
        if (IManager(manager).CoNFT(order.tokens.nft)) {
            if (!ILazyMint(order.tokens.nft).exists(order.tokens.nft_id)) {
                require(address(uint160(order.tokens.nft_id >> 96)) == nft_owner, "TokenID's address part doesn't match creator(seller)");
                ILazyMint(order.tokens.nft).lazyMint(nft_recipient, order.tokens.nft_id, order.royalty_recipient, order.royalty_rate);
            } else {
                checkRoyaltyInfo(order);
                _transferFrom(order.tokens.nft, nft_owner, nft_recipient, order.tokens.nft_id);
            }
        } else {
            checkNFT(order, nft_owner);
            _transferFrom(order.tokens.nft, nft_owner, nft_recipient, order.tokens.nft_id);
        }
    }

    function transfer_ft(FixedPriceOrder memory order, address ft_owner, address ft_recipient) private {
        uint256 royalty_amount = order.tokens.ft_amount * order.royalty_rate / feeDenominator;
        uint256 platform_amount = order.tokens.ft_amount * feeRate / feeDenominator;
        uint256 remain_amount = order.tokens.ft_amount  - (royalty_amount + platform_amount);

        if (order.tokens.ft != address(0)) {
            require(msg.value == 0, "Msg.value should be zero");
            _transferFrom(order.tokens.ft, ft_owner, order.royalty_recipient, royalty_amount);
            _transferFrom(order.tokens.ft, ft_owner, feeRecipient, platform_amount);
            _transferFrom(order.tokens.ft, ft_owner, ft_recipient, remain_amount);
        } else {
            require(msg.value >= order.tokens.ft_amount, "Msg.value is not enough");
            if (msg.value > order.tokens.ft_amount) {
                sendValue(payable(msg.sender), msg.value - order.tokens.ft_amount);
            }
            sendValue(payable(order.royalty_recipient), royalty_amount);
            sendValue(payable(feeRecipient), platform_amount);
            sendValue(payable(ft_owner), remain_amount);
        }
    }

    function checkNFT(FixedPriceOrder memory order, address nft_seller) public view {
        address nft_owner = IERC721(order.tokens.nft).ownerOf(order.tokens.nft_id); // May Revert!!!
        require(nft_owner == nft_seller, "The NFT seller is not the NFT owner");
        try IERC721(order.tokens.nft).supportsInterface(type(IERC2981).interfaceId) returns (bool support) {
            if (support) {
                checkRoyaltyInfo(order);
            }
        } catch {

        }
    }

    function checkRoyaltyInfo(FixedPriceOrder memory order) private view {
        uint256 royalty_amount = order.tokens.ft_amount * order.royalty_rate / feeDenominator;
        (address receiver, uint256 royaltyAmount) = IERC2981(order.tokens.nft).royaltyInfo(order.tokens.nft_id, order.tokens.ft_amount);
        if (royaltyAmount != 0 || receiver != address(0)) {
            require(order.royalty_recipient == receiver && royalty_amount >= royaltyAmount, "Royalty information doesn't match");
        }
    }

    function cancelOrder(bytes32 order_digest) external {
        require(!finalizedOrder[order_digest], "Order is finalized");
        canceledOrder[msg.sender][order_digest] = true;

        emit OrderCancelled(msg.sender, order_digest);
    }

    function cancelAllOrders() external {
        ++userNonce[msg.sender];
        uint256 nonce = userNonce[msg.sender];

        emit AllOrdersCancelled(msg.sender, nonce);
    }

    function orderState(FixedPriceOrder memory order, address taker) external view returns(OrderQuery memory) {
        (bytes32 tokens_digest, bytes memory tokens_bytes) = _HashTokensForExchange(order.tokens);
        bytes memory order_bytes = EIP712Encode(order, tokens_digest);
        bytes32 order_digest = _hashTypedDataV4(keccak256(order_bytes));

        uint8 order_state = 0;
        if (finalizedOrder[order_digest]) {
            order_state = 1;
        } else if (order.maker_nonce != userNonce[order.maker]) {
            order_state = 2;
        } else if (canceledOrder[order.maker][order_digest]) {
            order_state = 3;
        } else if (canceledOrder[taker][order_digest]) {
            order_state = 4;
        }

        return OrderQuery(order_state, order_digest, tokens_digest, order_bytes, tokens_bytes);
    }

    function AppPreCheck(
        address user,
        address ft,
        address nft,
        uint256 nft_id
    ) external view returns (address user_proxy, uint256 ft_balance, uint256 ft_allowance, address nft_owner) {
        // nft_owner = address(0); // default
        // ft_allowance = 0; // default
        require(user != address(0), "User address is 0");
        user_proxy = IRegistry(IManager(manager).registry()).proxies(user);

        if (ft != address(0)) {
            ft_balance = IERC20(ft).balanceOf(user);
            ft_allowance = IERC20(ft).allowance(user, proxy);
        } else {
            ft_balance = user.balance;
        }

        if (nft != address(0)) {
            try IERC721(nft).ownerOf(nft_id) returns (address owner) {
                nft_owner = owner;
            } catch {

            }
        }
    }

    function _hashTypedDataV4(bytes32 structHash) internal view returns (bytes32) {
        return _toTypedDataHash(_domainSeparatorV4(), structHash);
    }

    function _toTypedDataHash(bytes32 domainSeparator, bytes32 structHash) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
    }

    function _domainSeparatorV4() internal view returns (bytes32) {
        return keccak256(abi.encode(HashEIP712Domain, HashEIP712Name, HashEIP712Version, block.chainid, address(this)));
    }

    modifier nonReentrant() {
        // On the first call to nonReentrant, _notEntered will be true
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        // Any calls to nonReentrant after this point will fail
        _status = _ENTERED;

        _;

        // By storing the original value once again, a refund is triggered (see https://eips.ethereum.org/EIPS/eip-2200)
        _status = _NOT_ENTERED;
    }

    function sendValue(address payable recipient, uint256 amount) private {
        require(address(this).balance >= amount, "Insufficient balance");

        (bool success, ) = recipient.call{value: amount}("");
        require(success, "Unable to send value, recipient may have reverted");
    }

    // openzeppelin/contracts/utils/Address.sol
    // openzeppelin/contracts-upgradeable/utils/cryptography/draft-EIP712Upgradeable.sol
    // openzeppelin/contracts/utils/cryptography/draft-EIP712.sol
    // openzeppelin/contracts/security/ReentrancyGuard.sol

}

/***

    PreCheck(taker地址，X币种地址) => Taker的Proxy地址、X币种Approve给Proxy的额度，X币种当前余额
    若 X币种地址 是 本币，addrss(0) , 返回的就是 Taker的Proxy地址、（0），本币当前余额



    function checkOrderAndNFT(
        bool maker_sells_nft,
        address taker,
        FixedPriceOrder memory order,
        Sig memory maker_sig,
        Sig memory taker_sig
    ) external view returns(bytes32, bytes memory) {
        (bytes32 order_digest, bytes memory order_bytes) = checkOrder(taker, order, maker_sig, taker_sig);

        address nft_seller = order.maker;
        address nft_buyer = taker;
        if (!maker_sells_nft) {
            nft_seller = taker;
            nft_buyer = order.maker;
        }

        if (!CoNFT[order.nft_contract] || ILazyMint(order.nft_contract).exists(order.token_id)) {
            address nft_owner = IERC721(order.nft_contract).ownerOf(order.token_id); // May Revert!!!
            require(nft_owner == nft_seller, "The NFT seller is not the NFT owner");
        }

        try IERC721(order.nft_contract).supportsInterface(type(IERC2981).interfaceId) returns (bool support) {
            if (support) {
                checkRoyaltyInfo(order);
            }
        } catch {

        }

        uint256 approved_amount;
        if (order.payment_token == address(0)) {
            approved_amount = nft_buyer.balance;
        } else {
            approved_amount = IERC20(order.payment_token).allowance(nft_buyer, address(this));
        }
        require(approved_amount >= order.fixed_price, "NFT buyer's balance or approved-amount is not enough");

        return (order_digest, order_bytes);
    }


    function orderStateWithDigest(address maker, address taker, uint256 order_nonce, bytes32 order_digest) public view returns(uint8) {
        uint8 order_state = 0;
        if (finalizedOrder[order_digest]) {
            order_state = 1;
        } else if (order_nonce != userNonce[maker]) {
            order_state = 2;
        } else if (canceledOrder[maker][order_digest]) {
            order_state = 3;
        } else if (canceledOrder[taker][order_digest]) {
            order_state = 4;
        }
        return order_state;
    }


    function orderState(FixedPriceOrder memory order) external view returns(OrderQuery memory) {
        bytes memory order_bytes = fixedPriceOrderEIP712Encode(order);
        bytes32 order_digest = _hashTypedDataV4(keccak256(order_bytes));
        uint8 order_state = orderStateWithDigest(order.maker, order.taker, order.maker_nonce, order_digest);
        return OrderQuery(order_state, order_digest, order_bytes);
    }

    function recoverSingers(
        FixedPriceOrder memory maker_order,
        Sig memory maker_sig,
        Sig memory taker_sig,
        address taker_recipient
    ) public view returns (address maker, address taker, bytes32 maker_order_digest, bytes32 taker_order_digest) {

        FixedPriceOrder memory taker_order = maker_order;
        taker_order.asset_recipient = taker_recipient;

        bytes32 _HashTokens = _HashTokensForExchange(maker_order.tokens);
        bytes memory maker_order_bytes = EIP712Encode(maker_order, _HashTokens);
        bytes memory taker_order_bytes = EIP712Encode(taker_order, _HashTokens);

        maker_order_digest = _hashTypedDataV4(keccak256(maker_order_bytes));
        taker_order_digest = _hashTypedDataV4(keccak256(taker_order_bytes));

        maker = checkSignature(maker_order_digest, maker_sig);
        taker = checkSignature(taker_order_digest, taker_sig);
    }

***/

