const { ethers, network } = require("hardhat");
const { expect } = require("chai");
const {
  initAccounts,
  deployContracts,
  deployNFT,
  MetaTxTypes,
} = require("./helper");
const { BigNumber } = require("ethers");
describe("Test  nft", async function () {
  before("Init accounts", initAccounts);

  beforeEach("Deploy contracts", async function () {
    await deployContracts.apply(this);

    await deployNFT.apply(this);

    await this.manager.setMetaTx(this.metaTx.address);

    this.domain = {
      name: "Simple NFT MetaTx",
      version: "Version 0.1.0",
      chainId: network.config.chainId,
      verifyingContract: this.metaTx.address,
    };
  });

  describe("Test metaTx approve and transferFrom", async function () {
    beforeEach("Setup", async function () {
      this.tokenOwner = this.signers[12];
      this.tokenId = BigNumber.from(
        "0x666d20c37448eea5fc71f4e5fbc3cf81f83924ba00003b9aca1900000000000b"
      );
      // mint
      await this.nft
        .connect(this.dao)
        .safeMint(
          this.tokenOwner.address,
          this.tokenId,
          2,
          ethers.utils.toUtf8Bytes("")
        );

      expect(await this.nft.ownerOf(this.tokenId)).to.equal(
        this.tokenOwner.address
      );
    });

    it("Expect approve", expectApprove);
    it("Expect transferFrom", async function () {
      await expectApprove.apply(this);

      this.tokenReceiver = this.signers[9];
      const callData = this.nft.interface.encodeFunctionData(
        "transferFrom(address,address,uint256)",
        [this.tokenOwner.address, this.tokenReceiver.address, this.tokenId]
      );

      const metaTx = {
        nonce: BigNumber.from(0),
        from: this.approvalReceiver.address,
        to: this.nft.address,
        functionSignature: callData,
      };

      const eip712Signature = await this.approvalReceiver._signTypedData(
        this.domain,
        MetaTxTypes,
        metaTx
      );

      const rsv = ethers.utils.splitSignature(eip712Signature);

      await this.metaTx
        .connect(this.dao)
        .executeMetaTransaction(
          this.approvalReceiver.address,
          this.nft.address,
          callData,
          rsv.v,
          rsv.r,
          rsv.s
        );

      expect(await this.nft.ownerOf(this.tokenId)).to.equal(
        this.tokenReceiver.address
      );
    });
  });
});

async function expectApprove() {
  this.approvalReceiver = this.signers[11];
  const callData = this.nft.interface.encodeFunctionData(
    "approve(address,uint256)",
    [this.approvalReceiver.address, this.tokenId]
  );

  const metaTx = {
    nonce: BigNumber.from(0),
    from: this.tokenOwner.address,
    to: this.nft.address,
    functionSignature: callData,
  };

  const eip712Signature = await this.tokenOwner._signTypedData(
    this.domain,
    MetaTxTypes,
    metaTx
  );

  const rsv = ethers.utils.splitSignature(eip712Signature);

  await this.metaTx
    .connect(this.dao)
    .executeMetaTransaction(
      this.tokenOwner.address,
      this.nft.address,
      callData,
      rsv.v,
      rsv.r,
      rsv.s
    );

  expect(await this.nft.getApproved(this.tokenId)).to.equal(
    this.approvalReceiver.address
  );
}
