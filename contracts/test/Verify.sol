// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;
import "hardhat/console.sol";

contract Verify {
    function verify(address nft, address userAddr, bytes memory data)public payable returns(bool){
        (bool success, ) = nft.call{value : msg.value}(abi.encodePacked(data, userAddr));
        return success;
    }
}