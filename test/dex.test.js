const { ethers, network } = require("hardhat");
const { BigNumber } = require("ethers");
const { expect } = require("chai");
const { ZERO_ADDRESS, OrderTypes, latest } = require("./helper");
describe("Test  DEX", async function () {
  before("Init accounts", async function () {
    const signers = await ethers.getSigners();
    this.signers = signers;
    this.dao = signers[0];
    this.feeRecipient = signers[1];
    this.nftSeller = signers[2];
    this.nftBuyer = signers[3];
  });

  beforeEach("Deploy contracts", async function () {
    const DEX = await ethers.getContractFactory("DEX");
    this.dex = await DEX.deploy();
    await this.dex.deployed();

    const Manager = await ethers.getContractFactory("Manager");
    this.manager = await Manager.deploy(this.dao.address);
    await this.manager.deployed();

    const Registry = await ethers.getContractFactory("Registry");
    this.registry = await Registry.deploy();
    await this.registry.deployed();

    const NFT = await ethers.getContractFactory("NFT");
    this.nft = await NFT.deploy();
    await this.nft.deployed();

    await this.registry
      .connect(this.dao)
      .initialize(this.manager.address, this.dex.address, 10);

    await this.nft.initialize(
      this.manager.address,
      "TestNFT",
      "T-NFT",
      "https://T-NFT.com/"
    );

    // setup eip712 domain
    this.dexDomain = {
      name: "Simple NFT Dex",
      version: "Version 0.1.0",
      chainId: network.config.chainId,
      verifyingContract: this.dex.address,
    };

    await this.dex.initialize(
      this.manager.address,
      this.feeRecipient.address,
      this.dexDomain.name,
      this.dexDomain.version
    );

    // set up
    await this.manager.connect(this.dao).setRegistry(this.registry.address);
    await this.manager.connect(this.dao).setNftAllowed(this.nft.address, true);
    await this.manager.connect(this.dao).setPaymentAllowed(ZERO_ADDRESS, 1);

    await this.registry.connect(this.nftSeller).registerProxyOverride();
  });

  describe("Test dexFixedPrice", async function () {
    beforeEach("Chore", async function () {
      this.tokenId = BigNumber.from(this.nftSeller.address + 1e20 + 11 + "");
      this.price = ethers.utils.parseEther("100");

      const orderStartTime = await latest();

      this.makerOrder = {
        maker: this.nftSeller.address,
        taker: this.nftBuyer.address,
        asset_recipient: this.nftSeller.address,
        royalty_recipient: this.nftSeller.address,
        royalty_rate: 10,
        start: orderStartTime,
        expire: orderStartTime + 50000,
        maker_nonce: 0,
        taker_get_nft: true,
        allow_cex: true,
        tokens: {
          nft: this.nft.address,
          ft: ZERO_ADDRESS,
          nft_id: this.tokenId,
          nft_amount: 0,
          ft_amount: this.price,
        },
      };

      this.takerOrder = {
        maker: this.nftSeller.address,
        taker: this.nftBuyer.address,
        asset_recipient: this.nftBuyer.address,
        royalty_recipient: this.nftSeller.address,
        royalty_rate: 10,
        start: orderStartTime,
        expire: orderStartTime + 50000,
        maker_nonce: 0,
        taker_get_nft: true,
        allow_cex: true,
        tokens: {
          nft: this.nft.address,
          ft: ZERO_ADDRESS,
          nft_id: this.tokenId,
          nft_amount: 0,
          ft_amount: this.price,
        },
      };

      const makerRsv = ethers.utils.splitSignature(
        await this.nftSeller._signTypedData(
          this.dexDomain,
          OrderTypes,
          this.makerOrder
        )
      );

      this.sellerSignature = { v: makerRsv.v, r: makerRsv.r, s: makerRsv.s };

      const takerRsv = ethers.utils.splitSignature(
        await this.nftBuyer._signTypedData(
          this.dexDomain,
          OrderTypes,
          this.takerOrder
        )
      );
      this.buyerSignature = { v: takerRsv.v, r: takerRsv.r, s: takerRsv.s };
    });

    it("Test minted nft to swap", async function () {
      await this.nft
        .connect(this.dao)
        .safeMint(
          this.nftSeller.address,
          this.tokenId,
          0,
          ethers.utils.toUtf8Bytes("")
        );

      const ret = await this.dex.dexFixedPrice(
        this.makerOrder,
        this.sellerSignature,
        this.buyerSignature,
        this.nftBuyer.address,
        { value: this.price }
      );

      expect(await this.nft.ownerOf(this.tokenId)).to.equals(
        this.nftBuyer.address
      );
    });
  });

  // function initialize(address _manager, address _fee_recipient, string memory _name, string memory _version)
});
