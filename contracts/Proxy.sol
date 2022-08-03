// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./ICommon.sol";

contract Proxy is IProxy {

    address public owner;
    address public registry;
    bool public revoked;

    event RevokeSet(bool revoke);
    event ReceivedEther(address indexed sender, uint amount);
    event ReceivedTokens(address indexed from, uint256 value, address indexed token, bytes extraData);

    constructor (address _owner, address _registry) {
        owner = _owner;
        registry = _registry;
    }

    // Receive Ether and generate a log event
    // fallback () payable external {
    //     emit ReceivedEther(msg.sender, msg.value);
    // }

    // Receive Ether and generate a log event
    receive() external payable {
        emit ReceivedEther(msg.sender, msg.value);
    }

    function receiveApproval(address from, uint256 value, address token, bytes memory extraData) public {
        require(IManager(IRegistry(registry).manager()).allowedReceive(token), "This ERC20 token is not supported");
        require(IERC20(token).transferFrom(from, address(this), value), "ERC20 token transfer failed");
        emit ReceivedTokens(from, value, token, extraData);
    }

    function setRevoke(bool revoke) public {
        require(msg.sender == owner, "Proxy can only be revoked by its owner");
        revoked = revoke;
        emit RevokeSet(revoke);
    }

    function transferOwnership(address new_owner) public {
        require(msg.sender == registry, "Ownership can only be changed through registry");
        require(new_owner != address(0), "New owner is zero address");
        owner = new_owner;
    }

    function proxy(address target, bool delegate, uint256 native_value, bytes memory data) public returns (bool result) {
        require(
            msg.sender == owner || (!revoked && IRegistry(registry).contracts(msg.sender)),
            "Only owner or registry-authorized contract can call proxy function"
        );
        bytes memory ret;
        if (delegate && IRegistry(registry).destinations(target)) {
            // require(native_value == 0, "Native value is not 0");
            (result, ret) = target.delegatecall(data);
        } else {
            (result, ret) = target.call{value: native_value}(data);
            // address(receiver).call{value: native_value}(""); // withdraw native coin (ETH, Matic, HT...)
        }
        return result;
    }

    function proxyAssert(address target, bool delegate, uint256 some_value, bytes memory data) public {
        require(proxy(target, delegate, some_value, data), "Proxy assertion failed");
    }

}

