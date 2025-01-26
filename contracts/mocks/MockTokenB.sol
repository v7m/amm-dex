// SPDX-License-Identifier: MIT

pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockTokenB
 * @dev Simple mock ERC20 token for testing
 */
contract MockTokenB is ERC20 {
    constructor() ERC20("Mock Token B", "MTB") {
        // Initial mint upon deployment (optional)
        _mint(msg.sender, 2000 * 10**decimals());
    }

    /**
     * @dev Allows external minting for testing purposes
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
