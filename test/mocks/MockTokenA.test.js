import { expect } from "chai";
import hardhat from 'hardhat';

const { ethers } = hardhat;

describe("MockTokenA", () => {
  let mockTokenA;
  let deployer;
  let deployerAddress;

  before(async () => {
    [deployer] = await ethers.getSigners();
    deployerAddress = await deployer.getAddress();
  });

  beforeEach(async () => {
    // Deploy MockTokenA contract
    const MockTokenA = await ethers.getContractFactory("MockTokenA");
    mockTokenA = await MockTokenA.deploy();
    await mockTokenA.waitForDeployment();
  });

  describe("constructor", () => {
    it("initializes with correct name, symbol, and initial supply", async () => {
      const name = await mockTokenA.name();
      const symbol = await mockTokenA.symbol();
      const balance = await mockTokenA.balanceOf(deployerAddress);
      const totalSupply = await mockTokenA.totalSupply();

      expect(name).to.equal("Mock Token A");
      expect(symbol).to.equal("MTA");
      expect(balance).to.equal(ethers.parseUnits("1000", 18));
      expect(totalSupply).to.equal(ethers.parseUnits("1000", 18));
    });
  });

  describe("mint", () => {
    it("mints additional tokens", async () => {
      await mockTokenA.mint(deployerAddress, ethers.parseUnits("500", 18));

      const newBalance = await mockTokenA.balanceOf(deployerAddress);
      const newTotalSupply = await mockTokenA.totalSupply();

      expect(newBalance).to.equal(ethers.parseUnits("1500", 18));
      expect(newTotalSupply).to.equal(ethers.parseUnits("1500", 18));
    });
  });
});
