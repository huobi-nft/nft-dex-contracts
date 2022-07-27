const ethers = require("ethers");
const HDWalletProvider = require("@truffle/hdwallet-provider");
const fs = require("fs");
const path = require("path");

function generateTokenId(creatorAddress, collectionId, internalId) {
    let tokenId = ethers.BigNumber.from(creatorAddress);
    const collectionMask = ethers.BigNumber.from(collectionId).and(0xffff_ffff_ffff); // 48bit
    const internalMask = ethers.BigNumber.from(internalId).and(0xffff_ffff_ffff); // 48bit
    tokenId = tokenId.shl(48).add(collectionMask).shl(48).add(internalMask);
    console.log("Random tokenId: %s (%s)", tokenId.toHexString(), tokenId.toString());
    return tokenId;
}

const getRandom = (num) => {
    return Math.floor(Math.random() * num);
}

function getHDWalletProvider(mnemonicPhrase, rpcUrl) {
    return new HDWalletProvider({
        mnemonic: mnemonicPhrase,
        // providerOrUrl: "http://localhost:8545",
        // providerOrUrl: "https://http-testnet.hecochain.com",
        // providerOrUrl: "https://rpc-mumbai.maticvigil.com/",
        providerOrUrl: rpcUrl,
        addressIndex: 0,
        // numberOfAddresses: 1,
        // shareNonce: true,
        // pollingInterval: 5000,
        // derivationPath: "m/44'/137'/0'/0/",
        derivationPath: "m/44'/60'/0'/0/"
    });
}

const dex = JSON.parse(
    fs.readFileSync(
        path.join(
            __dirname,
            '../artifacts/contracts/Dex.sol',
            'Dex.json'
        ),
        'UTF-8'
    )
);
const dexAbi = dex.abi;
const dexBytecode = dex.bytecode;

const nft = JSON.parse(
    fs.readFileSync(
        path.join(
            __dirname,
            '../artifacts/contracts/NFT.sol',
            'NFT.json'
        ),
        'UTF-8'
    )
);
const nftAbi = nft.abi;
const nftBytecode = nft.bytecode;

const usdc = JSON.parse(
    fs.readFileSync(
        path.join(
            __dirname,
            '../artifacts/contracts/USDC.sol',
            'USDC.json'
        ),
        'UTF-8'
    )
);
const usdcAbi = usdc.abi;
const usdcBytecode = usdc.bytecode;

module.exports = {generateTokenId, getRandom, getHDWalletProvider, dexAbi, dexBytecode, nftAbi, nftBytecode, usdcAbi, usdcBytecode};


