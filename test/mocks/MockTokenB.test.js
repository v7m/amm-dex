import { expect } from "chai";
import hardhat from 'hardhat';

const { ethers } = hardhat;

describe("MockTokenB", () => {
  let mockTokenB;
  let deployer;
  let deployerAddress;

  before(async () => {
    [deployer] = await ethers.getSigners();
    deployerAddress = await deployer.getAddress();
  });

  beforeEach(async () => {
    // Deploy MockTokenB contract
    const MockTokenB = await ethers.getContractFactory("MockTokenB");
    mockTokenB = await MockTokenB.deploy();
    await mockTokenB.waitForDeployment();
  });

  describe("constructor", () => {
    it("initializes with correct name, symbol, and initial supply", async () => {
      const name = await mockTokenB.name();
      const symbol = await mockTokenB.symbol();
      const balance = await mockTokenB.balanceOf(deployerAddress);
      const totalSupply = await mockTokenB.totalSupply();

      expect(name).to.equal("Mock Token B");
      expect(symbol).to.equal("MTB");
      expect(balance).to.equal(ethers.parseUnits("2000", 18));
      expect(totalSupply).to.equal(ethers.parseUnits("2000", 18));
    });
  });

  describe("mint", () => {
    it("mints additional tokens", async () => {
      await mockTokenB.mint(deployerAddress, ethers.parseUnits("500", 18));

      const newBalance = await mockTokenB.balanceOf(deployerAddress);
      const newTotalSupply = await mockTokenB.totalSupply();

      expect(newBalance).to.equal(ethers.parseUnits("2500", 18));
      expect(newTotalSupply).to.equal(ethers.parseUnits("2500", 18));
    });
  });
});
