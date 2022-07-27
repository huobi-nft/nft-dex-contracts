
const {ethers} = require("hardhat");

async function main() {

    const manager_args = [
        "0x62e5ff80d462baa336bc7ee6a4fdd4516acf94a1",
    ];
    const Manager = await ethers.getContractFactory('Manager');
    console.log('Deploying Manager...');
    const manager = await Manager.deploy(...manager_args);
    await manager.deployed();
    console.log('Manager deployed to:', manager.address);

    console.log('Done!');

}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.log(err);
        process.exit(1);
    });


