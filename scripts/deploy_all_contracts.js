
const {ethers} = require("hardhat");

async function main() {

    const DAO_address = "0x62e5ff80d462baa336bc7ee6a4fdd4516acf94a1";
    const FEE_recipient = DAO_address;

    let ret;

    const manager_args = [
        DAO_address,
    ];
    const Manager = await ethers.getContractFactory('Manager');
    console.log('Deploying Manager...');
    const manager = await Manager.deploy(...manager_args);
    await manager.deployed();
    console.log('Manager deployed to:', manager.address);
    const manager_address = manager.address;

    console.log('Setting Operators...');
    const operators = [
        "0x23c77bcdf23c793a7e9b4d7c8132171b18571a47",
        "0xc0a5d030bae800ad29ba027ecbc0e851db292835",
        "0xfdbfd1282ad8fdf10213b249ed1ac41a4497b661",
        "0x7b991ba24b5b2719718ff48cd6c088fc1fb252e3",
        "0xc943b27f8f4fbbc17d037b7062fa237021488f1d",
        "0x30171a99419b1dcdbea35cc17fcede51961cdfd7",
        "0x171719c05e4c160857e23cfdba9cdd454f71b1b8",
        "0xce20053a482a6b684728699de4803e29ead59e22",
        "0x6dffc5c71288c29a011daf42d693340b77b0f022",
        "0x29c4819c37319df6c7857d2715c14de9fe8df61d",
        "0x9258260061275f193c3109c2afe1678489d4ae71",
        "0x34c30abe230d6e57abd3d5c0ae76ed2945df9f08",
        "0x02def97345e9e25f0a44dfbecd9c037b64080591",
        "0x589ac254d028cbc921bd0475400318ed21ebac6e",
        "0x657f0c787bb7a21852e8d931a42330f67ca6a580",
        "0x303bf837a6ebbe609e6cd4dc02166d0e2b1fbe3e",
        "0x0b05451be94788b8cdc3e61372cb9dc4df37e3b8",
        "0xee50527c7d786c27a2ae7f3910716dcc446b7077",
        "0x073fedbd64d2219f2b7e05d82838fe861dfeca57",
        "0xee016c72cab0cff916060299e95db2c4ce32f6f4",
    ];
    await manager.setOperators(operators, true);

    const dex_args = [
        manager_address,
        FEE_recipient,
        "Simple NFT DEX",
        "Version 0.1.0",
    ];
    const Dex = await ethers.getContractFactory('DEX');
    console.log('Deploying Dex...');
    const dex = await Dex.deploy();
    await dex.deployed();
    console.log('Dex deployed to:', dex.address);
    await dex.initialize(...dex_args);
    console.log('Dex initialized.');
    const dex_address = dex.address;

    const registry_args = [
        manager_address,
        dex_address,
        300
    ];
    const Registry = await ethers.getContractFactory('Registry');
    console.log('Deploying Registry...');
    const registry = await Registry.deploy();
    await registry.deployed();
    console.log('Registry deployed to:', registry.address);
    await registry.initialize(...registry_args);
    console.log('Registry initialized.');
    const registry_address = registry.address;

    const nft_args = [
        manager_address,
        "Huobi NFT",
        "HuobiNFT",
        "https://www.nft.com/metadata/",
    ];
    const NFT = await ethers.getContractFactory('NFT');
    console.log('Deploying NFT...');
    const nft = await NFT.deploy();
    await nft.deployed();
    console.log('NFT deployed to:', nft.address);
    await nft.initialize(...nft_args);
    console.log('NFT initialized.');
    const nft_address = nft.address;

    const meta_args = [
        manager_address,
        "Simple NFT MetaTx",
        "Version 0.1.0",
    ];
    const MetaTx = await ethers.getContractFactory('MetaTx');
    console.log('Deploying MetaTx...');
    const meta = await MetaTx.deploy();
    await meta.deployed();
    console.log('MetaTx deployed to:', meta.address);
    await meta.initialize(...meta_args);
    console.log('MetaTx initialized.');
    const meta_address = meta.address;

    ret = await manager.setMetaTx(meta_address);
    // console.log("ret -> ", ret);

    ret = await manager.setRegistry(registry_address);
    // console.log("ret -> ", ret);

    ret = await manager.setCoDEX(dex_address, true);
    // console.log("ret -> ", ret);

    ret = await manager.setCoNFT(nft_address, true);
    // console.log("ret -> ", ret);

    const usdc_address = "0xC8e1F27BC788290aDc44a67D0F54b1eBc2533428";
    ret = await manager.setPaymentAllowed(usdc_address, 1000000);
    // console.log("ret -> ", ret);

    const buffaloMaker = "0x938c137dab3b12ac6622a0109a5af60ad47e3608";
    const buffaloTaker = "0x62e5ff80d462baa336bc7ee6a4fdd4516acf94a1";

    ret = await registry.registerProxyFor([buffaloMaker, buffaloTaker]);
    // console.log("ret -> ", ret);



    /*
        const token_id_args = [
            "0x62e5ff80d462baa336bc7ee6a4fdd4516acf94a1",
        ];
        const TokenID = await ethers.getContractFactory('TokenID');
        console.log('Deploying TokenID...');
        const token_id = await TokenID.deploy(...token_id_args);
        await token_id.deployed();
        console.log('TokenID deployed to:', token_id.address);


        const usdc_args = [
            6,
            "USD Coin",
            "USDC",
        ];
        const USDC = await ethers.getContractFactory('USDC');
        console.log('Deploying USDC...');
        const usdc = await USDC.deploy(...usdc_args);
        await usdc.deployed();
        await usdc.mint("0x62e5ff80d462baa336bc7ee6a4fdd4516acf94a1", 1000000000000);
        console.log('USDC deployed to:', usdc.address);

        console.log('Done!');

    */

}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.log(err);
        process.exit(1);
    });

/*


Deploy Sequence
0, Manager.sol & Manager.setOperators
1, TokenID.sol & init(Manager)
2, DEX.sol & init(Manager)
3, Registry.sol & init(Manager, DEX)
4, NFT.sol & init(Manager)

5, manager.setMetaTx & Manager.setRegsitry
6, Manager.setCoDEX & Manager.setCoNFT & Manager.setPaymentAllowed


*/




