
const { ethers, upgrades } = require('hardhat');

async function main () {
    const nft_args = [
        "0x547885c092b1E7AD5D1A458925271E6ca58419FD",
        "Simple NFT",
        "SNFT",
        "https://www.nft.com/metadata/",
    ];
    const NFT = await ethers.getContractFactory('NFT');
    console.log('Deploying NFT...');
    const nft = await upgrades.deployProxy(NFT, nft_args, { initializer: 'initialize' });
    await nft.deployed();
    console.log('NFT deployed to:', nft.address);
}

main();


