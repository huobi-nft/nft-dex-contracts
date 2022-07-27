// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

contract MetaTxCallee {
    address public lastCaller;
    uint256 public received;

    function recordCaller() external payable {
        lastCaller = _msgSender();
        received += msg.value;
    }

    function _msgSender() internal pure returns (address payable sender) {
        bytes memory array = msg.data;
        uint256 index = msg.data.length;
        assembly {
            // Load the 32 bytes word from memory with the address on the lower 20 bytes, and mask those.
            sender := and(
                mload(add(array, index)),
                0xffffffffffffffffffffffffffffffffffffffff
            )
        }

        return sender;
    }
}
