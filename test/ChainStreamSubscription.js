const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("ChainStreamSubscription", function () {
  async function deployFixture() {
    const [owner, subscriber, artist1, artist2, attacker] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ChainStreamSubscription");
    const contract = await Factory.deploy();
    return { contract, owner, subscriber, artist1, artist2, attacker };
  }

  describe("Deployment", function () {
    it("Should set the deployer as owner", async function () {
      const { contract, owner } = await loadFixture(deployFixture);
      expect(await contract.owner()).to.equal(owner.address);
    });

    it("Should have correct default values", async function () {
      const { contract } = await loadFixture(deployFixture);
      expect(await contract.subscriptionPrice()).to.equal(ethers.parseEther("0.01"));
      expect(await contract.subscriptionDuration()).to.equal(30 * 24 * 60 * 60);
      expect(await contract.platformFeeBps()).to.equal(250);
    });
  });

  describe("setPrice()", function () {
    it("Should update price", async function () {
      const { contract } = await loadFixture(deployFixture);
      await contract.setPrice(ethers.parseEther("0.05"));
      expect(await contract.subscriptionPrice()).to.equal(ethers.parseEther("0.05"));
    });

    it("Should revert if price is 0", async function () {
      const { contract } = await loadFixture(deployFixture);
      await expect(contract.setPrice(0)).to.be.revertedWith("Price must be > 0");
    });

    it("Should revert if called by non-owner", async function () {
      const { contract, attacker } = await loadFixture(deployFixture);
      await expect(
        contract.connect(attacker).setPrice(ethers.parseEther("1"))
      ).to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount");
    });

    it("Should emit PriceUpdated event", async function () {
      const { contract } = await loadFixture(deployFixture);
      const newPrice = ethers.parseEther("0.02");
      await expect(contract.setPrice(newPrice))
        .to.emit(contract, "PriceUpdated")
        .withArgs(newPrice);
    });
  });

  describe("setPlatformFee()", function () {
    it("Should update fee", async function () {
      const { contract } = await loadFixture(deployFixture);
      await contract.setPlatformFee(500);
      expect(await contract.platformFeeBps()).to.equal(500);
    });

    it("Should revert if fee > 1000 (10%)", async function () {
      const { contract } = await loadFixture(deployFixture);
      await expect(contract.setPlatformFee(1001)).to.be.revertedWith("Fee too high");
    });
  });

  describe("subscribe()", function () {
    it("Should accept exact payment and update expiration", async function () {
      const { contract, subscriber } = await loadFixture(deployFixture);
      await contract.connect(subscriber).subscribe({ value: ethers.parseEther("0.01") });
      expect(await contract.isSubscribed(subscriber.address)).to.be.true;
    });

    it("Should reject underpayment", async function () {
      const { contract, subscriber } = await loadFixture(deployFixture);
      await expect(
        contract.connect(subscriber).subscribe({ value: ethers.parseEther("0.005") })
      ).to.be.revertedWith("Exact payment required");
    });

    it("Should reject overpayment", async function () {
      const { contract, subscriber } = await loadFixture(deployFixture);
      await expect(
        contract.connect(subscriber).subscribe({ value: ethers.parseEther("0.02") })
      ).to.be.revertedWith("Exact payment required");
    });

    it("Should extend subscription on renewal", async function () {
      const { contract, subscriber } = await loadFixture(deployFixture);
      await contract.connect(subscriber).subscribe({ value: ethers.parseEther("0.01") });
      const firstExpiry = await contract.subscriberExpirations(subscriber.address);
      
      await contract.connect(subscriber).subscribe({ value: ethers.parseEther("0.01") });
      const secondExpiry = await contract.subscriberExpirations(subscriber.address);
      
      const duration = await contract.subscriptionDuration();
      expect(secondExpiry).to.be.greaterThan(firstExpiry);
      expect(secondExpiry - firstExpiry).to.equal(duration);
    });

    it("Should send platform fee to owner", async function () {
      const { contract, owner, subscriber } = await loadFixture(deployFixture);
      const price = ethers.parseEther("0.01");
      const expectedFee = (price * BigInt(250)) / BigInt(10000);
      await expect(
        contract.connect(subscriber).subscribe({ value: price })
      ).to.changeEtherBalance(owner, expectedFee);
    });

    it("Should emit Subscribed event", async function () {
      const { contract, subscriber } = await loadFixture(deployFixture);
      await expect(
        contract.connect(subscriber).subscribe({ value: ethers.parseEther("0.01") })
      ).to.emit(contract, "Subscribed");
    });
  });

  describe("withdraw()", function () {
    it("Should withdraw full balance to owner", async function () {
      const { contract, owner, subscriber } = await loadFixture(deployFixture);
      await contract.connect(subscriber).subscribe({ value: ethers.parseEther("0.01") });
      const contractBalance = await ethers.provider.getBalance(await contract.getAddress());
      await expect(contract.withdraw()).to.changeEtherBalance(owner, contractBalance);
    });

    it("Should revert if balance is zero", async function () {
      const { contract } = await loadFixture(deployFixture);
      await expect(contract.withdraw()).to.be.revertedWith("No balance to withdraw");
    });

    it("Should revert if called by non-owner", async function () {
      const { contract, attacker } = await loadFixture(deployFixture);
      await expect(
        contract.connect(attacker).withdraw()
      ).to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount");
    });
  });

  describe("payoutRoyalties()", function () {
    it("Should pay artists correctly", async function () {
      const { contract, subscriber, artist1, artist2 } = await loadFixture(deployFixture);
      await contract.connect(subscriber).subscribe({ value: ethers.parseEther("0.01") });
      
      const amount1 = ethers.parseEther("0.002");
      const amount2 = ethers.parseEther("0.003");
      await expect(
        contract.payoutRoyalties([artist1.address, artist2.address], [amount1, amount2])
      ).to.changeEtherBalances([artist1, artist2], [amount1, amount2]);
    });

    it("Should revert on mismatched arrays", async function () {
      const { contract, artist1 } = await loadFixture(deployFixture);
      await expect(
        contract.payoutRoyalties([artist1.address], [])
      ).to.be.revertedWith("Mismatched arrays");
    });

    it("Should revert on empty arrays", async function () {
      const { contract } = await loadFixture(deployFixture);
      await expect(
        contract.payoutRoyalties([], [])
      ).to.be.revertedWith("Empty arrays");
    });

    it("Should revert on zero address", async function () {
      const { contract, subscriber } = await loadFixture(deployFixture);
      await contract.connect(subscriber).subscribe({ value: ethers.parseEther("0.01") });
      await expect(
        contract.payoutRoyalties([ethers.ZeroAddress], [ethers.parseEther("0.001")])
      ).to.be.revertedWith("Invalid artist address");
    });

    it("Should revert on zero amount", async function () {
      const { contract, subscriber, artist1 } = await loadFixture(deployFixture);
      await contract.connect(subscriber).subscribe({ value: ethers.parseEther("0.01") });
      await expect(
        contract.payoutRoyalties([artist1.address], [0])
      ).to.be.revertedWith("Amount must be > 0");
    });

    it("Should revert if insufficient balance", async function () {
      const { contract, artist1 } = await loadFixture(deployFixture);
      await expect(
        contract.payoutRoyalties([artist1.address], [ethers.parseEther("100")])
      ).to.be.revertedWith("Insufficient contract balance");
    });

    it("Should revert if called by non-owner", async function () {
      const { contract, attacker, artist1 } = await loadFixture(deployFixture);
      await expect(
        contract.connect(attacker).payoutRoyalties([artist1.address], [ethers.parseEther("0.001")])
      ).to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount");
    });

    it("Should emit RoyaltyPaid events", async function () {
      const { contract, subscriber, artist1 } = await loadFixture(deployFixture);
      await contract.connect(subscriber).subscribe({ value: ethers.parseEther("0.01") });
      const amount = ethers.parseEther("0.001");
      await expect(
        contract.payoutRoyalties([artist1.address], [amount])
      ).to.emit(contract, "RoyaltyPaid").withArgs(artist1.address, amount);
    });
  });

  describe("isSubscribed()", function () {
    it("Should return false for non-subscriber", async function () {
      const { contract, attacker } = await loadFixture(deployFixture);
      expect(await contract.isSubscribed(attacker.address)).to.be.false;
    });

    it("Should return true for active subscriber", async function () {
      const { contract, subscriber } = await loadFixture(deployFixture);
      await contract.connect(subscriber).subscribe({ value: ethers.parseEther("0.01") });
      expect(await contract.isSubscribed(subscriber.address)).to.be.true;
    });
  });

  describe("receive()", function () {
    it("Should accept direct ETH deposits", async function () {
      const { contract, owner } = await loadFixture(deployFixture);
      const addr = await contract.getAddress();
      await owner.sendTransaction({ to: addr, value: ethers.parseEther("1.0") });
      expect(await ethers.provider.getBalance(addr)).to.equal(ethers.parseEther("1.0"));
    });
  });
});
