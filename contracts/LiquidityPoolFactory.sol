// SPDX-License-Identifier: MIT

pragma solidity ^0.8.28;

import "./LiquidityPool.sol";

/**
 * @title LiquidityPoolFactory
 * @dev Basic stub for a factory that creates LiquidityPool instances.
 */
contract LiquidityPoolFactory {
    address[] public allPools;

    event LiquidityPoolFactory__PoolCreated(address indexed pool, address token0, address token1, uint24 feeTier);

    /**
     * @dev Creates a new LiquidityPool for the given tokens and fee tier.
     */
    function createPool(address token0, address token1, uint24 feeTier) external returns (address pool) {
        LiquidityPool newPool = new LiquidityPool(token0, token1, feeTier, address(this));
        allPools.push(address(newPool));

        emit LiquidityPoolFactory__PoolCreated(address(newPool), token0, token1, feeTier);

        return address(newPool);
    }

    /**
     * @dev Returns the total number of created pools.
     */
    function getPoolsCount() external view returns (uint256) {
        return allPools.length;
    }
}
