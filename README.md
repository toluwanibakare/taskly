# Taskly

Taskly is a decentralized microwork and task marketplace built on the Celo blockchain. The platform allows campaign creators to list micro-tasks (such as social media engagement, surveys, and application testing) and secure the rewards in a smart contract escrow. Earners can complete these tasks, submit verification proofs, and claim rewards in USDm (Mento Dollar) stablecoin.

To enable accessibility for non-crypto users, Taskly integrates Naira (NGN) fiat payments via Korapay, enabling automated on-chain campaign creation and funding through traditional cards and bank transfers.

## Features

- Smart Contract Escrow: Secure campaign funding and worker payouts using the TasklyEscrow solidity contract.
- Automated Fiat In-Ramp: Seamless Naira deposits via Korapay that automatically trigger on-chain USDm campaign funding.
- Mobile Web Optimized: Designed for responsive mobile use, including integrated support for Opera MiniPay containers.
- Gas Fee Optimization: Off-chain reward accrual with batch withdrawals to minimize network gas costs for workers.
- Manual Wallet Connections: Support for paste-in Celo addresses allowing earners without injected Web3 browser extensions to complete tasks and receive payouts.

## Tech Stack and Tools

- Frontend: Next.js (App Router), React, Tailwind CSS, RainbowKit, Wagmi, Viem
- Smart Contracts: Solidity (v0.8.20), Hardhat, Ethers.js
- Database and Media Storage: Google Firebase (Firestore and Firebase Storage)
- Payments: Korapay API (Collections & Webhook signature verification)
- Blockchain Infrastructure: Celo Mainnet (USDm stablecoin token)

## Project Structure

```text
├── apps
│   ├── contracts  # Hardhat development suite, Solidity escrow contract, and deployment scripts
│   └── web        # Next.js web application frontend and API webhook routes
```

## Setup Instructions

### Prerequisites

- Node.js (version 18 or higher)
- pnpm (version 8 or higher)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/toluwanibakare/taskly.git
   cd taskly
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Configure environment variables inside both `apps/web/.env` and `apps/contracts/.env` using their respective templates.

### Running Locally

1. Compile the smart contracts:
   ```bash
   pnpm --filter contracts compile
   ```

2. Run the web application development server:
   ```bash
   pnpm --filter web dev
   ```

3. Open `http://localhost:3000` in your web browser.
