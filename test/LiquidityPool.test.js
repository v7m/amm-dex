import { expect } from "chai";
import hardhat from 'hardhat';

const { ethers } = hardhat;

describe("LiquidityPool", () => {
  let liquidityPoolFactory;
  let liquidityPool;
  let LiquidityPositionNFT;
  let liquidityPositionNFT;
  let deployer;
  let user;
  let mockTokenA;
  let mockTokenB;

  const feeTier = 300; // 0.3%
  const TICK_LOWER = -100;
  const TICK_UPPER = 100;

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

    // Deploy LiquidityPoolFactory
    const LiquidityPoolFactory = await ethers.getContractFactory("LiquidityPoolFactory");
    liquidityPoolFactory = await LiquidityPoolFactory.deploy(liquidityPositionNFT.target);
    await liquidityPoolFactory.waitForDeployment();

    // Grant POOL_FACTORY_ROLE to LiquidityPoolFactory
    await liquidityPositionNFT.grantPoolFactoryRole(liquidityPoolFactory.target);

    // Create a new liquidity pool
    const createLiquidityPoolTx = await liquidityPoolFactory.createLiquidityPool(mockTokenA.target, mockTokenB.target, feeTier);

    const receipt = await createLiquidityPoolTx.wait();
    const logs = receipt.logs;

    // Find the PoolCreated event log
    const poolCreatedLog = logs.find((log) => {
      try {
        return liquidityPoolFactory.interface.parseLog(log).name === "LiquidityPoolCreated";
      } catch (err) {
        return false;
      }
    });

    if (!poolCreatedLog) throw new Error("LiquidityPoolCreated event not found");

    const parsedEvent = liquidityPoolFactory.interface.parseLog(poolCreatedLog);
    const liquidityPoolAddress = parsedEvent.args.pool;

    liquidityPool = await ethers.getContractAt("LiquidityPool", liquidityPoolAddress);
  });

  describe("constructor", () => {
    it("sets the correct liquidity pool factory address", async () => {
      const poolFactoryAddress = await liquidityPool.liquidityPoolFactoryAddress();
      expect(poolFactoryAddress).to.equal(liquidityPoolFactory.target);
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
        ethers.parseEther("100"),
        TICK_LOWER,
        TICK_UPPER
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
        liquidityPool.addLiquidity(0, 0, TICK_LOWER, TICK_UPPER)
      ).to.be.revertedWithCustomError(liquidityPool, "LiquidityPool__InsufficientLiquidityMinted")
        .withArgs(0, 1);
    });

    it("mints a new position NFT token on successful addition", async () => {
      // Check NFT balance
      const nftBalance = await liquidityPositionNFT.balanceOf(deployer.address);
      expect(nftBalance).to.equal(0);

      // Add liquidity
      const tx = await liquidityPool.addLiquidity(ethers.parseEther("100"), ethers.parseEther("100"), TICK_LOWER, TICK_UPPER);
      await tx.wait();

      // Check NFT balance
      const newNftBalance = await liquidityPositionNFT.balanceOf(deployer.address);
      expect(newNftBalance).to.equal(1);
    });

    it("emits LiquidityAdded event on successful addition", async () => {
      await expect(liquidityPool.addLiquidity(ethers.parseEther("100"), ethers.parseEther("100"), TICK_LOWER, TICK_UPPER))
        .to.emit(liquidityPool, "LiquidityAdded")
        .withArgs(
          deployer.address,
          ethers.parseEther("100"),
          ethers.parseEther("100"),
          ethers.parseEther("100"),
          TICK_LOWER,
          TICK_UPPER,
          0
        );
    });
  });

  describe("removeLiquidity", () => {
    let nftTokenId;

    beforeEach(async () => {
      await mockTokenA.approve(liquidityPool.target, ethers.parseEther("100"));
      await mockTokenB.approve(liquidityPool.target, ethers.parseEther("100"));

      // Add initial liquidity
      const addLiquidityTx = await liquidityPool.addLiquidity(ethers.parseEther("100"), ethers.parseEther("100"), TICK_LOWER, TICK_UPPER);

      const receipt = await addLiquidityTx.wait();
      
      const parsedLogs = receipt.logs
        .map(log => {
          try {
            return liquidityPool.interface.parseLog(log);
          } catch (err) {
            return null;
          }
        })
        .filter(Boolean); // remove any logs not from liquidityPool

      const event = parsedLogs.find(e => e.name === "LiquidityAdded");
      if (!event) throw new Error("LiquidityAdded event not found");

      nftTokenId = event.args.nftTokenId; // Extract nftTokenId from LiquidityAdded event

      await liquidityPositionNFT.setApprovalForAll(await liquidityPool.getAddress(), true);
    });

    it("allows removing liquidity and burns LP tokens", async () => {
      // Check initial LP balance
      const initialLpBalance = await liquidityPool.balanceOf(deployer.address);
      expect(initialLpBalance).to.equal(ethers.parseEther("100"));

      // Check initial reserves
      const initialReserve0 = await liquidityPool.reserve0();
      const initialReserve1 = await liquidityPool.reserve1();
      expect(initialReserve0).to.equal(ethers.parseEther("100"));
      expect(initialReserve1).to.equal(ethers.parseEther("100"));

      // Check initial token balances
      const initialTokenABalance = await mockTokenA.balanceOf(deployer.address);
      const initialTokenBBalance = await mockTokenB.balanceOf(deployer.address);
      expect(initialTokenABalance).to.equal(ethers.parseEther("900")); // 1000 - 100
      expect(initialTokenBBalance).to.equal(ethers.parseEther("1900")); // 2000 - 100

      // Remove liquidity
      const tx = await liquidityPool.removeLiquidity(nftTokenId);
      await tx.wait();

      // Check LP balance
      const lpBalance = await liquidityPool.balanceOf(deployer.address);
      expect(lpBalance).to.equal(0);

      // Check reserves
      const reserve0 = await liquidityPool.reserve0();
      const reserve1 = await liquidityPool.reserve1();
      expect(reserve0).to.equal(0);
      expect(reserve1).to.equal(0);

      // Check token balances
      const tokenABalance = await mockTokenA.balanceOf(deployer.address);
      const tokenBBalance = await mockTokenB.balanceOf(deployer.address);
      expect(tokenABalance).to.equal(ethers.parseEther("1000"));
      expect(tokenBBalance).to.equal(ethers.parseEther("2000"));
    });

    it("burns position NFT token on successful removal", async () => {
      // Check NFT owner
      expect(await liquidityPositionNFT.ownerOf(nftTokenId)).to.equal(deployer.address);

      // Remove liquidity
      const tx = await liquidityPool.removeLiquidity(nftTokenId);
      await tx.wait();

      // Check NFT owner
      await expect(liquidityPositionNFT.ownerOf(nftTokenId))
        .to.be.revertedWithCustomError(liquidityPositionNFT, "ERC721NonexistentToken");

      // Check NFT balance
      const nftBalance = await liquidityPositionNFT.balanceOf(deployer.address);
      expect(nftBalance).to.equal(0);
    });

    it("emits LiquidityRemoved event on successful removal", async () => {
      await expect(liquidityPool.removeLiquidity(nftTokenId))
        .to.emit(liquidityPool, "LiquidityRemoved")
        .withArgs(
          deployer.address,
          ethers.parseEther("100"),
          ethers.parseEther("100"),
          ethers.parseEther("100"),
          nftTokenId
        );
    });
  });

  describe("swap", () => {
    beforeEach(async () => {
      await mockTokenA.approve(liquidityPool.target, ethers.parseEther("1000"));
      await mockTokenB.approve(liquidityPool.target, ethers.parseEther("1000"));
      // Add initial liquidity
      await liquidityPool.addLiquidity(ethers.parseEther("100"), ethers.parseEther("100"), TICK_LOWER, TICK_UPPER);
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

  describe("liquidityPoolFactoryAddress", () => {
    it("returns the correct liquidity pool factory address", async () => {
      const poolFactoryAddress = await liquidityPool.liquidityPoolFactoryAddress();
      expect(poolFactoryAddress).to.equal(liquidityPoolFactory.target);
    });
  });
});
