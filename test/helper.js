const hre = require("hardhat");
const ethers = hre.ethers;
const { BigNumber } = require("ethers");
const ZERO_ADDRESS = ethers.utils.getAddress(
  "0x0000000000000000000000000000000000000000"
);

async function latest() {
  const block = await ethers.provider.getBlock("latest");
  return BigNumber.from(block.timestamp);
}

async function increaseTime(value) {
  await ethers.provider.send("evm_increaseTime", [value.toNumber()]);
  await advanceBlock();
}

async function advanceBlock() {
  return ethers.provider.send("evm_mine", []);
}

const MetaTxTypes = {
  MetaTransaction: [
    { name: "nonce", type: "uint256" },
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "functionSignature", type: "bytes" },
  ],
};

const OrderTypes = {
  TokensForExchange: [
    { name: "nft", type: "address" },
    { name: "ft", type: "address" },
    { name: "nft_id", type: "uint256" },
    { name: "nft_amount", type: "uint256" },
    { name: "ft_amount", type: "uint256" },
  ],

  FixedPriceOrder: [
    { name: "maker", type: "address" },
    { name: "taker", type: "address" },
    { name: "asset_recipient", type: "address" },
    { name: "royalty_recipient", type: "address" },
    { name: "royalty_rate", type: "uint96" },
    { name: "start", type: "uint64" },
    { name: "expire", type: "uint64" },
    { name: "maker_nonce", type: "uint64" },
    { name: "taker_get_nft", type: "bool" },
    { name: "allow_cex", type: "bool" },
    { name: "tokens", type: "TokensForExchange" },
  ],
};

async function initAccounts() {
  const signers = await ethers.getSigners();
  this.signers = signers;
  this.dao = signers[0];
  this.dex = signers[1];
  this.proxyOwner = signers[2];
}

async function deployManager() {
  const Manager = await ethers.getContractFactory("Manager");
  this.manager = await Manager.deploy(this.dao.address);
  await this.manager.deployed();
}

async function deployRegistry() {
  const Registry = await ethers.getContractFactory("Registry");
  this.registry = await Registry.deploy();
  await this.registry.deployed();
  await this.registry
    .connect(this.dao)
    .initialize(this.manager.address, this.dex.address, 10);
}

async function deployManagerAndRegistry() {
  await deployManager.apply(this);

  await deployRegistry.apply(this);
}

async function deployNFT() {
  const NFT = await ethers.getContractFactory("NFT");
  this.nft = await NFT.deploy();
  await this.nft.deployed();
  await this.nft.initialize(
    this.manager.address,
    "TestNFT",
    "T-NFT",
    "https://T-NFT.com/"
  );
}

async function deployContracts() {
  await deployManagerAndRegistry.apply(this);

  await this.registry.connect(this.proxyOwner).registerProxyOverride();

  await this.manager.connect(this.dao).setRegistry(this.registry.address);

  const proxyAddress = await this.registry.proxies(this.proxyOwner.address);

  this.Proxy = await ethers.getContractFactory("Proxy");
  this.proxy = await this.Proxy.attach(proxyAddress);

  const MetaTx = await ethers.getContractFactory("MetaTx");
  this.metaTx = await MetaTx.deploy();
  await this.metaTx.deployed();
  await this.metaTx.initialize(
    this.manager.address,
    "Simple NFT MetaTx",
    "Version 0.1.0"
  );
}

module.exports = {
  latest,
  increaseTime,
  advanceBlock,
  ZERO_ADDRESS,
  MetaTxTypes,
  initAccounts,
  deployContracts,
  deployManagerAndRegistry,
  deployManager,
  deployRegistry,
  deployNFT,
  OrderTypes,
};
