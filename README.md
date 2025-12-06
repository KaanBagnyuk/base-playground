README: base-playground
# Base Playground

Base Playground is my personal learning and experimentation repository for the **Base** network.

It started as a companion to the official **Base Learn** modules and contains small, focused smart contracts and scripts that I use to practice:

- Solidity basics
- Hardhat workflows
- Deploying and interacting with contracts on Base Sepolia
- Working with ethers.js / TypeScript

The repository is intentionally simple: it is a sandbox, not a production app.

---

## Goals

- Learn the Base developer tooling in a hands-on way
- Build muscle memory around Hardhat, deployments, and scripts
- Experiment with simple token and NFT contracts before using them in real projects
- Keep a history of my progress as I move from “hello world” contracts to more advanced patterns

---

## Tech stack

- **Solidity** `^0.8.28`
- **Hardhat** (TypeScript / ESM)
- **ethers.js v6**
- **Base Sepolia** testnet as the main target network

---

## Repository structure

Typical layout (may evolve over time):

- `contracts/` – Solidity contracts used in the learning modules  
  Examples:
  - `Counter.sol`
  - `BasicMath.sol`
  - minimal ERC‑20 and ERC‑721 implementations
- `scripts/` – Hardhat scripts for deployment and interaction
- `hardhat.config.ts` – network and compiler configuration
- `package.json` – Node.js scripts and dependencies

The exact set of contracts and scripts may change as I complete new Base Learn lessons.

---

## Getting started

Clone the repository and install dependencies:

```bash
git clone https://github.com/KaanBagnyuk/base-playground.git
cd base-playground
npm install
```

Compile contracts:

```bash
npx hardhat compile
```

Run your first local Hardhat node:

```bash
npx hardhat node
```

Or deploy to **Base Sepolia** (example):

```bash
npx hardhat run scripts/deployCounter.ts --network base-sepolia
```

> Make sure you have a `.env` file with a funded private key for Base Sepolia if the deploy script requires it.

---

## Base Learn modules

This playground loosely follows the structure of the Base Learn curriculum.  
Each small contract or script is meant to correspond to a specific learning topic:

- basic storage and arithmetic contracts
- ownership and access control
- simple ERC‑20 / ERC‑721 examples
- reading state and sending transactions via scripts

I do not treat this repository as a public tutorial – it is a personal notebook –  
but you can still peek at it to see my learning path.

---

## Relation to Base Beast Passport

The **Base Beast Passport** project grew out of this playground and now lives in its own dedicated repository:

➡️ https://github.com/KaanBagnyuk/base-beast-passport

`base-playground` stays focused on **learning**, while `base-beast-passport` is a real product-style project built on top of what I learned here.
