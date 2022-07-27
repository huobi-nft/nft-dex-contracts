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

    const Manager = await ethers.getContractFactory('Manager');
    const manager = await Manager.attach("0x0685B2e6D3eA835fce8Fd4F3638BdEAAe0FFbAaa");
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
    let ret = await manager.setOperators(operators, true);
    console.log("ret -> ", ret);

}

