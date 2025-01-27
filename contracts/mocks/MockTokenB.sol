// SPDX-License-Identifier: MIT

pragma solidity ^0.8.28;

import "./MockToken.sol";

/**
 * @title MockTokenB
 * @dev Mock Token B, inheriting from MockToken.
 */
contract MockTokenB is MockToken {
    /**
     * @dev Constructor that initializes the token with specific parameters.
     */
    constructor() MockToken("Mock Token B", "MTB", 2000 * 10**18) {}
}
