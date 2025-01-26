// SPDX-License-Identifier: MIT

pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockTokenA
 * @dev Simple mock ERC20 token for testing
 */
contract MockTokenA is ERC20 {
    constructor() ERC20("Mock Token A", "MTA") {
        // Initial mint on deployment (optional)
        _mint(msg.sender, 1000 * 10**decimals());
    }

    /**
     * @dev Allows external mint for testing purposes
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
