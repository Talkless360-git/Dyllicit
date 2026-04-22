import { expect } from "chai";
import { ethers } from "hardhat";

describe("ChainStreamNFT", function () {
  async function deployNFTFixture() {
    const [owner, otherAccount] = await ethers.getSigners();
    const ChainStreamNFT = await ethers.getContractFactory("ChainStreamNFT");
    const nft = await ChainStreamNFT.deploy(owner.address);
    return { nft, owner, otherAccount };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { nft, owner } = await deployNFTFixture();
      expect(await nft.owner()).to.equal(owner.address);
    });
  });

  describe("Minting", function () {
    it("Should mint a new NFT and set royalties", async function () {
      const { nft, owner } = await deployNFTFixture();
      const tokenId = 1;
      const amount = 100;
      const uri = "ipfs://sample-hash";
      const royaltyFee = 500; // 5%

      await expect(nft.mint(owner.address, tokenId, amount, uri, royaltyFee))
        .to.emit(nft, "NFTMinted")
        .withArgs(owner.address, tokenId, amount, uri);

      expect(await nft.balanceOf(owner.address, tokenId)).to.equal(amount);
      expect(await nft.uri(tokenId)).to.equal(uri);

      // Check royalties
      const royaltyInfo = await nft.royaltyInfo(tokenId, ethers.parseEther("1"));
      expect(royaltyInfo[0]).to.equal(owner.address);
      expect(royaltyInfo[1]).to.equal(ethers.parseEther("0.05"));
    });

    it("Should fail if non-owner tries to mint", async function () {
      const { nft, otherAccount } = await deployNFTFixture();
      await expect(
        nft.connect(otherAccount).mint(otherAccount.address, 1, 1, "uri", 500)
      ).to.be.revertedWithCustomError(nft, "OwnableUnauthorizedAccount");
    });
  });
});
