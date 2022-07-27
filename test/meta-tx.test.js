const hre = require("hardhat");
const ethers = hre.ethers;
const { expect } = require("chai");
const { BigNumber } = require("ethers");
const { initAccounts, deployContracts, MetaTxTypes } = require("./helper");
describe("Test  MetaTx", async function () {
  before("Init accounts", initAccounts);

  beforeEach("Deploy contracts", deployContracts);

  describe("Test setNameVersion", async function () {
    it("Expect call by Operator only", async function () {
      await expect(
        this.metaTx.connect(this.signers[8]).setNameVersion("Test", "v2.0")
      ).to.revertedWith("Caller is not an operator");
    });

    it("Expect succeed to set", async function () {
      const operator = this.signers[10];
      await this.manager
        .connect(this.dao)
        .setOperators([operator.address], true);

      await this.metaTx.connect(operator).setNameVersion("Test", "v2.0");

      expect(await this.metaTx.HashEIP712Name()).to.equal(
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("Test"))
      );
      expect(await this.metaTx.HashEIP712Version()).to.equal(
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("v2.0"))
      );
    });
  });

  describe("Test executeMetaTransaction", async function () {
    beforeEach("Deploy MetaTxCallee", async function () {
      const MetaTxCallee = await ethers.getContractFactory("MetaTxCallee");
      const metaTxCallee = await MetaTxCallee.deploy();
      this.metaTxCallee = await MetaTxCallee.deploy();
      await this.metaTxCallee.deployed();
    });
    it("Expect exec metaTx", async function () {
      const signer = this.signers[10];

      const callData = this.metaTxCallee.interface.encodeFunctionData(
        "recordCaller()",
        []
      );

      const domain = {
        name: "Simple NFT MetaTx",
        version: "Version 0.1.0",
        chainId: hre.network.config.chainId,
        verifyingContract: this.metaTx.address,
      };

      const metaTx = {
        nonce: BigNumber.from(0),
        from: signer.address,
        to: this.metaTxCallee.address,
        functionSignature: callData,
      };

      const eip712Signature = await signer._signTypedData(
        domain,
        MetaTxTypes,
        metaTx
      );

      const rsv = ethers.utils.splitSignature(eip712Signature);

      const sendValue = ethers.utils.parseEther("10");

      await this.metaTx
        .connect(this.dao)
        .executeMetaTransaction(
          signer.address,
          this.metaTxCallee.address,
          callData,
          rsv.v,
          rsv.r,
          rsv.s,
          { value: sendValue }
        );

      expect(await this.metaTxCallee.received()).to.equal(sendValue);
      expect(await this.metaTxCallee.lastCaller()).to.equal(signer.address);
    });
  });
});
