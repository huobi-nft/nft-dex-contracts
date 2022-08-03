// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol";


interface IManager {
    function operators(address addr) external view returns (bool);
    function DAO() external view returns (address);
    function registry() external view returns (address);
    function metaTx() external view returns (address);
    function CoDEX(address addr) external view returns (bool);
    function CoNFT(address addr) external view returns (bool);
    function allowedPayment(address addr) external view returns (uint256);
    function allowedReceive(address addr) external view returns (bool);
    function allowedNft(address addr) external view returns (bool);
    function allNftAllowed() external view returns (bool);
}

interface ILazyMint {
    function exists(uint256 tokenId) external view returns (bool);
    function lazyMint(address to, uint256 tokenId, address royaltyRecipient, uint96 royaltyRate) external;
    function setRoyaltyInfo(uint256 tokenId, address receiver, uint96 royaltyRate) external;
}

interface IRegistry {
    function proxies(address addr) external view returns (address);
    function contracts(address addr) external view returns (bool);
    function destinations(address addr) external view returns (bool);
    function manager() external view returns (address);
}

interface IProxy {
    function proxy(address destination, bool delegate, uint256 native_value, bytes memory data) external returns (bool result);
    function proxyAssert(address dest, bool delegate, uint256 some_value, bytes memory data) external;
    function transferOwnership(address new_owner) external;
}

interface ITokenID {
    function tokenIdList(uint256 tokenId) external view returns (uint256);
}

interface ISafeMint {
    function safeMint(address to, uint256 tokenId, uint96 royaltyRate, bytes memory _data) external;
}

interface IBurnable {
    function burn(uint256 tokenId) external;
    function ownerOf(uint256 tokenId) external view returns (address);
}

