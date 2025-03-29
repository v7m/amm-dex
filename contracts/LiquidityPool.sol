// SPDX-License-Identifier: MIT

pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "./LiquidityPositionNFT.sol";

/**
 * @title LiquidityPool
 * @dev AMM liquidity pool with swap and liquidity management functionalities.
 */
contract LiquidityPool is ERC20 {
    using EnumerableSet for EnumerableSet.UintSet;

    error LiquidityPool__InsufficientLiquidityMinted(uint256 liquidity, uint256 required);
    error LiquidityPool__PositionNotFound(address user, uint256 nftTokenId);
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
    address public liquidityPoolFactoryAddress;
    LiquidityPositionNFT public positionNFT;

    mapping(address => EnumerableSet.UintSet) private userPositions;

    event LiquidityAdded(
        address indexed user,
        uint256 amount0,
        uint256 amount1,
        uint256 liquidity,
        int24 tickLower,
        int24 tickUpper,
        uint256 nftTokenId
    );
    event LiquidityRemoved(address indexed user, uint256 amount0, uint256 amount1, uint256 liquidity, uint256 nftTokenId);
    event Swap(address indexed user, uint256 amountIn, uint256 amountOut, address tokenIn, address tokenOut);

    /**
     * @dev Constructor that sets the initial state of the pool.
     * @param _token0 Address of the first token.
     * @param _token1 Address of the second token.
     * @param _feeTier Fee tier for the pool.
     * @param _liquidityPoolFactoryAddress Address of the factory contract that created this pool.
     */
    constructor(address _token0, address _token1, uint24 _feeTier, address _liquidityPoolFactoryAddress, address _positionNFTAddress)
        ERC20("LP Token", "LPT")
    {
        token0 = IERC20(_token0);
        token1 = IERC20(_token1);
        feeTier = _feeTier;
        liquidityPoolFactoryAddress = _liquidityPoolFactoryAddress;
        positionNFT = LiquidityPositionNFT(_positionNFTAddress);
    }

    /**
     * @dev Adds liquidity to the pool and mints an NFT.
     * @param amount0 Desired amount of token0 to add.
     * @param amount1 Desired amount of token1 to add.
     * @param tickLower Lower bound of liquidity range.
     * @param tickUpper Upper bound of liquidity range.
     * @return liquidity Amount of LP tokens minted.
     */
    function addLiquidity(
        uint256 amount0,
        uint256 amount1,
        int24 tickLower,
        int24 tickUpper
    ) external returns (
        uint256 liquidity
    ) {
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

        uint256 nftTokenId = positionNFT.mint(msg.sender, address(token0), address(token1), liquidity, tickLower, tickUpper);
        userPositions[msg.sender].add(nftTokenId);

        emit LiquidityAdded(msg.sender, amount0, amount1, liquidity, tickLower, tickUpper, nftTokenId);
    }

    /**
     * @dev Removes liquidity from the pool and burns the corresponding NFT.
     * @param nftTokenId The ID of the NFT representing the liquidity position.
     * @return amount0 Amount of token0 returned.
     * @return amount1 Amount of token1 returned.
     */
    function removeLiquidity(uint256 nftTokenId) external returns (uint256 amount0, uint256 amount1) {
        LiquidityPositionNFT.Position memory position = positionNFT.getPosition(nftTokenId);

        if (position.owner != msg.sender) revert LiquidityPool__PositionNotFound(msg.sender, nftTokenId);

        uint256 liquidity = position.liquidity;
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

        positionNFT.burn(nftTokenId);
        // Remove the nftTokenId from the user's positions list
        if (!userPositions[msg.sender].remove(nftTokenId)) revert LiquidityPool__PositionNotFound(msg.sender, nftTokenId);

        emit LiquidityRemoved(msg.sender, amount0, amount1, liquidity, nftTokenId);
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

    /**
     * @dev Returns the number of liquidity positions a user has.
     * @param user The address of the liquidity provider.
     * @return count The number of NFT positions.
     */
    function getUserPositionsCount(address user) external view returns (uint256) {
        return userPositions[user].length();
    }

    /**
     * @dev Returns the liquidity position NFT IDs owned by a user.
     * @param user The address of the liquidity provider.
     * @return nftTokenIds An array of NFT token IDs.
     */
    function getUserPositions(address user) external view returns (uint256[] memory) {
        uint256 length = userPositions[user].length();
        uint256[] memory nftTokenIds = new uint256[](length);

        for (uint256 i = 0; i < length; i++) {
            nftTokenIds[i] = userPositions[user].at(i);
        }

        return nftTokenIds;
    }
}
