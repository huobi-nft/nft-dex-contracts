
const { ethers, upgrades } = require('hardhat');

async function main () {
    const registry_args = [
        "0x547885c092b1E7AD5D1A458925271E6ca58419FD",
        "0x9EfbF883B32A4a2f8bddB5fA6b8033990314f01E",
        300,
    ];
    const Registry = await ethers.getContractFactory('Registry');
    console.log('Deploying Registry...');
    const registry = await upgrades.deployProxy(Registry, registry_args, { initializer: 'initialize' });
    await registry.deployed();
    console.log('Registry deployed to:', registry.address);
}

main();

