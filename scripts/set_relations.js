const {ethers} = require("hardhat");

async function main() {
    await interactWithContract();
    console.log("Done!");
}

main()
    .then(() => {
        process.exit(0);
    })
    .catch((err) => {
        console.error(err);
        process.exit(1);
    })

async function interactWithContract() {

    const registry_addr = "0x40F8C60CaB24505779a15381f7a715a059b8FB5F";
    const dex_addr = "0x9EfbF883B32A4a2f8bddB5fA6b8033990314f01E";
    const nft_addr = "0x1DC7Cb6769d2eF881c19E6046D7C9D0d51cF2574";
    const usdc_addr = "0xC8e1F27BC788290aDc44a67D0F54b1eBc2533428";

    const NFT = await ethers.getContractFactory('NFT');
    const nft = await NFT.attach(nft_addr);

    const DEX = await ethers.getContractFactory('DEX');
    const dex = await DEX.attach(dex_addr);

    let ret;

    ret = await nft.setRegistry(registry_addr);
    console.log("ret -> ", ret);

    ret = await nft.setCoDEX(dex_addr, true);
    console.log("ret -> ", ret);

    ret = await dex.setRegistry(registry_addr);
    console.log("ret -> ", ret);

    ret = await dex.setCoNFT(nft_addr, true);
    console.log("ret -> ", ret);

    ret = await dex.setPaymentAllowed(usdc_addr, 1000000);
    console.log("ret -> ", ret);

}

/*

Deploying Manager...
Manager deployed to: 0x547885c092b1E7AD5D1A458925271E6ca58419FD

Deploying DEX...
DEX deployed to: 0x9EfbF883B32A4a2f8bddB5fA6b8033990314f01E

Deploying Registry...
Registry deployed to: 0x40F8C60CaB24505779a15381f7a715a059b8FB5F

Deploying NFT...
NFT deployed to: 0x1DC7Cb6769d2eF881c19E6046D7C9D0d51cF2574

Deploy Sequence
0, Manager.sol & manger.setOperators
1, TokenID.sol
2, DEX.sol
3, Registry.sol
4, NFT.sol

5, nft.setRegsitry
6, nft.setCoDEX
7, dex.setRegsitry
8, dex.setCoNFT & dex.setPaymentAllowed

*/



