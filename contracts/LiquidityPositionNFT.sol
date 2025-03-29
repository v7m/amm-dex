// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "hardhat/console.sol";

/**
 * @title LiquidityPositionNFT
 * @dev ERC721 token representing liquidity positions in the AMM DEX.
 * Each minted NFT corresponds to a unique liquidity position in a pool.
 * The NFT cannot be transferred after minting.
 */
contract LiquidityPositionNFT is ERC721, AccessControl {
    uint256 private _nextTokenId; // Counter for minting token IDs
    bytes32 public constant POOL_ROLE = keccak256("POOL_ROLE");
    bytes32 public constant POOL_FACTORY_ROLE = keccak256("POOL_FACTORY_ROLE");
    address public liquidityPoolFactoryAddress;

    struct Position {
        address owner;      // Address of the position owner
        address token0;     // First token in the liquidity pair
        address token1;     // Second token in the liquidity pair
        uint256 liquidity;  // Liquidity amount provided
        int24 lowerTick;    // Lower tick of the liquidity range
        int24 upperTick;    // Upper tick of the liquidity range
    }

    mapping(uint256 => Position) public positions;

    error LiquidityPositionNFT__NonExistentToken(uint256 tokenId);
    error LiquidityPositionNFT__PositionDoesNotExist(uint256 tokenId);
    error LiquidityPositionNFT__TransfersNotAllowed(address from, address to, uint256 tokenId);

    event Minted(
        address indexed owner,
        uint256 indexed tokenId,
        address token0,
        address token1,
        uint256 liquidity,
        int24 lowerTick,
        int24 upperTick
    );

    /**
     * @dev Initializes the ERC721 contract with a name and symbol.
     * The owner is set as the contract deployer.
     */

    constructor() ERC721("Liquidity Position", "LPOS") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev Sets the LiquidityPoolFactory address and grants it the POOL_FACTORY_ROLE.
     * Can be called only by an account with the DEFAULT_ADMIN_ROLE.
     *
     * @param _poolFactoryAddress The address of the LiquidityPoolFactory.
     */
    function grantPoolFactoryRole(address _poolFactoryAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(POOL_FACTORY_ROLE, _poolFactoryAddress);
    }

    /**
     * @dev Grants the POOL_ROLE to a specified account.
     * Can only be called by an account with POOL_FACTORY_ROLE.
     *
     * @param account The address to grant POOL_ROLE.
     */
    function grantPoolRole(address account) external onlyRole(POOL_FACTORY_ROLE) {
        _grantRole(POOL_ROLE, account);
    }

    /**
     * @dev Mints a new liquidity position NFT.
     * Each NFT represents a liquidity position in a decentralized exchange pool.
     * Only the contract owner can call this function.
     *
     * @param to The address that will receive the minted NFT.
     * @param token0 The first token in the liquidity pair.
     * @param token1 The second token in the liquidity pair.
     * @param liquidity The amount of liquidity provided.
     * @param lowerTick The lower tick of the position range.
     * @param upperTick The upper tick of the position range.
     * @return tokenId The ID of the minted NFT.
     */
    function mint(
        address to,
        address token0,
        address token1,
        uint256 liquidity,
        int24 lowerTick,
        int24 upperTick
    ) external onlyRole(POOL_ROLE) returns (uint256 tokenId) {
        tokenId = _nextTokenId;
        _nextTokenId++;

        positions[tokenId] = Position({
            owner: to,
            token0: token0,
            token1: token1,
            liquidity: liquidity,
            lowerTick: lowerTick,
            upperTick: upperTick
        });

        _safeMint(to, tokenId);

        emit Minted(to, tokenId, token0, token1, liquidity, lowerTick, upperTick);

        return tokenId;
    }

    /**
     * @dev Burns a liquidity position NFT.
     * @param tokenId The ID of the NFT to burn.
     */
    function burn(uint256 tokenId) external onlyRole(POOL_ROLE) {
        address tokenOwner = ownerOf(tokenId);

        if (tokenOwner == address(0)) revert LiquidityPositionNFT__NonExistentToken(tokenId);

        if (tokenOwner != _msgSender()) {
            if (
                getApproved(tokenId) != _msgSender() && !isApprovedForAll(tokenOwner, _msgSender())
            ) {
                revert LiquidityPositionNFT__TransfersNotAllowed(_msgSender(), address(0), tokenId);
            }
        }

        _burn(tokenId);
    }

    /**
     * @dev Retrieves the details of a liquidity position.
     * Reverts if the given `tokenId` does not exist.
     *
     * @param tokenId The ID of the liquidity position NFT.
     * @return position The Position struct containing the details.
     */
    function getPosition(uint256 tokenId) external view returns (Position memory position) {
        if (positions[tokenId].owner == address(0)) revert LiquidityPositionNFT__PositionDoesNotExist(tokenId);

        return positions[tokenId];
    }

    /**
     * @dev Overrides the `_update()` function from OpenZeppelin ERC721.
     * This function prevents transfers after minting by reverting on normal transfers,
     * but allows minting (from == address(0)) and burning (to == address(0)).
     *
     * @param to The recipient address.
     * @param tokenId The ID of the NFT being transferred.
     * @param auth The address initiating the transfer (authorized caller).
     * @return from The previous owner of the NFT.
     */
    function _update(address to, uint256 tokenId, address auth) internal override returns (address from) {
        from = super._update(to, tokenId, auth);

        // Allow mint (from == 0) and burn (to == 0); only block transfers between non-zero addresses.
        if (from != address(0) && to != address(0)) {
            revert LiquidityPositionNFT__TransfersNotAllowed(from, to, tokenId);
        }

        return from;
    }

    /**
     * @dev Overrides the `supportsInterface` function from both ERC721 and AccessControl.
     * This function combines the interface support of the base contracts, ensuring that
     * the derived contract reports support for the interfaces declared in both ERC721 and AccessControl.
     *
     * @param interfaceId The interface identifier, as specified in ERC-165.
     * @return bool True if the contract implements the requested interface.
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    /**
     * @dev Returns the next token ID that will be minted.
     * Useful for tracking the current token supply.
     *
     * @return The next token ID.
     */
    function nextTokenId() external view returns (uint256) {
        return _nextTokenId;
    }
}
