# Taskly Escrow Smart Contract Deployment Guide

This directory contains the Solidity escrow smart contract, local unit tests, and the deployment script for Celo Sepolia and Alfajores testnets.

## 📦 Steps to Deploy & Run Tests

Because deploying requires your wallet's private key to sign the transaction and pay gas, you should execute these steps in your local terminal:

### 1. Install Dependencies
Open your terminal, navigate to this directory, and install the modules:
```bash
cd apps/contracts
npm install
```

### 2. Configure Environment variables
Create a `.env` file in the root of this directory (`apps/contracts/.env`) and add your deployment private key (ensure this key has testnet CELO/USDm for gas fees):
```env
PRIVATE_KEY=your_wallet_private_key_here
```

### 3. Compile and Run Local Tests
Verify the contract works (locks funds, payouts to workers, advertiser refunds) locally on the Hardhat network:
```bash
npx hardhat test
```

### 4. Deploy to Celo Sepolia Testnet
Deploy the contract to Celo Sepolia:
```bash
npx hardhat run scripts/deploy.ts --network celoSepolia
```

### 5. Link to Frontend
* Once successfully deployed, copy the contract address printed in the console.
* Go to the web frontend configuration at `apps/web/.env` and paste the address:
  ```env
  NEXT_PUBLIC_ESCROW_ADDRESS_SEPOLIA=your_deployed_contract_address_here
  ```
