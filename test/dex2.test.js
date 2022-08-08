const { ethers, network } = require("hardhat");
const { BigNumber } = require("ethers");
const { expect } = require("chai");
const { ZERO_ADDRESS, OrderTypes, latest } = require("./helper");
const {zeroAddress} = require("ethereumjs-util");
describe("Test  DEX", async function() {
  before("Init accounts", async function () {
    const signers = await ethers.getSigners();
    this.signers = signers;
    this.dao = signers[0];
    this.feeRecipient = signers[1];
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

    const usdc_args = [
      6,
      "USD Coin",
      "USDC",
    ];
    const USDC = await ethers.getContractFactory("USDC");
    this.usdc = await USDC.deploy(...usdc_args);
    await this.usdc.deployed();

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
      verifyingContract: this.dex.address
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
    await this.manager.connect(this.dao).setPaymentAllowed(this.usdc.address, 1);

  });

  describe("Test dexFixedPrice", async function () {
    it("Taker get nft, test minted nft to swap", async function () {
      this.nftSeller = this.signers[2];
      this.nftBuyer = this.signers[3];
      await this.registry.connect(this.nftSeller).registerProxyOverride();
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
          ft_amount: this.price
        }
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
          ft_amount: this.price
        }
      };

      const makerRsv = ethers.utils.splitSignature(
          await this.nftSeller._signTypedData(
              this.dexDomain,
              OrderTypes,
              this.makerOrder
          )
      );

      this.sellerSignature = {v: makerRsv.v, r: makerRsv.r, s: makerRsv.s};

      const takerRsv = ethers.utils.splitSignature(
          await this.nftBuyer._signTypedData(
              this.dexDomain,
              OrderTypes,
              this.takerOrder
          )
      );

      this.buyerSignature = {v: takerRsv.v, r: takerRsv.r, s: takerRsv.s};

      await this.nft
          .connect(this.dao)
          .safeMint(
              this.nftSeller.address,
              this.tokenId,
              0,
              ethers.utils.toUtf8Bytes("")
          );

      await this.dex.connect(this.nftBuyer).dexFixedPrice(
          this.makerOrder,
          this.sellerSignature,
          this.buyerSignature,
          this.nftBuyer.address,
          {value: this.price}
      );

      expect(await this.nft.ownerOf(this.tokenId)).to.equals(
          this.nftBuyer.address
      );
    });

    it("Taker get nft, pay with usdc tokens", async function () {
      this.nftSeller = this.signers[2];
      this.nftBuyer = this.signers[3];

      await this.usdc.mint(this.nftBuyer.address, 1e6);

      expect(await this.usdc.balanceOf(this.nftBuyer.address)).to.equals(1e6);
      expect(await this.usdc.balanceOf(this.nftSeller.address)).to.equals(0);

      const proxy1 = await this.registry.connect(this.nftBuyer).registerProxyOverride();
      const proxy2 = await this.registry.connect(this.nftSeller).registerProxyOverride();

      // console.log(await proxy1.wait())
      // console.log(await proxy2.wait())

      const proxyAddr = this.registry.proxies(this.nftBuyer.address);
      await this.usdc.connect(this.nftBuyer).approve(proxyAddr, 1e6);


      this.tokenId = BigNumber.from(this.nftSeller.address + 1e20 + 11 + "");
      this.price = ethers.utils.parseEther("0");

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
          ft: this.usdc.address,
          nft_id: this.tokenId,
          nft_amount: 0,
          ft_amount: 1e6
        }
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
          ft: this.usdc.address,
          nft_id: this.tokenId,
          nft_amount: 0,
          ft_amount: 1e6
        }
      };

      const makerRsv = ethers.utils.splitSignature(
          await this.nftSeller._signTypedData(
              this.dexDomain,
              OrderTypes,
              this.makerOrder
          )
      );

      this.sellerSignature = {v: makerRsv.v, r: makerRsv.r, s: makerRsv.s};

      const takerRsv = ethers.utils.splitSignature(
          await this.nftBuyer._signTypedData(
              this.dexDomain,
              OrderTypes,
              this.takerOrder
          )
      );

      this.buyerSignature = {v: takerRsv.v, r: takerRsv.r, s: takerRsv.s};

      await this.nft
          .connect(this.dao)
          .safeMint(
              this.nftSeller.address,
              this.tokenId,
              0,
              ethers.utils.toUtf8Bytes("")
          );

      await this.dex.connect(this.nftBuyer).dexFixedPrice(
          this.makerOrder,
          this.sellerSignature,
          this.buyerSignature,
          this.nftBuyer.address,
          {value: this.price}
      );

      expect(await this.nft.ownerOf(this.tokenId)).to.equals(
          this.nftBuyer.address
      );
      expect(await this.usdc.balanceOf(this.nftBuyer.address)).to.equals(0);
      expect(await this.usdc.balanceOf(this.nftSeller.address)).to.not.equals(0);
    });

    it("Maker get nft, test minted nft to swap", async function () {
      this.nftSeller = this.signers[2];
      this.nftBuyer = this.signers[3];
      await this.registry.connect(this.nftSeller).registerProxyOverride();

      this.tokenId = BigNumber.from(this.nftSeller.address + 1e20 + 11 + "");
      this.price = ethers.utils.parseEther("100");

      const orderStartTime = await latest();

      // Taker is nftSeller, Maker is nftBuyer
      // Set taker_get_nft == false,
      this.makerOrder = {
        maker: this.nftBuyer.address,
        taker: this.nftSeller.address,
        asset_recipient: this.nftBuyer.address,
        royalty_recipient: this.nftSeller.address,
        royalty_rate: 10,
        start: orderStartTime,
        expire: orderStartTime + 50000,
        maker_nonce: 0,
        taker_get_nft: false,
        allow_cex: true,
        tokens: {
          nft: this.nft.address,
          ft: ZERO_ADDRESS,
          nft_id: this.tokenId,
          nft_amount: 0,
          ft_amount: this.price
        }
      };

      this.takerOrder = {
        maker: this.nftBuyer.address,
        taker: this.nftSeller.address,
        asset_recipient: this.nftSeller.address,
        royalty_recipient: this.nftSeller.address,
        royalty_rate: 10,
        start: orderStartTime,
        expire: orderStartTime + 50000,
        maker_nonce: 0,
        taker_get_nft: false,
        allow_cex: true,
        tokens: {
          nft: this.nft.address,
          ft: ZERO_ADDRESS,
          nft_id: this.tokenId,
          nft_amount: 0,
          ft_amount: this.price
        }
      };

      const makerRsv = ethers.utils.splitSignature(
          await this.nftBuyer._signTypedData(
              this.dexDomain,
              OrderTypes,
              this.makerOrder
          )
      );

      this.sellerSignature = {v: makerRsv.v, r: makerRsv.r, s: makerRsv.s};

      const takerRsv = ethers.utils.splitSignature(
          await this.nftSeller._signTypedData(
              this.dexDomain,
              OrderTypes,
              this.takerOrder
          )
      );

      this.buyerSignature = {v: takerRsv.v, r: takerRsv.r, s: takerRsv.s};

      await this.nft
          .connect(this.dao)
          .safeMint(
              this.nftSeller.address,
              this.tokenId,
              0,
              ethers.utils.toUtf8Bytes("")
          );

      await this.dex.connect(this.nftBuyer).dexFixedPrice(
          this.makerOrder,
          this.sellerSignature,
          this.buyerSignature,
          this.nftSeller.address,
          {value: this.price}
      );

      expect(await this.nft.ownerOf(this.tokenId)).to.equals(
          this.nftBuyer.address
      );
    });

    it("Maker get nft, pay with usdc tokens", async function () {
      this.nftSeller = this.signers[2];
      this.nftBuyer = this.signers[3];

      await this.usdc.mint(this.nftBuyer.address, 1e6);

      expect(await this.usdc.balanceOf(this.nftBuyer.address)).to.equals(1e6);
      expect(await this.usdc.balanceOf(this.nftSeller.address)).to.equals(0);

      const proxy1 = await this.registry.connect(this.nftBuyer).registerProxyOverride();
      const proxy2 = await this.registry.connect(this.nftSeller).registerProxyOverride();

      const proxyAddr = this.registry.proxies(this.nftBuyer.address);
      await this.usdc.connect(this.nftBuyer).approve(proxyAddr, 1e6);

      this.tokenId = BigNumber.from(this.nftSeller.address + 1e20 + 11 + "");
      this.price = ethers.utils.parseEther("0");

      const orderStartTime = await latest();

      // Taker is nftSeller, Maker is nftBuyer
      // Set taker_get_nft == false,
      this.makerOrder = {
        maker: this.nftBuyer.address,
        taker: this.nftSeller.address,
        asset_recipient: this.nftBuyer.address,
        royalty_recipient: this.nftSeller.address,
        royalty_rate: 10,
        start: orderStartTime,
        expire: orderStartTime + 50000,
        maker_nonce: 0,
        taker_get_nft: false,
        allow_cex: true,
        tokens: {
          nft: this.nft.address,
          ft: this.usdc.address,
          nft_id: this.tokenId,
          nft_amount: 0,
          ft_amount: 1e6
        }
      };

      this.takerOrder = {
        maker: this.nftBuyer.address,
        taker: this.nftSeller.address,
        asset_recipient: this.nftSeller.address,
        royalty_recipient: this.nftSeller.address,
        royalty_rate: 10,
        start: orderStartTime,
        expire: orderStartTime + 50000,
        maker_nonce: 0,
        taker_get_nft: false,
        allow_cex: true,
        tokens: {
          nft: this.nft.address,
          ft: this.usdc.address,
          nft_id: this.tokenId,
          nft_amount: 0,
          ft_amount: 1e6
        }
      };

      const makerRsv = ethers.utils.splitSignature(
          await this.nftBuyer._signTypedData(
              this.dexDomain,
              OrderTypes,
              this.makerOrder
          )
      );

      this.sellerSignature = {v: makerRsv.v, r: makerRsv.r, s: makerRsv.s};

      const takerRsv = ethers.utils.splitSignature(
          await this.nftSeller._signTypedData(
              this.dexDomain,
              OrderTypes,
              this.takerOrder
          )
      );

      this.buyerSignature = {v: takerRsv.v, r: takerRsv.r, s: takerRsv.s};

      await this.nft
          .connect(this.dao)
          .safeMint(
              this.nftSeller.address,
              this.tokenId,
              0,
              ethers.utils.toUtf8Bytes("")
          );

      await this.dex.connect(this.nftBuyer).dexFixedPrice(
          this.makerOrder,
          this.sellerSignature,
          this.buyerSignature,
          this.nftSeller.address,
          {value: this.price}
      );

      expect(await this.nft.ownerOf(this.tokenId)).to.equals(
          this.nftBuyer.address
      );

      expect(await this.usdc.balanceOf(this.nftBuyer.address)).to.equals(0);
      expect(await this.usdc.balanceOf(this.nftSeller.address)).to.not.equals(0);

    });

    it("Asset recipient is address(0) or contract, should failed", async function () {
      this.nftSeller = this.signers[2];
      this.nftBuyer = this.signers[3];
      await this.registry.connect(this.nftSeller).registerProxyOverride();
      this.tokenId = BigNumber.from(this.nftSeller.address + 1e20 + 11 + "");
      this.price = ethers.utils.parseEther("100");

      const orderStartTime = await latest();

      this.makerOrder = {
        maker: this.nftSeller.address,
        taker: this.nftBuyer.address,
        asset_recipient: this.usdc.address,
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
          ft_amount: this.price
        }
      };

      this.takerOrder = {
        maker: this.nftSeller.address,
        taker: this.nftBuyer.address,
        asset_recipient: ZERO_ADDRESS,
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
          ft_amount: this.price
        }
      };

      const makerRsv = ethers.utils.splitSignature(
          await this.nftSeller._signTypedData(
              this.dexDomain,
              OrderTypes,
              this.makerOrder
          )
      );

      this.sellerSignature = {v: makerRsv.v, r: makerRsv.r, s: makerRsv.s};

      const takerRsv = ethers.utils.splitSignature(
          await this.nftBuyer._signTypedData(
              this.dexDomain,
              OrderTypes,
              this.takerOrder
          )
      );

      this.buyerSignature = {v: takerRsv.v, r: takerRsv.r, s: takerRsv.s};

      await this.nft
          .connect(this.dao)
          .safeMint(
              this.nftSeller.address,
              this.tokenId,
              0,
              ethers.utils.toUtf8Bytes("")
          );
      try {
        await this.dex.connect(this.nftBuyer).dexFixedPrice(
            this.makerOrder,
            this.sellerSignature,
            this.buyerSignature,
            ZERO_ADDRESS,
            {value: this.price}
        );
      } catch (e) {
        console.log('\n\033[5m\033[0;31m%s \033[0m', e); // Revert!
        console.log("");
      }

      expect(await this.nft.ownerOf(this.tokenId)).to.equals(
          this.nftSeller.address
      );
    });

    it("Test minted nft to swap with dex way", async function () {
      this.nftSeller = this.signers[2];
      this.nftBuyer = this.signers[3];

      await this.registry.connect(this.nftSeller).registerProxyOverride();

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
          ft_amount: this.price
        }
      };

      const makerRsv = ethers.utils.splitSignature(
          await this.nftSeller._signTypedData(
              this.dexDomain,
              OrderTypes,
              this.makerOrder
          )
      );

      this.sellerSignature = {v: makerRsv.v, r: makerRsv.r, s: makerRsv.s};

      await this.nft
          .connect(this.dao)
          .safeMint(
              this.nftSeller.address,
              this.tokenId,
              0,
              ethers.utils.toUtf8Bytes("")
          );

      await this.dex.connect(this.dao).cexFixedPrice(
          this.makerOrder,
          this.sellerSignature,
          this.nftBuyer.address
      );

      expect(await this.nft.ownerOf(this.tokenId)).to.equals(
          this.nftBuyer.address
      );
    });


  });

});

