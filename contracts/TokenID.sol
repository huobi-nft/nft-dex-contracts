// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./ICommon.sol";

contract TokenID {

    address public manager;
    mapping(address => bool) public operators;
    mapping(uint256 => uint256) public tokenIdList;
    uint256 public counter = 1; // TokenID 0 is not existed

    address public migration = 0xD21E29e051C9a993215FCa7d70fbD03012AFafd4;

    constructor (address _manger) {
        manager = _manger;
    }

    modifier onlyOperator() {
        require(IManager(manager).operators(msg.sender), "Caller is not an operator");
        _;
    }

    modifier onlyDAO() {
        require(IManager(manager).DAO() == msg.sender, "Caller is not the DAO");
        _;
    }

    function setMigration(address migration_contract) external onlyOperator {
        migration = migration_contract;
    }

    function modifyIdList(uint256 start, uint256[] memory list) external onlyOperator {
        for (uint256 i = 0; i < list.length; i++) {
            tokenIdList[start+i] = list[i];
        }
    }

    function putIdList(uint256[] memory list) external onlyOperator {
        for (uint256 i = 0; i < list.length; i++) {
            tokenIdList[counter] = list[i];
            counter++;
        }
    }

    function migrate(bool burn_old, uint256 begin_id, uint256 count, uint96 royaltyRate, address nft_contract) external onlyOperator {
        for (uint256 i = 0; i < count; i++) {
            uint256 old_id = begin_id + i;
            uint256 tokenId = tokenIdList[old_id];
            address recipient = IBurnable(migration).ownerOf(old_id);

            if (burn_old) {
                IBurnable(migration).burn(old_id);
            }

            ISafeMint(nft_contract).safeMint(recipient, tokenId, royaltyRate, "");
        }
    }

}


