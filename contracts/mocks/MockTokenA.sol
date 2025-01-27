// SPDX-License-Identifier: MIT

pragma solidity ^0.8.28;

import "./MockToken.sol";

/**
 * @title MockTokenA
 * @dev Mock Token A, inheriting from MockToken.
 */
contract MockTokenA is MockToken {
    /**
     * @dev Constructor that initializes the token with specific parameters.
     */
    constructor() MockToken("Mock Token A", "MTA", 1000 * 10**18) {}
}
