// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./ICommon.sol";

contract Manager is IManager {

    mapping(address => bool) public operators;
    address public DAO;
    address public registry;
    address public metaTx;
    mapping(address => bool) public CoNFT;
    mapping(address => bool) public CoDEX;
    mapping(address => bool) public allowedNft;
    bool public allNftAllowed;
    mapping(address => uint256) public allowedPayment;

    constructor (address dao) {
        DAO = dao;
        operators[dao] = true;
    }

    modifier onlyDAO {
        require(msg.sender == DAO, "Caller is not the DAO");
        _;
    }

    modifier onlyOperator() {
        require(operators[msg.sender], "Caller is not an operator");
        _;
    }

    function setDAO(address dao, bool flag) external onlyDAO {
        require(DAO != dao, "New DAO is same as Current DAO");
        operators[DAO] = false;
        DAO = dao;
        operators[dao] = flag;
    }

    function setOperators(address[] memory addrs, bool flag) external onlyDAO {
        for (uint256 i = 0; i < addrs.length; i++) {
            operators[addrs[i]] = flag;
        }
    }

    function setRegistry(address addr) external onlyOperator {
        registry = addr;
    }

    function setMetaTx(address addr) external onlyOperator {
        metaTx = addr;
    }

    function setCoDEX(address addr, bool flag) external onlyOperator {
        CoDEX[addr] = flag;
    }

    function setCoNFT(address addr, bool flag) external onlyOperator {
        CoNFT[addr] = flag;
        allowedNft[addr] = flag;
    }

    function setAllNftAllowed(bool flag) external onlyOperator {
        allNftAllowed = flag;
    }

    function setNftAllowed(address addr, bool flag) external onlyOperator {
        allowedNft[addr] = flag;
    }

    function setPaymentAllowed(address addr, uint256 min_price) external onlyOperator {
        allowedPayment[addr] = min_price; // min_price == 0 to delete allowedPayment[_contract];
    }

}


