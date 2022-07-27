// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract DelegateProxy {
    address public owner;
    address public registry;
    bool public revoked;

    function setOwner(address _newOwner) external {
        owner = _newOwner;
    }
}
