// scripts/pushBeastScore.mjs
// Берёт tiers из backend и записывает их в BeastScoreRegistry.setScore(user, BeastScore)

import "dotenv/config";
import { ethers } from "ethers";

const {
  RPC_URL,
  SCORE_ORACLE_PRIVATE_KEY,
  BEAST_REGISTRY_ADDRESS,
  BEAST_BACKEND_URL
} = process.env;

if (!RPC_URL) {
  console.error("❌ RPC_URL is missing in .env");
  process.exit(1);
}
if (!SCORE_ORACLE_PRIVATE_KEY) {
  console.error("❌ SCORE_ORACLE_PRIVATE_KEY is missing in .env");
  process.exit(1);
}
if (!BEAST_REGISTRY_ADDRESS) {
  console.error("❌ BEAST_REGISTRY_ADDRESS is missing in .env");
  process.exit(1);
}

const BACKEND_URL = BEAST_BACKEND_URL || "http://localhost:4000";

// --- Минимальный ABI для BeastScoreRegistry ---
// ВАЖНО: тут tuple уже с ИМЕНАМИ полей, чтобы можно было передавать объект
const BEAST_REGISTRY_ABI = [
  // setScore(address user, BeastScore score)
  "function setScore(address user, (uint8 activityDaysTier,uint8 txCountTier,uint8 defiSwapsTier,uint8 liquidityTier,uint8 builderTier,uint8 nftMintsTier,uint8 socialTier,uint8 gasSpentTier,uint8 defiVolumeTier,uint8 overallTier) score) external",
  // getScore(address user) view returns (BeastScore)
  "function getScore(address user) view returns (tuple(uint8 activityDaysTier,uint8 txCountTier,uint8 defiSwapsTier,uint8 liquidityTier,uint8 builderTier,uint8 nftMintsTier,uint8 socialTier,uint8 gasSpentTier,uint8 defiVolumeTier,uint8 overallTier))"
];

// --- Провайдер + кошелёк-оракул ---

const provider = new ethers.JsonRpcProvider(RPC_URL);
const oracleWallet = new ethers.Wallet(SCORE_ORACLE_PRIVATE_KEY, provider);
const registry = new ethers.Contract(
  BEAST_REGISTRY_ADDRESS,
  BEAST_REGISTRY_ABI,
  oracleWallet
);

// --- Тянем данные из backend ---

async function fetchScoreFromBackend(walletAddress) {
  const url = `${BACKEND_URL.replace(/\/$/, "")}/api/wallet/${walletAddress}/score`;
  console.log(`🌐 Fetching score from backend: ${url}`);

  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Backend HTTP error ${res.status}: ${text.slice(0, 300)}`
    );
  }

  const json = await res.json();

  const tiers = json?.scores?.tiers;
  const overallTierBackend = Number(json?.scores?.overall?.tier ?? 0);

  if (!tiers) {
    throw new Error("Backend response has no scores.tiers");
  }

  return {
    backendAddress: json.address,
    tiers,
    overallTierBackend
  };
}

// --- Пушим в реестр ---

async function pushScore(walletToScore) {
  console.log("===========================================");
  console.log("👾 Base Beast – push score onchain");
  console.log("User:     ", walletToScore);
  console.log("Registry: ", BEAST_REGISTRY_ADDRESS);
  console.log("Oracle:   ", oracleWallet.address);
  console.log("RPC:      ", RPC_URL);
  console.log("===========================================");

  const { backendAddress, tiers, overallTierBackend } =
    await fetchScoreFromBackend(walletToScore);

  if (
    backendAddress &&
    backendAddress.toLowerCase() !== walletToScore.toLowerCase()
  ) {
    console.warn(
      `⚠️ Backend returned address ${backendAddress}, which differs from input ${walletToScore}`
    );
  }

  console.log("📊 Tiers from backend:", tiers);
  console.log("⭐ Overall tier from backend:", overallTierBackend);

  const scoreStruct = {
    activityDaysTier: Number(tiers.activity_days || 0),
    txCountTier: Number(tiers.tx_count || 0),
    defiSwapsTier: Number(tiers.defi_swaps || 0),
    liquidityTier: Number(tiers.liquidity_yield || 0),
    builderTier: Number(tiers.builder || 0),
    nftMintsTier: Number(tiers.nft_mints || 0),
    socialTier: Number(tiers.social || 0),
    gasSpentTier: Number(tiers.gas_spent || 0),
    defiVolumeTier: Number(tiers.defi_volume || 0),
    overallTier: overallTierBackend
  };

  console.log("📦 Struct to push:", scoreStruct);

  console.log("📝 Sending setScore transaction...");
  const tx = await registry.setScore(walletToScore, scoreStruct);
  console.log("⛽ Tx sent:", tx.hash);

  const receipt = await tx.wait();
  console.log("✅ Tx mined in block", receipt.blockNumber);

    const onchainScore = await registry.getScore(walletToScore);
  console.log("🔎 Onchain score (from registry) raw:", onchainScore);

  const parsed = {
    activityDaysTier: Number(onchainScore.activityDaysTier ?? onchainScore[0] ?? 0),
    txCountTier: Number(onchainScore.txCountTier ?? onchainScore[1] ?? 0),
    defiSwapsTier: Number(onchainScore.defiSwapsTier ?? onchainScore[2] ?? 0),
    liquidityTier: Number(onchainScore.liquidityTier ?? onchainScore[3] ?? 0),
    builderTier: Number(onchainScore.builderTier ?? onchainScore[4] ?? 0),
    nftMintsTier: Number(onchainScore.nftMintsTier ?? onchainScore[5] ?? 0),
    socialTier: Number(onchainScore.socialTier ?? onchainScore[6] ?? 0),
    gasSpentTier: Number(onchainScore.gasSpentTier ?? onchainScore[7] ?? 0),
    defiVolumeTier: Number(onchainScore.defiVolumeTier ?? onchainScore[8] ?? 0),
    overallTier: Number(onchainScore.overallTier ?? onchainScore[9] ?? 0)
  };

  console.log("🔎 Parsed onchain score:", parsed);
}

// --- entrypoint ---

async function main() {
  const walletToScore = process.argv[2];

  if (!walletToScore) {
    console.error(
      "Usage: node scripts/pushBeastScore.mjs <WALLET_ADDRESS>\nExample: node scripts/pushBeastScore.mjs 0xfd32507B33220E1Be82E9bb83B4Ea74d4B59Cb25"
    );
    process.exit(1);
  }

  await pushScore(walletToScore);
}

main().catch((err) => {
  console.error("❌ Error in pushBeastScore:", err);
  process.exit(1);
});
