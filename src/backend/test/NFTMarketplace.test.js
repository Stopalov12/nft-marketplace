const { expect } = require("chai");
const { BigNumber } = require("ethers");
const { ethers } = require("hardhat");
const convert = require("ethereum-unit-converter");
const toWei = (num) => {
  convert(num, "ether", "wei");
  return num;
};
const fromWei = (num) => {
  convert(num, "wei", "ether");
  return num;
};

describe("NFTMarketplace", () => {
  let NFT;
  let nft;
  let Marketplace;
  let marketplace;
  let deployer;
  let addr1;
  let addr2;
  let addrs;
  let feePercent = 1;
  let URI = "sample URI";

  beforeEach(async () => {
    const NFT = await ethers.getContractFactory("NFT");
    const Marketplace = await ethers.getContractFactory("Marketplace");
    //Get signers
    [deployer, addr1, addr2] = await ethers.getSigners();
    //Deploy contracts

    nft = await NFT.deploy();
    marketplace = await Marketplace.deploy(feePercent);
  });
  describe("Deployment", () => {
    it("Should track a name and symbol for the NFT collection", async () => {
      expect(await nft.name()).to.equal("DApp NFT");
      expect(await nft.symbol()).to.equal("DAPP");
    });
    it("Should track a feeAccount and a feePercent from the marketplace", async () => {
      expect(await marketplace.feeAccount()).to.equal(deployer.address);
      expect(await marketplace.feePercent()).to.equal(feePercent);
    });
    describe("Minting NFTs", () => {
      it("Should track each minted NFT", async () => {
        // addr1 mints an NFT
        await nft.connect(addr1).mint(URI);
        expect(await nft.tokenCount()).to.equal(1);
        expect(await nft.balanceOf(addr1.address)).to.equal(1);
        expect(await nft.tokenURI(1)).to.equal(URI);
        //addr2 mints an NFT
        await nft.connect(addr2).mint(URI);
        expect(await nft.tokenCount()).to.equal(2);
        expect(await nft.balanceOf(addr2.address)).to.equal(1);
        expect(await nft.tokenURI(2)).to.equal(URI);
      });
    });
    describe("Making marketplace items", () => {
      beforeEach(async () => {
        // addr1 mints an nft
        await nft.connect(addr1).mint(URI);
        //addr1 approves marketplace to spend nft
        await nft.connect(addr1).setApprovalForAll(marketplace.address, true);
      });

      it("Should track newly created item, transfer NFT from seller to Marketplace and emit Offered event", async () => {
        //addr offers their nft for 1 ether
        await expect(
          marketplace.connect(addr1).makeItem(nft.address, 1, toWei(1))
        )
          .to.emit(marketplace, "Offered")
          .withArgs(1, nft.address, 1, toWei(1), addr1.address);
        //owner of the nft should be the marketplace
        expect(await nft.ownerOf(1)).to.equal(marketplace.address);
        //itemcount should be 1 now
        expect(await marketplace.itemCount()).to.equal(1);
        //get item from items mapping then check fields to ensure they are correct
        const item = await marketplace.items(1);
        expect(item.itemId).to.equal(1);
        expect(item.nft).to.equal(nft.address);
        expect(item.tokenId).to.equal(1);
        expect(item.price).to.equal(toWei(1));
        expect(item.sold).to.equal(false);
      });
      it("Should fail if the price is set to zero", async () => {
        await expect(
          marketplace.connect(addr1).makeItem(nft.address, 1, 0)
        ).to.be.revertedWith("Price must be greater than 0");
      });
    });
  });
  describe("Purchasing marketplace items", () => {
    let price = 2;
    let fee = (feePercent / 100) * price;
    let totalPriceInWei;
    beforeEach(async function () {
      // addr1 mints an nft
      await nft.connect(addr1).mint(URI);
      // addr1 approves marketplace to spend tokens
      await nft.connect(addr1).setApprovalForAll(marketplace.address, true);
      // addr1 makes their nft a marketplace item.
      await marketplace.connect(addr1).makeItem(nft.address, 1, toWei(price));
    });
    it("Should update item as sold, pay seller, transfer NFT to buyer, charge fees and emit a Bought event", async () => {
      const sellerInitialEthBal = await addr1.getBalance();
      const feeAccountInitialEthBal = await deployer.getBalance();

      totalPriceInWei = await marketplace.getTotalPrice(1);

      //addr2 purchases item

      await expect(
        marketplace.connect(addr2).purchaseItem(1, { value: totalPriceInWei })
      )
        .to.emit(marketplace, "Bought ")
        .withArgs(
          1,
          nft.address,
          1,
          toWei(price),
          addr1.address,
          addr2.address
        );
      const sellerFinalEthBal = await addr1.getBalance();
      const feeAccountFinalEthBal = await deployer.getBalance();
      //seller should receive  payment for the price of the nft sold
      expect(+fromWei(sellerFinalEthBal)).to.equal(
        +price + +fromWei(sellerInitialEthBal)
      );
      //calculate the fee

      //feeAccount should  receive fee
      expect(+fromWei(feeAccountFinalEthBal)).to.equal(
        +fee + +fromWei(feeAccountInitialEthBal)
      );
      //the buyer should be the new owner
      expect(await nft.ownerOf(1)).to.equal(addr2.address);
      //item should be marked as sold
      expect((await marketplace.items(1)).sold).to.equal(true);
    });
    it("Should fail for invalid item ids, sold items and when not enough ether is paid", async function () {
      // fails for invalid item ids
      await expect(
        marketplace.connect(addr2).purchaseItem(2, { value: totalPriceInWei })
      ).to.be.revertedWith("item doesn't exist");
      await expect(
        marketplace.connect(addr2).purchaseItem(0, { value: totalPriceInWei })
      ).to.be.revertedWith("item doesn't exist");
      // Fails when not enough ether is paid with the transaction.
      // In this instance, fails when buyer only sends enough ether to cover the price of the nft
      // not the additional market fee.
      await expect(
        marketplace.connect(addr2).purchaseItem(1, { value: fromWei(1) })
      ).to.be.revertedWith(
        "not enough ether to cover item price and market fee"
      );
      await marketplace
        .connect(addr2)
        .purchaseItem(1, { value: totalPriceInWei });
      await expect(
        marketplace
          .connect(deployer)
          .purchaseItem(1, { value: totalPriceInWei })
      ).to.be.revertedWith("item already sold");
    });
  });
});
