import { expect } from 'chai';
import hardhat from 'hardhat';

const { ethers } = hardhat;

describe("Mock Tokens", function () {
    let tokenA;
    let tokenB;
    let deployer;

    before(async function () {
        [deployer] = await ethers.getSigners();
    });

    beforeEach(async function () {
        const TokenA = await ethers.getContractFactory("MockTokenA");
        tokenA = await TokenA.deploy();
        await tokenA.waitForDeployment();

        const TokenB = await ethers.getContractFactory("MockTokenB");
        tokenB = await TokenB.deploy();
        await tokenB.waitForDeployment();
    });

    it("updates balances after initial mint in constructor", async () => {
        const balanceA = await tokenA.balanceOf(deployer.address);
        const balanceB = await tokenB.balanceOf(deployer.address);

        // Check if the constructor automatically minted the correct amounts
        expect(balanceA).to.equal(ethers.parseUnits("1000", 18));
        expect(balanceB).to.equal(ethers.parseUnits("2000", 18));
    });

    it("updates totalSupply and balances after mint()", async () => {
        // Mint additional tokens for MockTokenA
        await tokenA.mint(deployer.address, ethers.parseUnits("500", 18));

        const newBalanceA = await tokenA.balanceOf(deployer.address);
        const newTotalSupplyA = await tokenA.totalSupply();

        expect(newBalanceA).to.equal(ethers.parseUnits("1500", 18));
        expect(newTotalSupplyA).to.equal(ethers.parseUnits("1500", 18));

        // Mint additional tokens for MockTokenB
        await tokenB.mint(deployer.address, ethers.parseUnits("300", 18));

        const newBalanceB = await tokenB.balanceOf(deployer.address);
        const newTotalSupplyB = await tokenB.totalSupply();

        expect(newBalanceB).to.equal(ethers.parseUnits("2300", 18));
        expect(newTotalSupplyB).to.equal(ethers.parseUnits("2300", 18));
    });
});
