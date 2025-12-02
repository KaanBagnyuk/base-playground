# Base Playground – Hardhat + Counter on Base Sepolia

This repository is my personal playground for learning how to build on **Base**, starting from zero experience as a developer.

It contains a minimal but complete setup:

- Hardhat project (TypeScript / ESM)
- A simple Solidity smart contract (`Counter`)
- Scripts to deploy and interact with the contract on the **Base Sepolia** testnet using `ethers` v6

---

## What this project includes

### Smart contract

- `contracts/Counter.sol`  
  A minimal counter contract that:
  - stores an integer `count`
  - can increment the value
  - emits an event when the value changes

### Scripts

- `scripts/deploy-counter.mjs`  
  Node script that:
  - reads the compiled artifact of `Counter`
  - connects to Base Sepolia via JSON-RPC
  - deploys the contract using a wallet private key from `.env`
  - prints the deployment transaction hash and the contract address

- `scripts/interact-counter.mjs`  
  Node script that:
  - connects to the already deployed `Counter` contract
  - reads the current `count` value
  - sends a transaction to `increment()`
  - waits for confirmation
  - reads the updated `count` value

### Config

- `hardhat.config.ts`  
  Hardhat configuration (Solidity version, networks, etc.).
- `tsconfig.json`  
  TypeScript config used by Hardhat.
- `.gitignore`  
  Makes sure build artifacts, `node_modules`, and **`.env`** are not committed.

> ⚠️ **Important:** `.env` is ignored by Git. Never commit private keys.


### BasicMath contract

- **File:** `contracts/BasicMath.sol`
- **Purpose:** exposes simple math functions (`add`, `subtract`, `multiply`, `divide`) as pure functions.
- **Network:** Base Sepolia
- **Example address:** `0xFC297da5286eCF22C82Ef79ac01268F97C74a5B0`

You can view it on Basescan:  
https://sepolia.basescan.org/address/0xFC297da5286eCF22C82Ef79ac01268F97C74a5B0

---

## Tech stack

- **Node.js**
- **Hardhat** (v3, TypeScript / ESM)
- **Solidity** `^0.8.28`
- **ethers** v6
- **dotenv**
- **Base Sepolia** testnet

---
## Base Learn Progress

All 13 Base Learn modules completed using this repo:

- ✅ Storage
- ✅ Arrays
- ✅ Mappings
- ✅ Structs (`GarageManager.sol`)
- ✅ Functions / Error Handling (`ErrorTriageExercise.sol`)
- ✅ Minimal Tokens (`MinimalToken.sol`)
- ✅ ERC-20 Tokens (`MinimalToken.sol`, `WeightedVoting.sol`)
- ✅ ERC-721 Tokens (`HaikuNFT.sol`)
- ✅ ... (other modules)

Network: Base Sepolia  
Builder wallet (public): `0x...`  <!-- сюда вставь адрес Wallet B -->

---

## Getting started

### 1. Clone the repo

```bash
git clone https://github.com/KaanBagnyuk/base-playground.git
cd base-playground
## Deployed contract info (example)

- **Network:** Base Sepolia
- **Contract:** `Counter`
- **Example address:** `0xfF3D6d5A56C4C8c0397D2cd884A3Cdd4eEe14195`

You can view it on Basescan:  
https://sepolia.basescan.org/address/0xfF3D6d5A56C4C8c0397D2cd884A3Cdd4eEe14195
