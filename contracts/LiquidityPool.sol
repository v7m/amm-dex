// SPDX-License-Identifier: MIT

pragma solidity ^0.8.28;

/**
 * @title LiquidityPool
 * @dev Basic stub for an AMM pool with minimal storage for token addresses and a fee tier.
 */
contract LiquidityPool {
    address public factory;
    address public token0;
    address public token1;
    uint24 public feeTier;

    constructor(address _token0, address _token1, uint24 _feeTier, address _factory) {
        token0 = _token0;
        token1 = _token1;
        feeTier = _feeTier;
        factory = _factory;
    }
}
