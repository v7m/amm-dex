import { expect } from "chai";
import hardhat from 'hardhat';

const { ethers } = hardhat;

describe("LiquidityPool", () => {
  let LiquidityPool;
  let pool;
  let deployer;
  let tokenA;
  let tokenB;
  let factory;

  const feeTier = 3000; // 0.3%

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

    // Deploy LiquidityPoolFactory to obtain factory address
    const LiquidityPoolFactory = await ethers.getContractFactory("LiquidityPoolFactory");
    factory = await LiquidityPoolFactory.deploy();
    await factory.waitForDeployment();

    // Deploy LiquidityPool directly for testing purposes
    LiquidityPool = await ethers.getContractFactory("LiquidityPool");
    pool = await LiquidityPool.deploy(tokenA.target, tokenB.target, feeTier, factory.target);
    await pool.waitForDeployment();
  });

  describe("constructor", () => {
    it("sets the correct factory address", async () => {
      const actualFactory = await pool.factory();
      expect(actualFactory).to.equal(factory.target);
    });

    it("sets the correct token0 and token1 addresses", async () => {
      const actualToken0 = await pool.token0();
      const actualToken1 = await pool.token1();
      expect(actualToken0).to.equal(tokenA.target);
      expect(actualToken1).to.equal(tokenB.target);
    });

    it("sets the correct fee tier", async () => {
      const actualFeeTier = await pool.feeTier();
      expect(actualFeeTier).to.equal(feeTier);
    });
  });
});
