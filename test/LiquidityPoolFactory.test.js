import { expect } from "chai";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs.js";
import hardhat from 'hardhat';

const { ethers } = hardhat;

describe("LiquidityPoolFactory", () => {
  let LiquidityPoolFactory;
  let factory;
  let deployer;
  let tokenA;
  let tokenB;

  before(async () => {
    [deployer] = await ethers.getSigners();
  });

  beforeEach(async () => {
    // Deploy MockTokenA and MockTokenB
    const TokenA = await ethers.getContractFactory("MockTokenA");
    tokenA = await TokenA.deploy();
    await tokenA.waitForDeployment();

    const TokenB = await ethers.getContractFactory("MockTokenB");
    tokenB = await TokenB.deploy();
    await tokenB.waitForDeployment();

    // Deploy LiquidityPoolFactory
    LiquidityPoolFactory = await ethers.getContractFactory("LiquidityPoolFactory");
    factory = await LiquidityPoolFactory.deploy();
    await factory.waitForDeployment();
  });

  describe("createPool", () => {
    it("emits LiquidityPoolFactory__PoolCreated event", async () => {
      const feeTier = 3000; // 0.3%
      await expect(factory.createPool(tokenA.target, tokenB.target, feeTier))
        .to.emit(factory, "LiquidityPoolFactory__PoolCreated")
        .withArgs(
          anyValue, // pool address
          tokenA.target,
          tokenB.target,
          feeTier
        );
    });

    it("stores the new pool in allPools array", async () => {
      const feeTier = 3000; // 0.3%
      const tx = await factory.createPool(tokenA.target, tokenB.target, feeTier);
      const receipt = await tx.wait();

      // Retrieve pool address from the event
      const event = receipt.logs.find(
        (log) => log.fragment && log.fragment.name === "LiquidityPoolFactory__PoolCreated"
      );
      const poolAddress = event.args.pool;

      // Check LiquidityPoolFactory's allPools array
      const poolCount = await factory.getPoolsCount();
      expect(poolCount).to.equal(1n);

      const storedPoolAddress = await factory.allPools(0);
      expect(storedPoolAddress).to.equal(poolAddress);
    });
  });

  describe("getPoolsCount", () => {
    it("returns the correct number of created pools", async () => {
      // Initially, no pools
      let poolCount = await factory.getPoolsCount();
      expect(poolCount).to.equal(0n);

      // Create one pool
      await factory.createPool(tokenA.target, tokenB.target, 3000);
      poolCount = await factory.getPoolsCount();
      expect(poolCount).to.equal(1n);

      // Create another pool
      await factory.createPool(tokenA.target, tokenB.target, 500);
      poolCount = await factory.getPoolsCount();
      expect(poolCount).to.equal(2n);
    });
  });
});
