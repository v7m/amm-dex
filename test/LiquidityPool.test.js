import { expect } from "chai";
import hardhat from 'hardhat';

const { ethers } = hardhat;

describe("LiquidityPool", () => {
  let LiquidityPool;
  let liquidityPool;
  let deployer;
  let user;
  let mockTokenA;
  let mockTokenB;
  let liquidityPoolFactory;

  const feeTier = 300; // 0.3%

  before(async () => {
    [deployer, user] = await ethers.getSigners();
  });

  beforeEach(async () => {
    // Deploy MockTokenA
    const MockTokenA = await ethers.getContractFactory("MockTokenA");
    mockTokenA = await MockTokenA.deploy();
    await mockTokenA.waitForDeployment();

    // Deploy MockTokenB
    const MockTokenB = await ethers.getContractFactory("MockTokenB");
    mockTokenB = await MockTokenB.deploy();
    await mockTokenB.waitForDeployment();

    // Deploy LiquidityPoolFactory
    const LiquidityPoolFactory = await ethers.getContractFactory("LiquidityPoolFactory");
    liquidityPoolFactory = await LiquidityPoolFactory.deploy();
    await liquidityPoolFactory.waitForDeployment();

    // Deploy LiquidityPool
    LiquidityPool = await ethers.getContractFactory("LiquidityPool");
    liquidityPool = await LiquidityPool.deploy(
      mockTokenA.target,
      mockTokenB.target,
      feeTier,
      liquidityPoolFactory.target
    );
    await liquidityPool.waitForDeployment();
  });

  describe("constructor", () => {
    it("sets the correct factory address", async () => {
      const factoryAddress = await liquidityPool.factory();
      expect(factoryAddress).to.equal(liquidityPoolFactory.target);
    });

    it("sets the correct fee tier", async () => {
      const currentFeeTier = await liquidityPool.feeTier();
      expect(currentFeeTier).to.equal(feeTier);
    });

    it("sets the correct token0 and token1 addresses", async () => {
      const token0 = await liquidityPool.token0();
      const token1 = await liquidityPool.token1();
      expect(token0).to.equal(mockTokenA.target);
      expect(token1).to.equal(mockTokenB.target);
    });
  });

  describe("addLiquidity", () => {
    beforeEach(async () => {
      await mockTokenA.approve(liquidityPool.target, ethers.parseEther("100"));
      await mockTokenB.approve(liquidityPool.target, ethers.parseEther("100"));
    });

    it("allows adding liquidity and mints LP tokens", async () => {
      // Check initial LP balance
      const initialLpBalance = await liquidityPool.balanceOf(deployer.address);
      expect(initialLpBalance).to.equal(0);

      // Check initial token balances
      const initialTokenABalance = await mockTokenA.balanceOf(deployer.address);
      const initialTokenBBalance = await mockTokenB.balanceOf(deployer.address);
      expect(initialTokenABalance).to.equal(ethers.parseEther("1000"));
      expect(initialTokenBBalance).to.equal(ethers.parseEther("2000"));

      // Add liquidity
      const tx = await liquidityPool.addLiquidity(
        ethers.parseEther("100"),
        ethers.parseEther("100")
      );
      await tx.wait();

      // Check reserves
      const reserve0 = await liquidityPool.reserve0();
      const reserve1 = await liquidityPool.reserve1();
      expect(reserve0).to.equal(ethers.parseEther("100"));
      expect(reserve1).to.equal(ethers.parseEther("100"));

      // Check LP balance
      const lpBalance = await liquidityPool.balanceOf(deployer.address);
      expect(lpBalance).to.equal(ethers.parseEther("100")); // Adjust according to LP token decimals

      // Check token balances
      const tokenABalance = await mockTokenA.balanceOf(deployer.address);
      const tokenBBalance = await mockTokenB.balanceOf(deployer.address);
      expect(tokenABalance).to.equal(ethers.parseEther("900")); // 1000 - 100
      expect(tokenBBalance).to.equal(ethers.parseEther("1900")); // 2000 - 100
    });

    it("prevents adding zero liquidity", async () => {
      await expect(
        liquidityPool.addLiquidity(0, 0)
      ).to.be.revertedWithCustomError(liquidityPool, "LiquidityPool__InsufficientLiquidityMinted")
        .withArgs(0, 1);
    });

    it("emits LiquidityAdded event on successful addition", async () => {
      await expect(liquidityPool.addLiquidity(ethers.parseEther("100"), ethers.parseEther("100")))
        .to.emit(liquidityPool, "LiquidityAdded")
        .withArgs(
          deployer.address,
          ethers.parseEther("100"),
          ethers.parseEther("100"),
          ethers.parseEther("100")
        );
    });
  });

  describe("removeLiquidity", () => {
    beforeEach(async () => {
      await mockTokenA.approve(liquidityPool.target, ethers.parseEther("100"));
      await mockTokenB.approve(liquidityPool.target, ethers.parseEther("100"));
      // Add initial liquidity
      await liquidityPool.addLiquidity(ethers.parseEther("100"), ethers.parseEther("100"));
    });

    it("allows removing liquidity and burns LP tokens", async () => {
      // Check initial LP balance
      const initialLpBalance = await liquidityPool.balanceOf(deployer.address);
      expect(initialLpBalance).to.equal(ethers.parseEther("100"));

      // Check initial token balances
      const initialTokenABalance = await mockTokenA.balanceOf(deployer.address);
      const initialTokenBBalance = await mockTokenB.balanceOf(deployer.address);
      expect(initialTokenABalance).to.equal(ethers.parseEther("900")); // 1000 - 100
      expect(initialTokenBBalance).to.equal(ethers.parseEther("1900")); // 2000 - 100

      // Remove liquidity
      const tx = await liquidityPool.removeLiquidity(ethers.parseEther("50"));
      await tx.wait();

      // Check reserves
      const reserve0 = await liquidityPool.reserve0();
      const reserve1 = await liquidityPool.reserve1();
      expect(reserve0).to.equal(ethers.parseEther("50"));
      expect(reserve1).to.equal(ethers.parseEther("50"));

      // Check LP balance
      const lpBalance = await liquidityPool.balanceOf(deployer.address);
      expect(lpBalance).to.equal(ethers.parseEther("50"));

      // Check token balances
      const tokenABalance = await mockTokenA.balanceOf(deployer.address);
      const tokenBBalance = await mockTokenB.balanceOf(deployer.address);
      expect(tokenABalance).to.equal(ethers.parseEther("950")); // 900 + 50
      expect(tokenBBalance).to.equal(ethers.parseEther("1950")); // 1900 + 50
    });

    it("prevents removing more liquidity than owned", async () => {
      await expect(
        liquidityPool.removeLiquidity(ethers.parseEther("150"))
      ).to.be.revertedWithCustomError(liquidityPool, "LiquidityPool__InsufficientLiquidity")
        .withArgs(ethers.parseEther("150"), ethers.parseEther("100"));
    });

    it("prevents removing zero liquidity", async () => {
      await expect(
        liquidityPool.removeLiquidity(0)
      ).to.be.revertedWithCustomError(liquidityPool, "LiquidityPool__InvalidLiquidityAmount")
        .withArgs(0);
    });

    it("emits LiquidityRemoved event on successful removal", async () => {
      await expect(liquidityPool.removeLiquidity(ethers.parseEther("50")))
        .to.emit(liquidityPool, "LiquidityRemoved")
        .withArgs(
          deployer.address,
          ethers.parseEther("50"),
          ethers.parseEther("50"),
          ethers.parseEther("50")
        );
    });
  });

  describe("swap", () => {
    beforeEach(async () => {
      await mockTokenA.approve(liquidityPool.target, ethers.parseEther("1000"));
      await mockTokenB.approve(liquidityPool.target, ethers.parseEther("1000"));
      // Add initial liquidity
      await liquidityPool.addLiquidity(ethers.parseEther("100"), ethers.parseEther("100"));
    });

    it("allows swapping token0 for token1", async () => {
      // Transfer tokens to user
      await mockTokenA.transfer(user.address, ethers.parseEther("10"));

      // Approve tokens for swapping
      await mockTokenA.connect(user).approve(liquidityPool.target, ethers.parseEther("10"));

      // Perform swap
      const amountIn = ethers.parseEther("10");
      const tx = await liquidityPool.connect(user).swap(amountIn, mockTokenA.target, mockTokenB.target);
      await tx.wait();

      // Calculate expected amountOut
      // x = 100 + 10 = 110
      // y = 100
      // feeTier = 300 (3%) => amountInWithFee = 10 * (10000 - 300) / 10000 = 9.7
      // amountOut = (9.7 * 100) / (100 + 9.7) = 970 / 109.7 ≈ 8.84
      const expectedAmountOut = ethers.parseEther("8.84");

      // Check token1 balance of user
      const userToken1Balance = await mockTokenB.balanceOf(user.address);
      expect(userToken1Balance).to.be.closeTo(expectedAmountOut, ethers.parseEther("0.01"));

      // Check reserves
      const reserve0 = await liquidityPool.reserve0();
      const reserve1 = await liquidityPool.reserve1();
      expect(reserve0).to.equal(ethers.parseEther("110")); // increased by 10
      expect(reserve1).to.be.closeTo(ethers.parseEther("91.16"), ethers.parseEther("0.01")); // decreased by ~8.84
    });

    it("allows swapping token1 for token0", async () => {
      // Transfer tokens to user
      await mockTokenB.transfer(user.address, ethers.parseEther("10"));
    
      // Approve tokens for swapping
      await mockTokenB.connect(user).approve(liquidityPool.target, ethers.parseEther("10"));
    
      // Perform swap
      const amountIn = ethers.parseEther("10");
      const tx = await liquidityPool.connect(user).swap(amountIn, mockTokenB.target, mockTokenA.target);
      await tx.wait();
    
      // Calculate expected amountOut
      // reserveIn = 100 (reserve1)
      // reserveOut = 100 (reserve0)
      // feeTier = 300 (3%) => amountInWithFee = 10 * 9700 / 10000 = 9.7
      // amountOut = (9.7 * 100) / (100 + 9.7) = 970 / 109.7 ≈ 8.84
      const expectedAmountOut = ethers.parseEther("8.84");
    
      // Check token0 balance of user
      const userToken0Balance = await mockTokenA.balanceOf(user.address);
      expect(userToken0Balance).to.be.closeTo(expectedAmountOut, ethers.parseEther("0.01"));
    
      // Check reserves
      const reserve0 = await liquidityPool.reserve0();
      const reserve1 = await liquidityPool.reserve1();
      expect(reserve0).to.be.closeTo(ethers.parseEther("91.16"), ethers.parseEther("0.01")); // decreased by ~8.84
      expect(reserve1).to.equal(ethers.parseEther("110")); // increased by 10
    });

    it("prevents swapping with insufficient output amount", async () => {
      // Transfer tokens to user and approve for swapping
      await mockTokenA.transfer(user.address, ethers.parseEther("10"));
      await mockTokenA.connect(user).approve(liquidityPool.target, ethers.parseEther("10"));

      // Attempt to swap a very small amount
      const amountIn = ethers.parseUnits("1", "wei");
      await expect(
        liquidityPool.connect(user).swap(amountIn, mockTokenA.target, mockTokenB.target)
      ).to.be.revertedWithCustomError(liquidityPool, "LiquidityPool__InsufficientOutputAmount")
        .withArgs(0, 1);
    });

    it("reverts when swapping with an invalid tokenIn address", async () => {
      // Transfer tokens to user and approve for swapping
      await mockTokenA.transfer(user.address, ethers.parseEther("10"));
      await mockTokenA.connect(user).approve(liquidityPool.target, ethers.parseEther("10"));

      await expect(
        liquidityPool.connect(user).swap(ethers.parseEther("10"), deployer.address, mockTokenB.target)
      ).to.be.revertedWithCustomError(liquidityPool, "LiquidityPool__InvalidTokenIn")
        .withArgs(deployer.address);
    });
    
    it("reverts when swapping with an invalid tokenOut address", async () => {
      // Transfer tokens to user and approve for swapping
      await mockTokenA.transfer(user.address, ethers.parseEther("10"));
      await mockTokenA.connect(user).approve(liquidityPool.target, ethers.parseEther("10"));

      await expect(
        liquidityPool.connect(user).swap(ethers.parseEther("10"), mockTokenA.target, deployer.address)
      ).to.be.revertedWithCustomError(liquidityPool, "LiquidityPool__InvalidTokenOut")
        .withArgs(deployer.address);
    });
    
    it("reverts when swapping identical tokens", async () => {
      // Transfer tokens to user and approve for swapping
      await mockTokenA.transfer(user.address, ethers.parseEther("10"));
      await mockTokenA.connect(user).approve(liquidityPool.target, ethers.parseEther("10"));

      await expect(
        liquidityPool.connect(user).swap(ethers.parseEther("10"), mockTokenA.target, mockTokenA.target)
      ).to.be.revertedWithCustomError(liquidityPool, "LiquidityPool__IdenticalTokens")
        .withArgs(mockTokenA.target, mockTokenA.target);
    });

    it("emits Swap event on successful swap", async () => {
      // Transfer tokens to user and approve for swapping
      await mockTokenA.transfer(user.address, ethers.parseEther("10"));
      await mockTokenA.connect(user).approve(liquidityPool.target, ethers.parseEther("10"));

      await expect(liquidityPool.connect(user).swap(ethers.parseEther("10"), mockTokenA.target, mockTokenB.target))
        .to.emit(liquidityPool, "Swap")
        .withArgs(
          user.address,
          ethers.parseEther("10"),
          ethers.parseEther("8.842297174111212397"),
          mockTokenA.target,
          mockTokenB.target
        );
    });
  });

  describe("feeTier", () => {
    it("returns the correct fee tier", async () => {
      const currentFeeTier = await liquidityPool.feeTier();
      expect(currentFeeTier).to.equal(feeTier);
    });
  });

  describe("factory", () => {
    it("returns the correct factory address", async () => {
      const factoryAddress = await liquidityPool.factory();
      expect(factoryAddress).to.equal(liquidityPoolFactory.target);
    });
  });
});
