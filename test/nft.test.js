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

    it('Should approve and transferFrom success', async function(){

      // approve
      await this.nft.connect(this.tokenOwner).approve(this.tokenReceiver.address, this.tokenId);
      
      // get approved
      expect(await this.nft.getApproved(this.tokenId)).to.equal(this.tokenReceiver.address);

      // approve transfer
      const userA = (await ethers.getSigners())[10];

      const tx = await this.nft.connect(this.tokenReceiver).transferFrom(this.tokenOwner.address, userA.address, this.tokenId);
      await tx.wait();
    
      expect(await this.nft.ownerOf(this.tokenId)).to.equal(userA.address);
    });

    it('Should transferFrom failed', async function(){
      
      expect(await this.nft.ownerOf(this.tokenId)).to.equal(this.tokenOwner.address);

      // exec tx user
      const userA = (await ethers.getSigners())[10];
      const recvUser = (await ethers.getSigners())[11];

      const callData = this.nft.interface.encodeFunctionData(
        "transferFrom(address,address,uint256)",
        [this.tokenOwner.address, recvUser.address, this.tokenId]
      );

      // 部署验证msg.sender合约
      const Verify = await ethers.getContractFactory("Verify");
      const verify = await Verify.deploy();
      await verify.connect(userA).verify(this.nft.address, this.tokenOwner.address, callData);

      expect(await this.nft.ownerOf(this.tokenId)).to.equal(this.tokenOwner.address)
    });

    it('Should burn token id success', async function(){
      expect(await this.nft.ownerOf(this.tokenId)).to.equal(this.tokenOwner.address);
      expect(await this.nft.exists(this.tokenId)).to.equal(true);
      await this.nft.connect(this.tokenOwner).burn(this.tokenId);
      expect(await this.nft.exists(this.tokenId)).to.equal(false)
    });

    it('Should safeTransferFrom success', async function(){
      const tokenRecv = (await ethers.getSigners())[10];
      await this.nft.connect(this.tokenOwner)["safeTransferFrom(address,address,uint256)"](this.tokenOwner.address,tokenRecv.address,this.tokenId);
      expect(await this.nft.ownerOf(this.tokenId)).to.equal(tokenRecv.address);
    });

    it('Should safeTransferFrom with data success', async function(){
      const tokenRecv = (await ethers.getSigners())[10];
      await this.nft.connect(this.tokenOwner)["safeTransferFrom(address,address,uint256,bytes)"](this.tokenOwner.address,tokenRecv.address,this.tokenId, "0x");
      expect(await this.nft.ownerOf(this.tokenId)).to.equal(tokenRecv.address);
    });

    it('Should mintToRecipients success', async function(){
      const tokenRecv1 = (await ethers.getSigners())[10];
      const tokenRecv2 = (await ethers.getSigners())[11];

      const royaltyRate = "1";
      const tokenId = BigNumber.from(
        "0x666d20c37448eea5fc71f4e5fbc3cf81f83924ba00003b9aca1900000000000c"
      );
      const tokenId2 = BigNumber.from(
        "0x666d20c37448eea5fc71f4e5fbc3cf81f83924ba00003b9aca1900000000000d"
      );

      await this.nft.mintToRecipients(
        [tokenRecv1.address, tokenRecv2.address],
        [tokenId, tokenId2],
        royaltyRate,
      );
      expect(await this.nft.ownerOf(tokenId)).to.equal(tokenRecv1.address);
      expect(await this.nft.ownerOf(tokenId2)).to.equal(tokenRecv2.address);
    });

    it("Should mintToCreators success", async function(){
      const tokenId1 = BigNumber.from(
        "0x666d20c37448eea5fc71f4e5fbc3cf81f83924ba00003b9aca1900000000000d"
      )
      const tokenId2 = BigNumber.from(
        "0x666d20c37448eea5fc71f4e5fbc3cf81f83924ba00003b9aca1900000000000e"
      )
      const tokenId3 = BigNumber.from(
        "0x666d20c37448eea5fc71f4e5fbc3cf81f83924ba00003b9aca1900000000000f"
      )
      const royaltyRate = "1";
      const creator = "0x666d20c37448eea5fc71f4e5fbc3cf81f83924ba"
  
      expect(await this.nft.balanceOf(creator)).to.equal(0);
  
      await this.nft.mintToCreators(
        [tokenId1, tokenId2,tokenId3],
        royaltyRate
      );
  
      expect(await this.nft.balanceOf(creator)).to.equal(3);
      expect(await this.nft.totalSupply()).to.equal(4);
    });
  
    it("Should mintToCreators tokenId reuse", async function(){
      const tokenId1 = BigNumber.from(
        "0x666d20c37448eea5fc71f4e5fbc3cf81f83924ba00003b9aca1900000000000d"
      )
      const tokenId2 = BigNumber.from(
        "0x666d20c37448eea5fc71f4e5fbc3cf81f83924ba00003b9aca1900000000000d"
      )
      const royaltyRate = "1";
      const creator = "0x666d20c37448eea5fc71f4e5fbc3cf81f83924ba"
  
      expect(await this.nft.balanceOf(creator)).to.equal(0);
      try {
        await this.nft.mintToCreators([tokenId1, tokenId2], royaltyRate)
      } catch (error) {
        expect(error.toString()).to.equal("Error: VM Exception while processing transaction: reverted with reason string 'ERC721: token already minted'")
      }
    });

    it("Should setApprovalForAll", async function(){
      const tokenRecv = (await ethers.getSigners())[10];

      await this.nft.connect(this.tokenOwner).setApprovalForAll(tokenRecv.address, true);
  
      expect(await this.nft.isApprovedForAll(this.tokenOwner.address, tokenRecv.address)).to.equal(true)
    });

    it("Should setRoyaltyInfo", async function(){
      const royaltyRecv = (await ethers.getSigners())[10];

      await this.nft.connect(this.dao).setRoyaltyInfo(this.tokenId, royaltyRecv.address, 5);
      const [recv, amount] = await this.nft.royaltyInfo(this.tokenId, ethers.utils.parseEther("1"));
      expect(recv).to.equal(royaltyRecv.address);
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
