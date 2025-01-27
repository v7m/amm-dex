// SPDX-License-Identifier: MIT

pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockToken
 * @dev ERC20 Token with minting capabilities. Used for testing purposes.
 */
contract MockToken is ERC20 {
    /**
     * @dev Constructor that mints the initial supply of tokens.
     * @param name_ The name of the token.
     * @param symbol_ The symbol of the token.
     * @param initialSupply The initial supply of tokens to mint.
     */
    constructor(string memory name_, string memory symbol_, uint256 initialSupply) ERC20(name_, symbol_) {
        _mint(msg.sender, initialSupply);
    }

    /**
     * @dev Function to mint additional tokens.
     * @param to The address to receive the minted tokens.
     * @param amount The amount of tokens to mint.
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
