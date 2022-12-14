const {ethers} = require("hardhat");
const ethUtil = require('ethereumjs-util');
const {createTypedData} = require("./eip712/eip712TypedData");
const {signTypedData} = require("./eip712/signTypedData");
const {generateTokenId, getRandom} = require("./utils.js");

const makerPrivkey = ethUtil.keccakFromString('buffalo_maker', 256);
const buffaloMaker = ethUtil.privateToAddress(makerPrivkey);
const takerPrivkey = ethUtil.keccakFromString('buffalo_taker', 256);
const buffaloTaker = ethUtil.privateToAddress(takerPrivkey);

console.log('buffaloMaker: ' + '0x'+ buffaloMaker.toString('hex'));
console.log('buffaloTaker: ' + '0x'+ buffaloTaker.toString('hex'));

const tokenId = generateTokenId(buffaloMaker, getRandom(10), getRandom(100));
console.log('\n=====TokenID=====\n', tokenId.toString());

const chainId = 256; // HECO Testnet
const rpcUrl = "https://http-testnet.hecochain.com"; // HECO Testnet


const dexAddr = "0xc66Ad7Bb8CD46576A652991FBcBBE3C873470615";
const nftAddr = "0xEf4835053B64FAE6e51753CAAe7f35DA2FB935Fd";
const ftAddr = "0xC8e1F27BC788290aDc44a67D0F54b1eBc2533428";

const nft_id = tokenId.toString();
// const nft_id = "66737481852015758386156659817689381966022124042995356881529993292189641211918";

const start = Math.floor(new Date() / 1000);
const expire = start + 3*24*60*60;

const makerOrder = {
    maker: "0x" + buffaloMaker.toString('hex'),
    taker: "0x" + buffaloTaker.toString('hex'),
    asset_recipient: '0x'+ buffaloMaker.toString('hex'),
    royalty_recipient: '0x'+ buffaloMaker.toString('hex'),
    royalty_rate: 50000,
    start: start,
    expire: expire,
    maker_nonce: 0,
    taker_get_nft: true,
    allow_cex: true,
    tokens: {
        nft: nftAddr,
        ft: ftAddr,
        nft_id: nft_id,
        nft_amount: 0,
        ft_amount: 1000000
    },
};

const takerOrder = {
    maker: "0x" + buffaloMaker.toString('hex'),
    taker: "0x" + buffaloTaker.toString('hex'),
    asset_recipient: '0x'+ buffaloTaker.toString('hex'),
    royalty_recipient: '0x'+ buffaloMaker.toString('hex'),
    royalty_rate: 50000,
    start: start,
    expire: expire,
    maker_nonce: 0,
    taker_get_nft: true,
    allow_cex: true,
    tokens: {
        nft: nftAddr,
        ft: ftAddr,
        nft_id: nft_id,
        nft_amount: 0,
        ft_amount: 1000000
    },
};

const maker_order_data = createTypedData(makerOrder, dexAddr, chainId);
const taker_order_data = createTypedData(takerOrder, dexAddr, chainId);
const [makerSig, takerSig] = signTypedData(makerPrivkey, takerPrivkey, maker_order_data, taker_order_data);

console.log('\n====MakerSignature====\n%s:', makerSig);
console.log('\n====TakerSignature====\n%s:', takerSig);

const privateKeys = [
    makerPrivkey.toString('hex'),
    takerPrivkey.toString("hex"),
]

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
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKeys[1], provider);
    const taker = signer.address;
    const takerBalance = await provider.getBalance(taker);

    console.log("\nTaker balance:%sHT", ethers.utils.formatEther(takerBalance));

    const SimpleDex = await ethers.getContractFactory('DEX');
    const dex = SimpleDex.attach(dexAddr);


    // TODO query taker's proxy and approved amount of USDC


    const ret = await dex.connect(signer).cexFixedPrice(
        makerOrder,
        makerSig,
        taker,
        {value: ethers.utils.parseEther("0.000000000000").toString()}
    );

    // const ret = await dex.connect(signer).cexFixedPrice(
    //     makerOrder,
    //     makerSig,
    //     taker,
    //     {value: ethers.utils.parseEther("0.000000000000").toString()}
    // );

    console.log("Call the dexFixedPrice function return -> ", ret);
    // const instance = new web3.eth.Contract(dexAbi, dexAddr);
    // const ret = await dex.dexFixedPrice(
    //     makerOrder, makerSig, takerSig, taker).send(
    //     {from: taker, value: web3.utils.toWei('0.1', "ether") }
    // );
    // const dex = new ethers.Contract(dexAddr, abi, signer);
}

