// SPDX-License-Identifier: MIT

pragma solidity ^0.8.28;

import "./LiquidityPool.sol";

/**
 * @title LiquidityPoolFactory
 * @dev Factory contract to create and manage LiquidityPool instances.
 */
contract LiquidityPoolFactory {
    address[] public allPools;

    event LiquidityPoolFactory__PoolCreated(address indexed pool, address token0, address token1, uint24 feeTier);

    /**
     * @dev Creates a new LiquidityPool for the given tokens and fee tier.
     * @param token0 Address of the first token.
     * @param token1 Address of the second token.
     * @param feeTier Fee tier for the pool.
     * @return pool Address of the newly created LiquidityPool.
     */
    function createPool(address token0, address token1, uint24 feeTier) external returns (address pool) {
        LiquidityPool newPool = new LiquidityPool(token0, token1, feeTier, address(this));
        
        // Keep track of the newly created pool in an array
        allPools.push(address(newPool));

        emit LiquidityPoolFactory__PoolCreated(address(newPool), token0, token1, feeTier);

        return address(newPool);
    }

    /**
     * @dev Returns the total number of created pools.
     * @return The count of LiquidityPool instances created.
     */
    function getPoolsCount() external view returns (uint256) {
        return allPools.length;
    }
}
