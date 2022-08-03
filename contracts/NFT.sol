// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

// import "@openzeppelin/contracts/utils/Context.sol";
// import "@openzeppelin/contracts/utils/Address.sol";
// import "@openzeppelin/contracts/utils/Strings.sol";

import "./ICommon.sol";

contract NFT is IERC721, IERC721Metadata, IERC2981, ILazyMint {
    // using Address for address;
    // using Strings for uint256;

    string public name;
    string public symbol;
    uint256 public totalSupply;
    string public baseURI;

    struct RoyaltyInfo {
        address receiver;
        uint96 royaltyRate;
    }
    mapping(uint256 => RoyaltyInfo) private _royaltyInfo; // TokenID => RoyaltyInfo
    event RoyaltyInfoSet(uint256 indexed tokenId, address sender, address receiver, uint96 royaltyRate);

    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => address) private _tokenApprovals;
    mapping(address => mapping(address => bool)) private _operatorApprovals;

    uint256 public feeDenominator = 1000000000;

    address public contractURI;
    address public manager;
    bool public initialized;

    function isContract(address account) internal view returns (bool) {
        // This method relies on extcodesize/address.code.length, which returns 0
        // for contracts in construction, since the code is only stored at the end
        // of the constructor execution.

        return account.code.length > 0;
    }

    function toString(uint256 value) internal pure returns (string memory) {
        // Inspired by OraclizeAPI's implementation - MIT licence
        // https://github.com/oraclize/ethereum-api/blob/b42146b063c7d6ee1358846c198246239e9360e8/oraclizeAPI_0.4.25.sol

        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    modifier onlyCoDEX() {
        require(IManager(manager).CoDEX(msg.sender), "Caller is not NFT Dex Contract");
        _;
    }

    modifier onlyOperator() {
        require(IManager(manager).operators(msg.sender), "Caller is not an operator");
        _;
    }

    modifier onlyDAO() {
        require(IManager(manager).DAO() == msg.sender, "Caller is not the DAO");
        _;
    }

    function _msgSender() internal view returns (address payable sender) {
        if (msg.sender == IManager(manager).metaTx()) {
            bytes memory array = msg.data;
            uint256 index = msg.data.length;
            assembly {
            // Load the 32 bytes word from memory with the address on the lower 20 bytes, and mask those.
                sender := and(
                mload(add(array, index)),
                0xffffffffffffffffffffffffffffffffffffffff
                )
            }
        } else {
            sender = payable(msg.sender);
        }
        return sender;
    }

    function initialize(address _manager, string memory _name, string memory _symbol, string memory _uri) external {
        require(!initialized, "Contract was initialized");
        initialized = true;
        name = _name;
        symbol = _symbol;
        baseURI = _uri;
        manager = _manager;
    }

    function setNameAndSymbol(string memory nft_name, string memory nft_symbol) external onlyDAO {
        name = nft_name;
        symbol = nft_symbol;
    }

    function setContractURI(address contract_uri) external onlyOperator {
        contractURI = contract_uri;
    }

    function setBaseURI(string memory base_uri) external onlyOperator {
        baseURI = base_uri;
    }

    function royaltyInfo(uint256 tokenId, uint256 salePrice) external view returns (address, uint256) {
        uint256 royaltyAmount = (salePrice * _royaltyInfo[tokenId].royaltyRate) / feeDenominator;
        address receiver = _royaltyInfo[tokenId].receiver;
        return (receiver, royaltyAmount);
    }

    function _setRoyaltyInfo(uint256 tokenId, address receiver, uint96 royaltyRate) private {
        _royaltyInfo[tokenId] = RoyaltyInfo(receiver, royaltyRate);
        emit RoyaltyInfoSet(tokenId, _msgSender(), receiver, royaltyRate);
    }

    function setRoyaltyInfo(uint256 tokenId, address receiver, uint96 royaltyRate) public {
        IManager m = IManager(manager);
        require(m.operators(msg.sender) || m.CoDEX(msg.sender), "Msg.sender should be Operator or CoDEX");
        _setRoyaltyInfo(tokenId, receiver, royaltyRate);
    }

    function burn(uint256 tokenId) external {
        require(_isApprovedOrOwner(_msgSender(), tokenId), "ERC721Burnable: caller is not owner nor approved");
        _burn(tokenId);
    }

    function _safeMint(address to, uint256 tokenId, uint96 royaltyRate, bytes memory _data) private {
        require(!exists(tokenId), "ERC721: token already minted");
        address creator = address(uint160(tokenId >> 96));
        require(creator != address(0) && to != address(0), "ERC721: mint to the zero address");

        _balances[to] += 1;
        _owners[tokenId] = to;
        totalSupply += 1;

        emit Transfer(address(0), creator, tokenId);

        if (creator != to) {
            emit Transfer(creator, to, tokenId);
        }

        if (royaltyRate != 0) {
            _setRoyaltyInfo(tokenId, creator, royaltyRate);
        }

        require(_checkOnERC721Received(address(0), to, tokenId, _data), "ERC721: transfer to non ERC721Receiver implementer");
    }

    function safeMint(address to, uint256 tokenId, uint96 royaltyRate, bytes memory _data) external onlyOperator {
        _safeMint(to, tokenId, royaltyRate, _data);
    }

    function lazyMint(address to, uint256 tokenId, address royaltyRecipient, uint96 royaltyRate) external onlyCoDEX {
        _safeMint(to, tokenId, 0, "");
        if (royaltyRate != 0 && royaltyRecipient != address(0)) {
            _setRoyaltyInfo(tokenId, royaltyRecipient, royaltyRate);
        }
    }

    function mintToRecipients(address[] memory recipients, uint256[] memory tokenIds, uint96 royaltyRate) external onlyOperator {
        require(recipients.length == tokenIds.length, "Length mismatch");
        for (uint i = 0; i < recipients.length; i++) {
            _safeMint(recipients[i], tokenIds[i], royaltyRate, "");
        }
    }

    function mintToCreators(uint256[] memory tokenIds, uint96 royaltyRate) external onlyOperator {
        for (uint i = 0; i < tokenIds.length; i++) {
            address creator = address(uint160(tokenIds[i] >> 96));
            require(creator != address(0), "ERC721: mint to the zero address");
            require(!exists(tokenIds[i]), "ERC721: token already minted");

            _balances[creator] += 1;
            _owners[tokenIds[i]] = creator;
            totalSupply += 1;

            emit Transfer(address(0), creator, tokenIds[i]);

            _setRoyaltyInfo(tokenIds[i], creator, royaltyRate);
        }
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return
        interfaceId == type(IERC165).interfaceId ||
        interfaceId == type(IERC721).interfaceId ||
        interfaceId == type(IERC721Metadata).interfaceId ||
        interfaceId == type(IERC2981).interfaceId ||
        interfaceId == type(ILazyMint).interfaceId;
    }

    function balanceOf(address owner) external view returns (uint256) {
        require(owner != address(0), "ERC721: balance query for the zero address");
        return _balances[owner];
    }

    function ownerOf(uint256 tokenId) public view returns (address) {
        address owner = _owners[tokenId];
        require(owner != address(0), "ERC721: owner query for nonexistent token");
        return owner;
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        require(exists(tokenId), "ERC721Metadata: URI query for nonexistent token");

        if (contractURI != address(0)) {
            return IERC721Metadata(contractURI).tokenURI(tokenId);
        }

        return bytes(baseURI).length > 0 ? string(abi.encodePacked(baseURI, toString(tokenId))) : "";
    }

    function approve(address to, uint256 tokenId) external {
        address owner = ownerOf(tokenId);
        require(to != owner, "ERC721: approval to current owner");

        require(
            _msgSender() == owner || isApprovedForAll(owner, _msgSender()),
            "ERC721: approve caller is not owner nor approved for all"
        );

        _approve(to, tokenId);
    }

    function getApproved(uint256 tokenId) public view returns (address) {
        require(exists(tokenId), "ERC721: approved query for nonexistent token");

        return _tokenApprovals[tokenId];
    }

    function setApprovalForAll(address operator, bool approved) external {
        _setApprovalForAll(_msgSender(), operator, approved);
    }

    function isApprovedForAll(address owner, address operator) public view returns (bool approved) {
        if (operator == IRegistry(IManager(manager).registry()).proxies(owner)) {
            approved = true;
        } else {
            approved = _operatorApprovals[owner][operator];
        }
        return approved;
    }

    function transferFrom(address from, address to, uint256 tokenId) external {
        require(_isApprovedOrOwner(_msgSender(), tokenId), "ERC721: transfer caller is not owner nor approved");

        _transfer(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) external {
        safeTransferFrom(from, to, tokenId, "");
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory _data) public {
        require(_isApprovedOrOwner(_msgSender(), tokenId), "ERC721: transfer caller is not owner nor approved");
        _safeTransfer(from, to, tokenId, _data);
    }

    function _safeTransfer(address from, address to, uint256 tokenId, bytes memory _data) internal {
        _transfer(from, to, tokenId);
        require(_checkOnERC721Received(from, to, tokenId, _data), "ERC721: transfer to non ERC721Receiver implementer");
    }

    function exists(uint256 tokenId) public view returns (bool) {
        return _owners[tokenId] != address(0);
    }

    function _isApprovedOrOwner(address spender, uint256 tokenId) internal view returns (bool) {
        require(exists(tokenId), "ERC721: operator query for nonexistent token");
        address owner = ownerOf(tokenId);
        return (spender == owner || getApproved(tokenId) == spender || isApprovedForAll(owner, spender));
    }

    function _burn(uint256 tokenId) internal {
        address owner = ownerOf(tokenId);

        // Clear approvals
        _approve(address(0), tokenId);
        delete _royaltyInfo[tokenId];

        _balances[owner] -= 1;
        delete _owners[tokenId];
        totalSupply -= 1;

        emit Transfer(owner, address(0), tokenId);
    }

    function _transfer(address from, address to, uint256 tokenId) internal {
        require(ownerOf(tokenId) == from, "ERC721: transfer from incorrect owner");
        require(to != address(0), "ERC721: transfer to the zero address");

        // Clear approvals from the previous owner
        _approve(address(0), tokenId);

        _balances[from] -= 1;
        _balances[to] += 1;
        _owners[tokenId] = to;

        emit Transfer(from, to, tokenId);
    }

    function _approve(address to, uint256 tokenId) internal {
        _tokenApprovals[tokenId] = to;
        emit Approval(ownerOf(tokenId), to, tokenId);
    }

    function _setApprovalForAll(address owner, address operator, bool approved) internal {
        require(owner != operator, "ERC721: approve to caller");
        _operatorApprovals[owner][operator] = approved;
        emit ApprovalForAll(owner, operator, approved);
    }

    function _checkOnERC721Received(
        address from,
        address to,
        uint256 tokenId,
        bytes memory _data
    ) private returns (bool) {
        if (isContract(to)) {
            try IERC721Receiver(to).onERC721Received(_msgSender(), from, tokenId, _data) returns (bytes4 retval) {
                return retval == IERC721Receiver.onERC721Received.selector;
            } catch (bytes memory reason) {
                if (reason.length == 0) {
                    revert("ERC721: transfer to non ERC721Receiver implementer");
                } else {
                    assembly {
                        revert(add(32, reason), mload(reason))
                    }
                }
            }
        } else {
            return true;
        }
    }

}


