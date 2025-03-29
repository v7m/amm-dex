import { expect } from "chai";
import hardhat from 'hardhat';

const { ethers } = hardhat;

describe("LiquidityPositionNFT", () => {
  let LiquidityPositionNFT;
  let liquidityPositionNFT;
  let deployer, user;
  let mockTokenA, mockTokenB;

  before(async () => {
    [deployer, user] = await ethers.getSigners();
  });

  beforeEach(async () => {
    // Deploy MockTokenA with 1000 initial tokens
    const MockTokenA = await ethers.getContractFactory("MockTokenA");
    mockTokenA = await MockTokenA.deploy();
    await mockTokenA.waitForDeployment();

    // Deploy MockTokenB with 2000 initial tokens
    const MockTokenB = await ethers.getContractFactory("MockTokenB");
    mockTokenB = await MockTokenB.deploy();
    await mockTokenB.waitForDeployment();

    // Deploy LiquidityPositionNFT contract
    LiquidityPositionNFT = await ethers.getContractFactory("LiquidityPositionNFT");
    liquidityPositionNFT = await LiquidityPositionNFT.deploy();
    await liquidityPositionNFT.waitForDeployment();

    // Grant POOL_FACTORY_ROLE to deployer for testing purpose
    await liquidityPositionNFT.grantPoolFactoryRole(deployer.address);

    // Grant POOL_ROLE to deployer for testing purpose
    await liquidityPositionNFT.grantPoolRole(deployer.address);
  });

  describe("mint", () => {
    it("mints a new liquidity position NFT", async () => {
      const liquidity = ethers.parseEther("1000");
      const tx = await liquidityPositionNFT.mint(user.address, mockTokenA.target, mockTokenB.target, liquidity, -100, 100);
      await tx.wait();

      expect(await liquidityPositionNFT.ownerOf(0)).to.equal(user.address);

      const position = await liquidityPositionNFT.getPosition(0);

      expect(position.owner).to.equal(user.address);
      expect(position.token0).to.equal(mockTokenA.target);
      expect(position.token1).to.equal(mockTokenB.target);
      expect(position.liquidity).to.equal(liquidity);
      expect(position.lowerTick).to.equal(-100);
      expect(position.upperTick).to.equal(100);
    });

    it("returns the correct next token ID", async () => {
      expect(await liquidityPositionNFT.nextTokenId()).to.equal(0);
      await liquidityPositionNFT.mint(user.address, mockTokenA.target, mockTokenB.target, ethers.parseEther("1000"), -100, 100);
      expect(await liquidityPositionNFT.nextTokenId()).to.equal(1);
    });

    it("emits Minted event when a new liquidity position NFT is minted", async () => {
      const liquidity = ethers.parseEther("1000");

      await expect(
        liquidityPositionNFT.mint(user.address, mockTokenA.target, mockTokenB.target, liquidity, -100, 100)
      ).to.emit(liquidityPositionNFT, "Minted")
        .withArgs(user.address, 0, mockTokenA.target, mockTokenB.target, liquidity, -100, 100);
    });
  });

  describe("burn", () => {
    let tokenId;
    
    beforeEach(async () => {
      // Mint an NFT position to user
      const liquidity = ethers.parseEther("1000");
      const tx = await liquidityPositionNFT.mint(user.address, mockTokenA.target, mockTokenB.target, liquidity, -100, 100);
      const receipt = await tx.wait();

      const event = receipt.logs.find((log) => log.fragment && log.fragment.name === "Minted");
      tokenId = event.args.tokenId;
    });

    it("burns position NFT token on successful removal", async () => {
      // Grant POOL_ROLE to user for testing purpose
      await liquidityPositionNFT.grantPoolRole(user.address);

      // Verify that the NFT exists and its owner is 'user'.
      const owner = await liquidityPositionNFT.ownerOf(tokenId);
      expect(owner).to.equal(user.address);

      await liquidityPositionNFT.connect(user).burn(tokenId);

      // Check NFT owner
      await expect(liquidityPositionNFT.ownerOf(tokenId))
        .to.be.revertedWithCustomError(liquidityPositionNFT, "ERC721NonexistentToken");

      // Check NFT balance
      const nftBalance = await liquidityPositionNFT.balanceOf(deployer.address);
      expect(nftBalance).to.equal(0);
    });

    it("reverts burn if token does not exist", async () => {
      // Grant POOL_ROLE to user for testing purpose
      await liquidityPositionNFT.grantPoolRole(user.address);

      // Attempting to burn a non-existent token should revert.
      await expect(liquidityPositionNFT.connect(user).burn(9999))
        .to.be.revertedWithCustomError(liquidityPositionNFT, "ERC721NonexistentToken")
        .withArgs(9999);
    });

    it("reverts burn if called by an account without POOL_ROLE", async () => {
      // Attempt to call burn from an account without POOL_ROLE (e.g., 'user') should revert.
      await expect(liquidityPositionNFT.connect(user).burn(tokenId))
        .to.be.revertedWithCustomError(liquidityPositionNFT, "AccessControlUnauthorizedAccount");
    });
  });

  describe("transferFrom", () => {
    it("prevents NFT transfers", async () => {
      const liquidity = ethers.parseEther("1000");

      await liquidityPositionNFT.mint(user.address, mockTokenA.target, mockTokenB.target, liquidity, -100, 100);

      await expect(
        liquidityPositionNFT.connect(user).transferFrom(user.address, deployer.address, 0)
      ).to.be.revertedWithCustomError(liquidityPositionNFT, "LiquidityPositionNFT__TransfersNotAllowed")
        .withArgs(user.address, deployer.address, 0);
    });
  });

  describe("getPosition", () => {
    it("reverts when retrieving a non-existent position", async () => {
      await expect(liquidityPositionNFT.getPosition(999))
        .to.be.revertedWithCustomError(liquidityPositionNFT, "LiquidityPositionNFT__PositionDoesNotExist")
        .withArgs(999);
    });
  });

  describe("nextTokenId", () => {
    it("returns the correct token ID before and after minting", async () => {
      expect(await liquidityPositionNFT.nextTokenId()).to.equal(0);
      await liquidityPositionNFT.mint(user.address, mockTokenA.target, mockTokenB.target, ethers.parseEther("1000"), -100, 100);
      expect(await liquidityPositionNFT.nextTokenId()).to.equal(1);
    });
  });
});
