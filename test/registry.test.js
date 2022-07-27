const hre = require("hardhat");
const ethers = hre.ethers;
const chai = require("chai");
const {
  latest,
  increaseTime,
  ZERO_ADDRESS,
  deployManagerAndRegistry,
} = require("./helper");
const { BigNumber } = require("ethers");
const expect = chai.expect;

describe("Test registry", async function () {
  before("Init accounts", async function () {
    const signers = await ethers.getSigners();
    this.signers = signers;
    this.dao = signers[0];
    this.dex = signers[1];
    this.proxyOwner = signers[2];
  });

  beforeEach("Deploy contracts", deployManagerAndRegistry);

  it("Expect initial status", async function () {
    expect(await this.registry.manager()).to.equal(this.manager.address);
    expect(await this.registry.initialized());

    expect(await this.registry.contracts[this.dex.address]);
    expect(await this.registry.DELAY_PERIOD()).to.equal(10);
  });

  describe("Test setOperator", async function () {
    // it("Expect revertWith onlyDAO", async function () {
    //   const address = this.signers[6].address;
    //   await expect(
    //     this.registry.connect(this.dex).setOperator(address, true)
    //   ).to.revertedWith("Caller is not the DAO");
    // });
    // it("Expect operator is true ", async function() {
    //   const address = this.signers[6].address;
    //   await this.registry.connect(this.dao).setOperator(address, true);
    //   expect(await this.registry.operators(address));
    // });
  });

  describe("Test startGrantAuthentication", async function () {
    it("Expect onlyOperator", async function () {
      await expect(
        this.registry
          .connect(this.signers[6])
          .startGrantAuthentication(this.signers[6].address)
      ).to.revertedWith("Caller is not an operator");
    });

    it("Expect revertWith allowed", async function () {
      await expect(
        this.registry
          .connect(this.dao)
          .startGrantAuthentication(this.dex.address)
      ).to.revertedWith("Contract is already allowed in registry, or pending");

      await this.registry
        .connect(this.dao)
        .startGrantAuthentication(this.signers[5].address);

      await expect(
        this.registry
          .connect(this.dao)
          .startGrantAuthentication(this.signers[5].address)
      ).to.revertedWith("Contract is already allowed in registry, or pending");
    });

    it("Expect  pending === block.timestamp", async function () {
      const address = this.signers[5].address;
      await this.registry.connect(this.dao).startGrantAuthentication(address);
      const timeStamp = await latest();
      expect(await this.registry.pending(address)).to.eq(timeStamp);
    });
  });

  describe("Test endGrantAuthentication", async function () {
    it("Expect onlyOperator", async function () {
      await expect(
        this.registry
          .connect(this.signers[6])
          .endGrantAuthentication(this.signers[6].address)
      ).to.revertedWith("Caller is not an operator");
    });

    describe("Expect revertWith approved", async function () {
      const errMsg =
        "Contract is no longer pending or has already been approved by registry";

      it("Should revert , because dex is already in contracts", async function () {
        await expect(
          this.registry
            .connect(this.dao)
            .endGrantAuthentication(this.dex.address)
        ).to.revertedWith(errMsg);
      });

      it("Should revert , because the address is never started grant", async function () {
        await expect(
          this.registry
            .connect(this.dao)
            .endGrantAuthentication(this.signers[5].address)
        ).to.revertedWith(errMsg);
      });

      it("Should revert , because the DELAY_PERIOD is not finished", async function () {
        await this.registry
          .connect(this.dao)
          .startGrantAuthentication(this.signers[5].address);

        await expect(
          this.registry
            .connect(this.dao)
            .endGrantAuthentication(this.signers[5].address)
        ).to.revertedWith(errMsg);
      });
    });

    it("Expect right status after endGrant", async function () {
      const address = this.signers[5].address;
      await this.registry.connect(this.dao).startGrantAuthentication(address);

      await increaseTime(BigNumber.from(10));

      await this.registry.connect(this.dao).endGrantAuthentication(address);

      expect(await this.registry.pending(address)).to.eq(0);
      expect(await this.registry.contracts(address));
    });
  });

  describe("Test revokeAuthentication", async function () {
    it("Expect onlyOperator", async function () {
      await expect(
        this.registry
          .connect(this.signers[6])
          .revokeAuthentication(this.signers[6].address)
      ).to.revertedWith("Caller is not an operator");
    });

    it("Expect contracts false", async function () {
      const address = this.signers[5].address;
      await this.registry.connect(this.dao).startGrantAuthentication(address);

      await increaseTime(BigNumber.from(10));

      await this.registry.connect(this.dao).endGrantAuthentication(address);

      await expect(
        this.registry.connect(this.dao).revokeAuthentication(address)
      )
        .to.emit(this.registry, "RevokeAuthentication")
        .withArgs(address);

      expect(await this.registry.contracts(address)).to.false;
    });
  });

  it("Test registerProxyOverride , Expect override proxy", async function () {
    const signer = this.signers[8];

    await this.registry.connect(signer).registerProxyOverride();
    const proxyAddress = await this.registry.proxies(signer.address);
    expect(await this.registry.proxies(signer.address)).to.equal(proxyAddress);

    await this.registry.connect(signer).registerProxyOverride();
    expect(await this.registry.proxies(signer.address)).to.not.equal(
      proxyAddress
    );
  });

  describe("Test registerProxyFor", async function () {
    beforeEach("Batch registerProxyFor", async function () {
      // register one for signer
      this.signer = this.signers[7];
      await this.registry.connect(this.signer).registerProxyOverride();
      this.proxyAddress = await this.registry.proxies(this.signer.address);

      // batch register
      this.users = this.signers.map((val) => val.address);
      await this.registry.connect(this.dao).registerProxyFor(this.users);
    });

    it("Should not override", async function () {
      expect(await this.registry.proxies(this.signer.address)).to.equal(
        this.proxyAddress
      );
    });

    it("Should success", async function () {
      for (const user of this.users) {
        expect(await this.registry.proxies(user)).to.not.equal(ZERO_ADDRESS);
      }
    });
  });

  describe("Test transferAccessTo", async function () {
    beforeEach("Register proxy", async function () {
      // register one for signer
      this.signer = this.signers[7];
      await this.registry.connect(this.signer).registerProxyOverride();

      const proxyAddress = await this.registry.proxies(this.signer.address);
      const Proxy = await ethers.getContractFactory("Proxy");
      this.proxyOfSigner = Proxy.attach(proxyAddress);
    });

    it("Should revert , only by proxy self", async function () {
      await expect(
        this.registry
          .connect(this.signer)
          .transferAccessTo(this.signer.address, this.signers[5].address)
      ).to.revertedWith("Proxy transfer can only be called by the proxy");
    });

    it("Should revert , because the to had been registered proxy", async function () {
      const toSigner = this.signers[10];
      await this.registry.connect(toSigner).registerProxyOverride();
      // make sure that toSigner registerProxyOverride successfully
      expect(await this.registry.proxies(toSigner.address)).to.not.equal(
        ZERO_ADDRESS
      );

      const callData = this.registry.interface.encodeFunctionData(
        "transferAccessTo(address,address)",
        [this.signer.address, toSigner.address]
      );

      await expect(
        this.proxyOfSigner
          .connect(this.signer)
          .proxyAssert(this.registry.address, false, 0, callData)
      ).to.revertedWith("Proxy assertion failed");
    });

    it("Should succeed ", async function () {
      const toSigner = this.signers[10];

      const callData = this.registry.interface.encodeFunctionData(
        "transferAccessTo(address,address)",
        [this.signer.address, toSigner.address]
      );

      await this.proxyOfSigner
        .connect(this.signer)
        .proxyAssert(this.registry.address, false, 0, callData);

      // check transfer success
      expect(await this.registry.proxies(toSigner.address)).to.equal(
        this.proxyOfSigner.address
      );
    });
  });
});
