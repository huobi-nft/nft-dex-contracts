// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./ICommon.sol";

contract MetaTx {
    event MetaTransactionExecuted(address userAddress, address payable relayerAddress, bytes functionSignature);

    mapping(address => uint256) public nonces;
    address public manager;
    bool initialized;

    string public name;
    string public version;
    bytes32 public HashEIP712Version;
    bytes32 public HashEIP712Name;
    address public dexDAO;
    bytes32 public constant HashEIP712Domain = keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
    bytes32 public constant META_TRANSACTION_TYPEHASH = keccak256("MetaTransaction(uint256 nonce,address from,address to,bytes functionSignature)");

    modifier onlyOperator() {
        require(IManager(manager).operators(msg.sender), "Caller is not an operator");
        _;
    }

    modifier onlyDAO() {
        require(IManager(manager).DAO() == msg.sender, "Caller is not the DAO");
        _;
    }

    function initialize(address _manager, string memory _name, string memory _version) external {
        require(!initialized, "Contract was initialized");
        initialized = true;
        manager = _manager;
        name = _name;
        version = _version;
        HashEIP712Name = keccak256(bytes(name));
        HashEIP712Version = keccak256(bytes(version));

    }

    function setNameVersion(string memory _name, string memory _version) external onlyOperator {
        name = _name;
        version = _version;
        HashEIP712Name = keccak256(bytes(name));
        HashEIP712Version = keccak256(bytes(version));
    }

    struct MetaTransaction {
        uint256 nonce;
        address from;
        address to;
        bytes functionSignature;
    }

    function executeMetaTransaction(
        address userAddress,
        address to,
        bytes memory functionSignature,
        uint8 sigV,
        bytes32 sigR,
        bytes32 sigS
    ) external payable onlyOperator returns (bytes memory) {
        MetaTransaction memory metaTx = MetaTransaction({
            nonce : nonces[userAddress],
            from : userAddress,
            to : to,
            functionSignature : functionSignature
        });

        require(verify(userAddress, metaTx, sigV, sigR, sigS), "Signer and signature do not match");

        // increase nonce for user (to avoid re-use)
        nonces[userAddress] += 1;

        emit MetaTransactionExecuted(userAddress, payable(msg.sender), functionSignature);

        // functionSignature example: transferFrom(from, to, tokenid);
        // Append userAddress and relayer address at the end to extract it from calling context
        (bool success, bytes memory data) = to.call{value : msg.value}(abi.encodePacked(functionSignature, userAddress));
        require(success, "Function call not successful");

        return data;
    }

    function hashMetaTransaction(MetaTransaction memory metaTx) internal pure returns (bytes32) {
        return keccak256(abi.encode(META_TRANSACTION_TYPEHASH, metaTx.nonce, metaTx.from, metaTx.to, keccak256(metaTx.functionSignature)));
    }

    function verify(address signer, MetaTransaction memory metaTx, uint8 sigV, bytes32 sigR, bytes32 sigS) internal view returns (bool) {
        require(signer != address(0), "NativeMetaTransaction: INVALID_SIGNER");
        return signer == ecrecover(_hashTypedDataV4(hashMetaTransaction(metaTx)), sigV, sigR, sigS);
    }

    /**
    * Accept message hash and returns hash message in EIP712 compatible form
    * So that it can be used to recover signer from signature signed using EIP712 formatted data
    * https://eips.ethereum.org/EIPS/eip-712
    * "\\x19" makes the encoding deterministic
    * "\\x01" is the version byte to make it compatible to EIP-191
    */
    function _hashTypedDataV4(bytes32 structHash) internal view returns (bytes32) {
        return keccak256(abi.encodePacked("\x19\x01", _domainSeparatorV4(), structHash));
    }

    function _domainSeparatorV4() internal view returns (bytes32) {
        return keccak256(abi.encode(HashEIP712Domain, HashEIP712Name, HashEIP712Version, block.chainid, address(this)));
    }


}

