const hre = require("hardhat");
const ethers = hre.ethers;
const chai = require("chai");
const { ZERO_ADDRESS, initAccounts, deployContracts } = require("./helper");
const expect = chai.expect;
describe("Test  proxy", async function () {
  before("Init accounts", initAccounts);

  beforeEach("Deploy contracts", deployContracts);

  it("Expect initial status", async function () {
    expect(await this.proxy.owner()).to.equal(this.proxyOwner.address);
    expect(await this.proxy.registry()).to.equal(this.registry.address);
  });

  it("Test contract is receivable", async function () {
    const msgVal = ethers.utils.parseEther("1");
    const tx = {
      to: this.proxy.address,
      value: msgVal,
    };

    await expect(this.proxyOwner.sendTransaction(tx))
      .to.emit(this.proxy, "ReceivedEther")
      .withArgs(this.proxyOwner.address, msgVal);

    expect(await ethers.provider.getBalance(this.proxy.address)).to.equal(
      msgVal
    );
  });

  describe("Test receiveApproval", async function () {
    beforeEach("Deploy mockContracts", async function () {
      this.MockUSDT = await ethers.getContractFactory("MockUSDT");
      this.usdt = await this.MockUSDT.deploy();
      this.usdtOwner = this.signers[8];
      await this.usdt.connect(this.usdtOwner).deployed();
    });

    it("Expect revert , because the user did not approve", async function () {
      const msgVal = ethers.utils.parseEther("66");
      const extra = ethers.utils.defaultAbiCoder.encode(
        ["string"],
        ["Test Extra"]
      );

      await expect(
        this.proxy.receiveApproval(
          this.usdtOwner.address,
          msgVal,
          this.usdt.address,
          ethers.utils.arrayify(extra)
        )
      ).to.revertedWith("ERC20: insufficient allowance");
    });
  });

  describe("Test setRevoke", async function () {
    it("Expect revert , because of invoking by a non-owner address", async function () {
      await expect(
        this.proxy.connect(this.signers[10]).setRevoke(true)
      ).to.revertedWith("Proxy can only be revoked by its owner");
    });

    it("Expect right status", async function () {
      await expect(this.proxy.connect(this.proxyOwner).setRevoke(true))
        .to.emit(this.proxy, "RevokeSet")
        .withArgs(true);
      expect(await this.proxy.revoked());
    });
  });

  describe("Test transferOwnership", async function () {
    it("Expect revert , because of invoking by a non-registry address", async function () {
      await expect(
        this.proxy
          .connect(this.signers[10])
          .transferOwnership(this.signers[9].address)
      ).to.revertedWith("Ownership can only be changed through registry");
    });

    it("Expect revert , because of the zero address", async function () {
      const callData = this.registry.interface.encodeFunctionData(
        "transferAccessTo(address,address)",
        [this.proxyOwner.address, ZERO_ADDRESS]
      );

      await expect(
        this.proxy
          .connect(this.proxyOwner)
          .proxyAssert(this.registry.address, false, 0, callData)
      ).to.revertedWith("Proxy assertion failed");
    });

    it("Expect right status", async function () {
      const newOwner = this.signers[10];

      const callData = this.registry.interface.encodeFunctionData(
        "transferAccessTo(address,address)",
        [this.proxyOwner.address, newOwner.address]
      );

      await this.proxy
        .connect(this.proxyOwner)
        .proxyAssert(this.registry.address, false, 0, callData);

      // check transfer success
      expect(await this.registry.proxies(newOwner.address)).to.equal(
        this.proxy.address
      );

      expect(await this.proxy.owner()).to.equal(newOwner.address);
    });
  });

  describe("Test proxy", async function () {
    it("Expect revert , because of non-owner", async function () {
      const nonOwner = this.signers[8];
      const callData = this.registry.interface.encodeFunctionData(
        "transferAccessTo(address,address)",
        [this.proxyOwner.address, nonOwner.address]
      );
      await expect(
        this.proxy
          .connect(nonOwner)
          .proxy(this.registry.address, false, 0, callData)
      ).to.revertedWith(
        "Only owner or registry-authorized contract can call proxy function"
      );
    });

    it("Expect revert , because proxy was revoked", async function () {
      const nonOwner = this.signers[8];
      await this.proxy.connect(this.proxyOwner).setRevoke(true);

      const callData = this.registry.interface.encodeFunctionData(
        "transferAccessTo(address,address)",
        [this.proxyOwner.address, nonOwner.address]
      );
      await expect(
        this.proxy
          .connect(nonOwner)
          .proxy(this.registry.address, false, 0, callData)
      ).to.revertedWith(
        "Only owner or registry-authorized contract can call proxy function"
      );
    });

    describe("Test delegate call", async function () {
      before("Deploy delegate", async function () {
        this.DelegateProxy = await ethers.getContractFactory("DelegateProxy");
        this.delegateProxy = await this.DelegateProxy.deploy();
        await this.delegateProxy.deployed();
      });
      it("Expect setOwner by DelegateProxy", async function () {
        const newOwner = this.signers[8];
        const callData = this.delegateProxy.interface.encodeFunctionData(
          "setOwner(address) ",
          [newOwner.address]
        );

        await this.registry
          .connect(this.dao)
          .setDestination(this.delegateProxy.address, true);

        await this.proxy
          .connect(this.proxyOwner)
          .proxyAssert(this.delegateProxy.address, true, 0, callData);

        expect(await this.proxy.owner()).to.equal(newOwner.address);
      });
    });
  });
});
