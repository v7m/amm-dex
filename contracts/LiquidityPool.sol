// SPDX-License-Identifier: MIT

pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title LiquidityPool
 * @dev AMM liquidity pool with swap and liquidity management functionalities.
 */
contract LiquidityPool is ERC20 {
    error LiquidityPool__InsufficientLiquidityMinted(uint256 liquidity, uint256 required);
    error LiquidityPool__InvalidLiquidityAmount(uint256 liquidity);
    error LiquidityPool__InsufficientLiquidity(uint256 requested, uint256 available);
    error LiquidityPool__InsufficientWithdrawalAmount(uint256 liquidity);
    error LiquidityPool__InvalidTokenIn(address tokenIn);
    error LiquidityPool__InvalidTokenOut(address tokenOut);
    error LiquidityPool__IdenticalTokens(address tokenIn, address tokenOut);
    error LiquidityPool__InsufficientOutputAmount(uint256 amountOut, uint256 required);

    IERC20 public token0;
    IERC20 public token1;
    uint24 public feeTier; // Fee in basis points (e.g., 300 for 3%)
    uint256 public reserve0;
    uint256 public reserve1;
    address public factory;

    event LiquidityAdded(address indexed user, uint256 amount0, uint256 amount1, uint256 liquidity);
    event LiquidityRemoved(address indexed user, uint256 amount0, uint256 amount1, uint256 liquidity);
    event Swap(address indexed user, uint256 amountIn, uint256 amountOut, address tokenIn, address tokenOut);

    /**
     * @dev Constructor that sets the initial state of the pool.
     * @param _token0 Address of the first token.
     * @param _token1 Address of the second token.
     * @param _feeTier Fee tier for the pool.
     * @param _factory Address of the factory contract that created this pool.
     */
    constructor(address _token0, address _token1, uint24 _feeTier, address _factory)
        ERC20("LP Token", "LPT")
    {
        token0 = IERC20(_token0);
        token1 = IERC20(_token1);
        feeTier = _feeTier;
        factory = _factory;
    }

    /**
     * @dev Adds liquidity to the pool.
     * @param amount0 Desired amount of token0 to add.
     * @param amount1 Desired amount of token1 to add.
     * @return liquidity Amount of LP tokens minted.
     */
    function addLiquidity(uint256 amount0, uint256 amount1) external returns (uint256 liquidity) {
        if (totalSupply() == 0) {
            liquidity = Math.sqrt(amount0 * amount1);
            if (liquidity <= 0) revert LiquidityPool__InsufficientLiquidityMinted(liquidity, 1);
        } else {
            liquidity = Math.min((amount0 * totalSupply()) / reserve0, (amount1 * totalSupply()) / reserve1);
            if (liquidity <= 0) revert LiquidityPool__InsufficientLiquidityMinted(liquidity, 1);
        }

        token0.transferFrom(msg.sender, address(this), amount0);
        token1.transferFrom(msg.sender, address(this), amount1);

        reserve0 += amount0;
        reserve1 += amount1;

        _mint(msg.sender, liquidity);

        emit LiquidityAdded(msg.sender, amount0, amount1, liquidity);
    }

    /**
     * @dev Removes liquidity from the pool.
     * @param liquidity Amount of LP tokens to burn.
     * @return amount0 Amount of token0 returned.
     * @return amount1 Amount of token1 returned.
     */
    function removeLiquidity(uint256 liquidity) external returns (uint256 amount0, uint256 amount1) {
        if (liquidity <= 0) revert LiquidityPool__InvalidLiquidityAmount(liquidity);

        uint256 userBalance = balanceOf(msg.sender);

        if (liquidity > userBalance) revert LiquidityPool__InsufficientLiquidity(liquidity, userBalance);

        amount0 = (liquidity * reserve0) / totalSupply();
        amount1 = (liquidity * reserve1) / totalSupply();

        if (amount0 == 0 || amount1 == 0) revert LiquidityPool__InsufficientWithdrawalAmount(liquidity);

        _burn(msg.sender, liquidity);

        reserve0 -= amount0;
        reserve1 -= amount1;

        token0.transfer(msg.sender, amount0);
        token1.transfer(msg.sender, amount1);

        emit LiquidityRemoved(msg.sender, amount0, amount1, liquidity);
    }

    function swap(uint256 amountIn, address tokenIn, address tokenOut) external returns (uint256 amountOut) {
        if (tokenIn != address(token0) && tokenIn != address(token1)) {
            revert LiquidityPool__InvalidTokenIn(tokenIn);
        }

        if (tokenOut != address(token0) && tokenOut != address(token1)) {
            revert LiquidityPool__InvalidTokenOut(tokenOut);
        }

        if (tokenIn == tokenOut) revert LiquidityPool__IdenticalTokens(tokenIn, tokenOut);

        IERC20 inputToken;
        IERC20 outputToken;
        uint256 reserveIn;
        uint256 reserveOut;

        if (tokenIn == address(token0)) {
            inputToken = token0;
            outputToken = token1;
            reserveIn = reserve0;
            reserveOut = reserve1;
        } else {
            inputToken = token1;
            outputToken = token0;
            reserveIn = reserve1;
            reserveOut = reserve0;
        }

        inputToken.transferFrom(msg.sender, address(this), amountIn);

        uint256 amountInWithFee = (amountIn * (10000 - feeTier)) / 10000;
        amountOut = (amountInWithFee * reserveOut) / (reserveIn + amountInWithFee);

        if (amountOut == 0) revert LiquidityPool__InsufficientOutputAmount(amountOut, 1);

        outputToken.transfer(msg.sender, amountOut);

        // Update reserves
        if (tokenIn == address(token0)) {
            reserve0 += amountIn;
            reserve1 -= amountOut;
        } else {
            reserve1 += amountIn;
            reserve0 -= amountOut;
        }

        emit Swap(msg.sender, amountIn, amountOut, tokenIn, tokenOut);
    }
}
