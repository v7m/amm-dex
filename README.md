# AMM DEX (Automated Market Maker Decentralized Exchange)

A decentralized exchange platform built on **Uniswap V3** principles for efficient token swapping and concentrated liquidity provision.

## Description

**AMM DEX** is a decentralized exchange based on the Uniswap V3 protocol, offering advanced AMM functionality with concentrated liquidity. This platform provides the following core functionalities:

* **Token Swapping**: Exchange tokens directly on-chain with improved capital efficiency
* **Concentrated Liquidity**: Supply tokens within specific price ranges for better capital efficiency compared to traditional AMMs
* **Liquidity Position NFTs**: Receive non-fungible tokens representing your specific price range positions
* **Multiple Fee Tiers**: Choose from different fee levels (0.05%, 0.3%, 1%) based on expected pair volatility
* **Price Oracle Integration**: Built-in time-weighted average price oracles for external use

Unlike Uniswap V2 and other traditional AMMs, our Uniswap V3-based implementation allows liquidity providers to concentrate their capital within custom price ranges, significantly improving capital efficiency and potential returns.

## Technical Description

The AMM DEX platform implements Uniswap V3's architecture with three primary smart contracts:

1. **LiquidityPool**: Handles the core AMM functionality with concentrated liquidity and tick-based price ranges
2. **LiquidityPositionNFT**: Represents liquidity positions as non-transferable NFTs with position details and range parameters
3. **LiquidityPoolFactory**: Creates and manages liquidity pool instances for different token pairs and fee tiers

The system leverages Uniswap V3's innovative tick-based liquidity provision system, allowing for concentrated liquidity within custom price ranges. This design significantly improves capital efficiency compared to traditional constant product market makers.

### Built with

* **Solidity**: Smart contract programming language
* **OpenZeppelin Contracts**: Standardized, secure implementations for ERC20 and ERC721 tokens
* **Hardhat**: Ethereum development environment for testing and deployment
* **Chai**: Testing framework for contract validation
* **Uniswap V3 Core Concepts**: Concentrated liquidity, tick-based ranges, and multiple fee tiers

## Roadmap

### Completed Features
- [x] **Core AMM Functionality**: Swap mechanism with constant product formula
- [x] **Liquidity Pool Implementation**: Basic pool contract with deposit/withdraw functions
- [x] **NFT Liquidity Positions**: Non-transferable ERC-721 tokens representing LP positions
- [x] **Fee System**: Customizable fee tiers for different token pairs

### In Progress Features
- [ ] **Concentrated Liquidity**: Implementation of Uniswap V3 style liquidity provision within specific price ranges
- [ ] **ERC-4626 Integration**: Tokenized vault standard for more flexible liquidity provision

### Planned Features
- [ ] **TimeLock + Multisig**: Enhanced security through time-delayed execution and multi-signature requirements
- [ ] **Governance**: DAO-based governance system for protocol parameters and upgrades
- [ ] **Upgradable Contracts**: Proxy pattern implementation for future protocol improvements
- [ ] **Flash Loans**: Capital-efficient lending for arbitrage and liquidations

## Getting Started

To set up the local development environment:

```bash
# Clone the repository
git clone https://github.com/your-username/amm-dex.git
cd amm-dex

# Install dependencies
npm install
```

### Prerequisites

- Node.js (v14 or later)
- npm or yarn

## Usage

### Compile Contracts

```bash
npx hardhat compile
```

### Run Tests

```bash
npx hardhat test
```

### Deploy to Local Network

```bash
npx hardhat node
npx hardhat run --network localhost scripts/deploy.js
```

### Code Coverage

```bash
npm run coverage
```

### Linting

```bash
npm run lint
```

### Deploy to Testnet

1. Set up your `.env` file with API keys and private keys
2. Run deployment script:

```bash
npx hardhat run --network sepolia scripts/deploy.js
```
