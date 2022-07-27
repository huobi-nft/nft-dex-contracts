
const { ethers, upgrades } = require('hardhat');

async function main () {
    const dex_args = [
        "Simple NFT DEX",
        "Version 0.1.0",
        "0x62e5ff80d462baa336bc7ee6a4fdd4516acf94a1",
        "0x547885c092b1E7AD5D1A458925271E6ca58419FD",
    ];
    const DEX = await ethers.getContractFactory('DEX');
    console.log('Deploying DEX...');
    const dex = await upgrades.deployProxy(DEX, dex_args, { initializer: 'initialize' });
    await dex.deployed();
    console.log('DEX deployed to:', dex.address);
}

main();

