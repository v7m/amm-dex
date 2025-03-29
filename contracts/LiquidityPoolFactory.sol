// SPDX-License-Identifier: MIT

pragma solidity ^0.8.28;

import "./LiquidityPool.sol";

/**
 * @title LiquidityPoolFactory
 * @dev Factory contract to create and manage LiquidityPool instances.
 */
contract LiquidityPoolFactory {
    address[] public liquidityPools;
    address public liquidityPositionNFTAddress;

    event LiquidityPoolCreated(address indexed pool, address token0, address token1, uint24 feeTier);

    /**
     * @dev Constructor for LiquidityPoolFactory.
     * @param _liquidityPositionNFTAddress The address of the deployed LiquidityPositionNFT contract.
     */
    constructor(address _liquidityPositionNFTAddress) {
        liquidityPositionNFTAddress = _liquidityPositionNFTAddress;
    }

    /**
     * @dev Creates a new LiquidityPool for the given tokens and fee tier.
     * @param token0 Address of the first token.
     * @param token1 Address of the second token.
     * @param feeTier Fee tier for the pool.
     * @return pool Address of the newly created LiquidityPool.
     */
    function createLiquidityPool(address token0, address token1, uint24 feeTier) external returns (address pool) {
        LiquidityPool liquidityPool = new LiquidityPool(token0, token1, feeTier, address(this), liquidityPositionNFTAddress);
        
        // Keep track of the newly created pool in an array
        liquidityPools.push(address(liquidityPool));

        // Grant POOL_ROLE to the new liquidity pool in the NFT contract.
        LiquidityPositionNFT(liquidityPositionNFTAddress).grantPoolRole(address(liquidityPool));

        emit LiquidityPoolCreated(address(liquidityPool), token0, token1, feeTier);

        return address(liquidityPool);
    }

    /**
     * @dev Returns the total number of created pools.
     * @return The count of LiquidityPool instances created.
     */
    function getPoolsCount() external view returns (uint256) {
        return liquidityPools.length;
    }
}
