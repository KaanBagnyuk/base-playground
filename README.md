# Base Playground & Base Beast

This repository is my personal playground for learning how to build on **Base**, starting from zero experience as a developer.

It currently consists of two main parts:

1. **Base Playground (Hardhat / Solidity)** – simple smart contracts and scripts deployed to Base Sepolia while completing Base Learn modules.
2. **Base Beast – Onchain Activity Passport for Base Mainnet** – backend + contracts design for turning a wallet’s onchain activity into a “Beast Score” and a visual NFT monster.

---

## 1. Base Playground – Hardhat + Counter on Base Sepolia

This part of the repo was the starting point: learning Solidity, Hardhat and ethers v6, and finishing Base Learn modules.

It contains a minimal but complete setup:

- Hardhat project (TypeScript / ESM)
- Simple Solidity smart contracts (`Counter`, `BasicMath`, etc.)
- Scripts to deploy and interact with contracts on the **Base Sepolia** testnet

### 1.1 Smart contracts

- `contracts/Counter.sol`  
  Minimal counter contract:
  - stores an integer `count`
  - can increment the value
  - emits an event when the value changes

- `contracts/BasicMath.sol`  
  Simple math library for practice:
  - `add`, `subtract`, `multiply`, `divide`
  - all functions are `pure`

> More training contracts live in `contracts/` (storage, mappings, structs, minimal tokens, ERC-20 / ERC-721, etc.).

### 1.2 Scripts

- `scripts/deploy-counter.mjs`  
  Node script that:
  - reads compiled `Counter` artifact
  - connects to Base Sepolia via JSON-RPC
  - deploys the contract using a wallet private key from `.env`
  - prints deployment transaction hash and contract address

- `scripts/interact-counter.mjs`  
  Node script that:
  - connects to the deployed `Counter` contract
  - reads the current `count`
  - sends a transaction to `increment()`
  - waits for confirmation
  - reads the updated `count`

### 1.3 Config & tooling

- `hardhat.config.ts` – Hardhat configuration (Solidity version, networks, paths).
- `tsconfig.json` – TypeScript config used by Hardhat.
- `.gitignore` – ensures build artifacts, `node_modules`, and `.env` are not committed.

> ⚠️ **Important:** `.env` is ignored by Git. Never commit private keys or API keys.

### 1.4 Example deployed contracts (Base Sepolia)

- **Network:** Base Sepolia  
- **Contract:** `Counter`  
- **Example address:** `0xfF3D6d5A56C4C8c0397D2cd884A3Cdd4eEe14195`  

Basescan:  
https://sepolia.basescan.org/address/0xfF3D6d5A56C4C8c0397D2cd884A3Cdd4eEe14195

- **Network:** Base Sepolia  
- **Contract:** `BasicMath`  
- **Example address:** `0xFC297da5286eCF22C82Ef79ac01268F97C74a5B0`  

Basescan:  
https://sepolia.basescan.org/address/0xFC297da5286eCF22C82Ef79ac01268F97C74a5B0

### 1.5 Base Learn progress

All 13 Base Learn modules were completed using this repo:

- ✅ Storage  
- ✅ Arrays  
- ✅ Mappings  
- ✅ Structs (`GarageManager.sol`)  
- ✅ Functions / Error Handling (`ErrorTriageExercise.sol`)  
- ✅ Minimal Tokens (`MinimalToken.sol`)  
- ✅ ERC-20 Tokens (`MinimalToken.sol`, `WeightedVoting.sol`)  
- ✅ ERC-721 Tokens (`HaikuNFT.sol`)  
- ✅ … and more

**Builder wallet (public):**  
`0xfd32507B33220E1Be82E9bb83B4Ea74d4B59Cb25`

---

## 2. Base Beast — Onchain Activity Passport for Base

> Base Beast is an onchain activity passport for users of the Base network.  
> Each wallet receives a **Beast Score** (set of metrics) and can mint an NFT monster (Base Beast) whose attributes are directly tied to real onchain activity.

High-level idea:

- Take a Base Mainnet wallet.
- Pull onchain stats (transactions, active days, DeFi, NFT mints, builder & social signals).
- Convert them into 7 normalized tiers (0–5).
- Compute an overall score (0–100).
- Map the tiers to a **Beast** with RPG-style visual traits:
  - size  
  - muscles  
  - weapon  
  - shield  
  - armor  
  - neck medallion  
  - helmet  

Later, the Beast will be implemented as an ERC-721 NFT whose metadata reflects the wallet’s onchain profile.

### 2.1 Metrics (Beast Score model)

Current backend (v0.13) operates with **7 metrics**:

1. `activity_days` – Base Activity Days  
   - Number of unique calendar days with at least 1 Base Mainnet transaction.

2. `tx_count` – Total Transactions  
   - Total number of outbound transactions sent by the wallet on Base Mainnet.

3. `defi_swaps` – DeFi Swaps  
   - Number of DeFi swap operations on Base.  
   - **Status:** designed, but still **placeholder (0)** in backend.  
   - Will be computed from DEX swap events (Uniswap / Aerodrome / etc.).

4. `liquidity_yield` – DeFi Liquidity / Yield  
   - Cumulative `USD volume × days` in LP / lending / staking positions on Base.  
   - **Status:** designed conceptually, **not implemented yet**.  
   - Will reward both size of position and time in protocol.

5. `builder` – Builder Score  
   - Builder reputation score (0–100), sourced from Talent Protocol.  
   - Mapped to armor tier (0–5).  
   - **Status:** placeholder (0) until the Talent Protocol integration is wired.

6. `nft_mints` – NFT Mints on Base  
   - Number of NFTs **minted on Base** and received by the wallet.  
   - Counted as inbound NFT transfers from the zero address (`0x000...0000`) on Base Mainnet.
   - Implemented via Moralis NFT transfers API.

7. `social` – Social Score  
   - Offchain social influence (Twitter, Moni, etc.), normalized to 0–100.  
   - **Status:** placeholder (0) until social providers are integrated.

Each metric is mapped to a **tier 0–5** using transparent thresholds.  
There is also:

- `overall.tier` – rounded average of all metric tiers (0–5).
- `overall.score` – normalized 0–100 score.

> Exact tier mapping functions can be found in `backend/server.js`  
> (`mapActivityDaysToTier`, `mapTxCountToTier`, `mapNftMintsToTier`, etc.).

### 2.2 Visual mapping (Beast preview)

The backend exposes a **preview** of what the Beast looks like for a given wallet.

Example structure:

```json
"beast_preview": {
  "species_id": 1,
  "rarity": "Common",
  "user_type": "User",
  "visual_traits": {
    "size": {
      "source_metric": "activity_days",
      "tier": 1,
      "label": "Small",
      "description": "Early explorer with a few active days on Base."
    },
    "muscles": {
      "source_metric": "tx_count",
      "tier": 1,
      "label": "Lean",
      "description": "Just getting into basic onchain actions."
    },
    "weapon": {
      "source_metric": "defi_swaps",
      "tier": 0,
      "label": "No Weapon",
      "description": "Has not touched DeFi swaps yet."
    },
    "shield": {
      "source_metric": "liquidity_yield",
      "tier": 0,
      "label": "No Shield",
      "description": "No LP, lending or staking activity."
    },
    "armor": {
      "source_metric": "builder",
      "tier": 0,
      "label": "No Armor",
      "description": "Has not earned builder armor yet."
    },
    "neck_medallion": {
      "source_metric": "nft_mints",
      "tier": 3,
      "label": "Gold Medallion",
      "description": "NFT enthusiast with many Base mints."
    },
    "helmet": {
      "source_metric": "social",
      "tier": 0,
      "label": "No Helmet",
      "description": "No visible social presence yet."
    }
  }
}

Mapping logic:

size ← activity_days

muscles ← tx_count

weapon ← defi_swaps

shield ← liquidity_yield

armor ← builder

neck_medallion ← nft_mints

helmet ← social

user_type is derived from builder / social tiers:

Builder if builderTier ≥ 4

Influencer if socialTier ≥ 4

otherwise User.

2.3 Data providers

The backend uses a combination of:

Moralis Web3 API (primary source)

Used for:

Wallet stats
GET /wallets/{address}/stats?chain=base
→ total tx, NFT stats, etc.

NFT transfers
GET /{address}/nft/transfers?chain=base
→ used to compute nft_mints:

inbound transfers where:

to_address == wallet

from_address == 0x0000000000000000000000000000000000000000

spam / airdrop junk will be further filtered in future versions.

Etherscan API v2 (fallback only)

Used to recover tx_count / activity_days when Moralis is unavailable:

GET https://api.etherscan.io/v2/api?chainid=8453&module=account&action=txlist&...

In normal operation, Moralis is the main provider; Etherscan is just a backup.

3. Backend – Express server

Backend code lives in backend/:

backend/server.js – main Express backend

backend/mocks/wallet_profile_example.json – template for wallet score response

backend/mocks/beast_0_metadata.json – mock Beast NFT metadata

backend/test_moralis_stats.js – helper script to verify Moralis configuration

3.1 Tech stack

Node.js

Express

ES modules

Moralis Web3 API

Etherscan API v2 (fallback)

dotenv for secret management

3.2 API endpoints
Health check
GET /


Returns:

{
  "status": "ok",
  "name": "Base Beast backend",
  "version": "0.13.0",
  "network": "base-mainnet"
}

Wallet score
GET /api/wallet/:address/score


Example:

GET /api/wallet/0xfd32507B33220E1Be82E9bb83B4Ea74d4B59Cb25/score


Returns:

address, network, updated_at

scores.overall – { tier, label, score }

scores.tiers – per metric tiers + overall

scores.metrics – per metric raw value + tier + tier label + description

beast_preview – current Beast representation for this wallet

Beast metadata (mock)
GET /api/beast/:tokenId/metadata


Returns:

Basic NFT metadata for a Beast, based on backend/mocks/beast_0_metadata.json,

With name and external_url adjusted using tokenId.

4. Environment & local development
4.1 Clone & install
git clone https://github.com/KaanBagnyuk/base-playground.git
cd base-playground

npm install

4.2 Environment variables

Create a .env in the repo root:

# Hardhat / Base Sepolia
PRIVATE_KEY=your_base_sepolia_private_key

# Etherscan (fallback for Base Mainnet tx history)
ETHERSCAN_API_KEY=your_etherscan_key

# Moralis (main provider for tx stats and NFT mints)
MORALIS_API_KEY=your_moralis_key


Never commit .env to Git.

4.3 Run backend
npm run start:backend


Expected log:

Base Beast backend v0.13 (Moralis tx + NFT, Etherscan fallback) listening on http://localhost:4000
ETHERSCAN_API_KEY set: true/false
MORALIS_API_KEY set: true


Then you can open in browser:

http://localhost:4000/api/wallet/<YOUR_ADDRESS>/score

4.4 Test Moralis separately
npm run test:moralis


backend/test_moralis_stats.js calls Moralis wallet stats for a given address and prints:

total NFT count

total collections

total tx

NFT transfer stats

This is useful to debug Moralis configuration without touching the main backend.

5. Roadmap

Planned next steps for Base Beast:

DeFi Swaps metric (defi_swaps)

Count actual DEX swaps on Base (Uniswap, Aerodrome, etc.).

Use Moralis or a dedicated DeFi indexer.

Map raw swap count → weapon tier (0–5).

Liquidity & Yield metric (liquidity_yield)

Implement the USD volume × days model.

Aggregate LP / lending / staking positions over time.

Map to shield tier (0–5).

Builder Score integration

Pull Builder Score directly from Talent Protocol.

Use it as the main input for builder tier and armor visual.

Social Score integration

Fetch Twitter / Moni (or similar) influence metrics.

Normalize to 0–100 and map to social tier / helmet visual.

Onchain contracts

Implement BeastScoreRegistry on Base.

Implement BaseBeastNFT (ERC-721) that reads the registry or a signed oracle feed.

Mint / evolve Beasts based on live Beast Scores.

Front-end

Build a simple dApp:

connect wallet

preview Beast

see detailed Beast Score

mint Beast NFT on Base.

If you want to fork this repo, play with the Beast Score, or build your own activity-driven NFT avatar for another chain – feel free.
This project is all about learning, experimenting, and building fun, data-driven identities on Base.


---