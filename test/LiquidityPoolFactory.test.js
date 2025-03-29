import { expect } from "chai";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs.js";
import hardhat from 'hardhat';

const { ethers } = hardhat;

describe("LiquidityPoolFactory", () => {
  let LiquidityPoolFactory;
  let liquidityPoolFactory
  let LiquidityPositionNFT;
  let liquidityPositionNFT;
  let factory;
  let deployer;
  let mockTokenA;
  let mockTokenB;

  const feeTier = 300; // 0.3%

  before(async () => {
    [deployer] = await ethers.getSigners();
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

    // Deploy LiquidityPoolFactory
    const LiquidityPoolFactory = await ethers.getContractFactory("LiquidityPoolFactory");
    liquidityPoolFactory = await LiquidityPoolFactory.deploy(liquidityPositionNFT.target);
    await liquidityPoolFactory.waitForDeployment();

    // Grant POOL_FACTORY_ROLE to LiquidityPoolFactory
    await liquidityPositionNFT.grantPoolFactoryRole(liquidityPoolFactory.target);
  });

  describe("createLiquidityPool", () => {
    it("stores the new pool in liquidityPools array", async () => {
      const tx = await liquidityPoolFactory.createLiquidityPool(mockTokenA.target, mockTokenB.target, feeTier);
      const receipt = await tx.wait();

      // Retrieve pool address from the event
      const event = receipt.logs.find((log) => log.fragment && log.fragment.name === "LiquidityPoolCreated");
      const poolAddress = event.args.pool;

      // Check LiquidityPoolFactory's liquidityPools array
      const poolCount = await liquidityPoolFactory.getPoolsCount();
      expect(poolCount).to.equal(1n);

      const storedPoolAddress = await liquidityPoolFactory.liquidityPools(0);
      expect(storedPoolAddress).to.equal(poolAddress);
    });

    it("grants the liquidity pool the POOL_ROLE", async () => {
      const tx = await liquidityPoolFactory.createLiquidityPool(mockTokenA.target, mockTokenB.target, feeTier);
      const receipt = await tx.wait();

      // Retrieve pool address from the event
      const event = receipt.logs.find((log) => log.fragment && log.fragment.name === "LiquidityPoolCreated");
      const poolAddress = event.args.pool;

      // Check if the pool has the POOL_ROLE
      const hasPoolRole = await liquidityPositionNFT.hasRole(
        ethers.keccak256(ethers.toUtf8Bytes("POOL_ROLE")), 
        poolAddress
      );

      expect(hasPoolRole).to.be.true;
    });

    it("emits LiquidityPoolCreated event", async () => {
      await expect(liquidityPoolFactory.createLiquidityPool(mockTokenA.target, mockTokenB.target, feeTier))
        .to.emit(liquidityPoolFactory, "LiquidityPoolCreated")
        .withArgs(
          anyValue, // pool address
          mockTokenA.target,
          mockTokenB.target,
          feeTier
        );
    });
  });

  describe("getPoolsCount", () => {
    it("returns the correct number of created pools", async () => {
      // Initially, no pools
      let poolCount = await liquidityPoolFactory.getPoolsCount();
      expect(poolCount).to.equal(0n);

      // Create one pool
      await liquidityPoolFactory.createLiquidityPool(mockTokenA.target, mockTokenB.target, 3000);
      poolCount = await liquidityPoolFactory.getPoolsCount();
      expect(poolCount).to.equal(1n);

      // Create another pool
      await liquidityPoolFactory.createLiquidityPool(mockTokenA.target, mockTokenB.target, 500);
      poolCount = await liquidityPoolFactory.getPoolsCount();
      expect(poolCount).to.equal(2n);
    });
  });
});
