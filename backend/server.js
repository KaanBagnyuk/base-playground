// backend/server.js
// Base Beast backend – v0.18
// - Activity Days и tx_count считаются по реальной истории tx (Etherscan v2 / Blockscout / Moralis fallback)
// - gas_spent считает суммарный газ в ETH с дробной частью
// - DeFi Swaps, DeFi Volume, Liquidity, NFT mints – через Moralis
// - Добавлен manual-builder & manual-social для избранных адресов

import express from "express";
import cors from "cors";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

// API keys
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";
const MORALIS_API_KEY = process.env.MORALIS_API_KEY || "";

/**
 * MANUAL_SCORES — ручные оверрайды для builder / social по адресам.
 * КЛЮЧИ ОБЯЗАТЕЛЬНО В НИЖНЕМ РЕГИСТРЕ.
 *
 * builder_score: 0–100
 * social_score:  0–100
 *
 * Ты можешь добавлять сюда свои кошельки и скоры.
 */
const MANUAL_SCORES = {
  // Пример: твой текущий кошелёк
  "0xfd32507b33220e1be82e9bb83b4ea74d4b59cb25": {
    builder_score: 65, // Base builder vibes
    social_score: 30   // Active / Voice
  }

  // Можно добавлять другие адреса:
  // "0x1234....abcd": { builder_score: 90, social_score: 80 }
};

// ESM helpers
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// ----------------------------------------------------
// Utils: load JSON from mocks
// ----------------------------------------------------
async function loadJsonFromMocks(filename) {
  const filePath = path.join(__dirname, "mocks", filename);
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

// ----------------------------------------------------
// Helper: fetch tx stats (Etherscan v2 / Blockscout → Moralis)
// ----------------------------------------------------
//
// Возвращает:
//   { txCount, activityDays, gasSpentNative }
//
// txCount        — количество исходящих tx (from == address)
// activityDays   — число уникальных дней, когда был хотя бы 1 tx (from или to)
// gasSpentNative — суммарный gasUsed * gasPrice по исходящим успешным tx, в ETH
//
async function fetchTxStats(address) {
  const lowerAddr = String(address || "").toLowerCase();
  const defaults = { txCount: 0, activityDays: 0, gasSpentNative: 0 };

  // ---------- 1) Etherscan v2 по chainid=8453 (Base) ----------
  if (ETHERSCAN_API_KEY) {
    try {
      const url = new URL("https://api.etherscan.io/v2/api");
      url.searchParams.set("chainid", "8453");
      url.searchParams.set("module", "account");
      url.searchParams.set("action", "txlist");
      url.searchParams.set("address", address);
      url.searchParams.set("startblock", "0");
      url.searchParams.set("endblock", "99999999");
      url.searchParams.set("sort", "asc");
      url.searchParams.set("apikey", ETHERSCAN_API_KEY);

      console.log("[TxStats] (Etherscan) Fetching:", url.toString());
      const res = await fetch(url.toString());

      if (!res.ok) {
        const text = await res.text();
        console.error(
          "[TxStats] (Etherscan) HTTP error:",
          res.status,
          text.slice(0, 300)
        );
      } else {
        const json = await res.json();

        if (json.status === "1" && Array.isArray(json.result)) {
          let outgoingCount = 0;
          const activeDays = new Set();
          let totalGasWei = 0n;

          for (const tx of json.result) {
            const from = String(tx.from || "").toLowerCase();
            const ts = Number(tx.timeStamp || tx.timestamp || 0);

            if (ts > 0) {
              const day = new Date(ts * 1000).toISOString().slice(0, 10);
              activeDays.add(day);
            }

            if (from === lowerAddr) {
              outgoingCount += 1;

              if (String(tx.isError) === "1") continue;

              try {
                const gasUsed = BigInt(tx.gasUsed || "0");
                const gasPrice = BigInt(tx.gasPrice || "0");
                totalGasWei += gasUsed * gasPrice;
              } catch (err) {
                console.warn("[TxStats] (Etherscan) BigInt parse failed", err);
              }
            }
          }

          const txCount = outgoingCount;
          const activityDays = activeDays.size;
          const gasSpentNative =
            totalGasWei > 0n ? Number(totalGasWei) / 1e18 : 0;

          console.log(
            `[TxStats] (Etherscan) txCount=${txCount}, activityDays=${activityDays}, gasSpent=${gasSpentNative} ETH`
          );

          return { txCount, activityDays, gasSpentNative };
        } else {
          console.warn(
            "[TxStats] (Etherscan) Empty result or error:",
            json.message,
            json.result
          );
        }
      }
    } catch (err) {
      console.error("[TxStats] (Etherscan) error:", err);
    }
  }

  // ---------- 2) Blockscout (без ключа) ----------
  try {
    const url = new URL("https://base.blockscout.com/api");
    url.searchParams.set("module", "account");
    url.searchParams.set("action", "txlist");
    url.searchParams.set("address", address);
    url.searchParams.set("startblock", "0");
    url.searchParams.set("endblock", "99999999");
    url.searchParams.set("sort", "asc");

    console.log("[TxStats] (Blockscout) Fetching:", url.toString());
    const res = await fetch(url.toString());

    if (!res.ok) {
      const text = await res.text();
      console.error(
        "[TxStats] (Blockscout) HTTP error:",
        res.status,
        text.slice(0, 300)
      );
    } else {
      const json = await res.json();
      const hasOkStatus =
        json.status === "1" ||
        String(json.message || "").toUpperCase() === "OK";

      if (hasOkStatus && Array.isArray(json.result)) {
        let outgoingCount = 0;
        const activeDays = new Set();
        let totalGasWei = 0n;

        for (const tx of json.result) {
          const from = String(tx.from || tx.from_address || "").toLowerCase();
          const ts = Number(
            tx.timeStamp ||
              tx.timestamp ||
              tx.time ||
              tx.block_timestamp ||
              0
          );

          if (ts > 0) {
            const day = new Date(ts * 1000).toISOString().slice(0, 10);
            activeDays.add(day);
          }

          if (from === lowerAddr) {
            outgoingCount += 1;

            const isErrorVal =
              tx.isError ?? tx.txreceipt_status ?? tx.status ?? "0";
            const isErrorStr = String(isErrorVal);
            if (isErrorStr === "1" || isErrorStr === "0x1") continue;

            try {
              const gasUsedRaw = tx.gasUsed ?? tx.gas_used ?? tx.gas ?? "0";
              const gasPriceRaw = tx.gasPrice ?? tx.gas_price ?? "0";
              const gasUsed = BigInt(String(gasUsedRaw));
              const gasPrice = BigInt(String(gasPriceRaw));
              totalGasWei += gasUsed * gasPrice;
            } catch (err) {
              console.warn("[TxStats] (Blockscout) BigInt parse failed", err);
            }
          }
        }

        const txCount = outgoingCount;
        const activityDays = activeDays.size;
        const gasSpentNative =
          totalGasWei > 0n ? Number(totalGasWei) / 1e18 : 0;

        console.log(
          `[TxStats] (Blockscout) txCount=${txCount}, activityDays=${activityDays}, gasSpent=${gasSpentNative} ETH`
        );

        return { txCount, activityDays, gasSpentNative };
      } else {
        console.warn(
          "[TxStats] (Blockscout) Empty result or bad status:",
          json.status,
          json.message
        );
      }
    }
  } catch (err) {
    console.error("[TxStats] (Blockscout) error:", err);
  }

  // ---------- 3) Fallback: Moralis stats (без газа) ----------
  if (MORALIS_API_KEY) {
    try {
      const url = new URL(
        `https://deep-index.moralis.io/api/v2.2/wallets/${address}/stats`
      );
      url.searchParams.set("chain", "base");

      console.log("[TxStats] (Moralis fallback) Fetching:", url.toString());

      const res = await fetch(url.toString(), {
        method: "GET",
        headers: {
          accept: "application/json",
          "X-API-Key": MORALIS_API_KEY
        }
      });

      if (!res.ok) {
        const text = await res.text();
        console.error(
          "[TxStats] (Moralis fallback) HTTP error:",
          res.status,
          text.slice(0, 300)
        );
      } else {
        const json = await res.json();
        const txTotal = Number(json?.transactions?.total || 0);

        const activityDays =
          txTotal > 0 ? Math.min(Math.ceil(txTotal / 4), 365) : 0;

        console.log(
          `[TxStats] (Moralis fallback) txCount=${txTotal}, activityDays≈${activityDays}`
        );

        return {
          txCount: txTotal,
          activityDays,
          gasSpentNative: 0
        };
      }
    } catch (err) {
      console.error("[TxStats] (Moralis fallback) error:", err);
    }
  }

  console.warn("[TxStats] All providers failed, returning defaults");
  return defaults;
}

// ----------------------------------------------------
// NFT mints via Moralis (with spam filter)
// ----------------------------------------------------
async function fetchNftMintsFromMoralis(address) {
  const apiKey = MORALIS_API_KEY;
  if (!apiKey) {
    console.warn("⚠️ MORALIS_API_KEY is missing, returning nftMintsRaw = 0");
    return 0;
  }

  const baseUrl = `https://deep-index.moralis.io/api/v2.2/${address}/nft/transfers`;
  const maxPages = 5;
  const limit = 100;

  let cursor = null;
  let totalMints = 0;
  const lowerAddr = address.toLowerCase();
  const zeroAddress = "0x0000000000000000000000000000000000000000";

  for (let page = 0; page < maxPages; page++) {
    const url = new URL(baseUrl);
    url.searchParams.set("chain", "base");
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("order", "DESC");
    url.searchParams.set("exclude_spam", "true");

    if (cursor) {
      url.searchParams.set("cursor", cursor);
    }

    console.log(
      `🔍 Moralis NFT transfers page ${page + 1}, cursor=${cursor || "none"}`
    );

    const res = await fetch(url.toString(), {
      headers: {
        "X-API-Key": apiKey,
        accept: "application/json"
      }
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(
        `❌ Moralis NFT transfers error ${res.status}: ${text.slice(0, 300)}`
      );
      break;
    }

    const data = await res.json();
    const transfers = Array.isArray(data.result) ? data.result : [];

    for (const tx of transfers) {
      const from = (tx.from_address || "").toLowerCase();
      const to = (tx.to_address || "").toLowerCase();

      if (from === zeroAddress && to === lowerAddr) {
        totalMints += 1;
      }
    }

    cursor = data.cursor;
    if (!cursor) {
      break;
    }
  }

  console.log(`✅ NFT mints (spam filtered) for ${address}: ${totalMints}`);
  return totalMints;
}

// ----------------------------------------------------
// DeFi swaps & volume via Moralis
// ----------------------------------------------------
async function fetchDefiSwapsFromMoralis(address) {
  if (!MORALIS_API_KEY) {
    return { swapsCount: 0, swapsVolumeUsd: 0 };
  }

  let cursor = null;
  let page = 0;
  const maxPages = 5;

  let swapsCount = 0;
  let swapsVolumeUsd = 0;

  try {
    while (page < maxPages) {
      const url = new URL(
        `https://deep-index.moralis.io/api/v2.2/wallets/${address}/swaps`
      );
      url.searchParams.set("chain", "base");
      url.searchParams.set("limit", "100");
      url.searchParams.set("order", "DESC");
      if (cursor) url.searchParams.set("cursor", cursor);

      console.log("[DeFiSwaps] (Moralis) Fetching:", url.toString());

      const res = await fetch(url.toString(), {
        method: "GET",
        headers: {
          accept: "application/json",
          "X-API-Key": MORALIS_API_KEY
        }
      });

      if (!res.ok) {
        const text = await res.text();
        console.error(
          "[DeFiSwaps] HTTP error:",
          res.status,
          text.slice(0, 300)
        );
        break;
      }

      const json = await res.json();
      const result = Array.isArray(json?.result) ? json.result : [];

      for (const swap of result) {
        swapsCount += 1;
        const v = Number(
          swap.totalValueUsd || swap.total_value_usd || 0
        );
        if (!Number.isNaN(v)) {
          swapsVolumeUsd += v;
        }
      }

      cursor = json.cursor || null;
      page += 1;
      if (!cursor) break;
    }
  } catch (err) {
    console.error("[DeFiSwaps] Error:", err);
  }

  return { swapsCount, swapsVolumeUsd };
}

// ----------------------------------------------------
// DeFi Liquidity / Yield via Moralis (v0)
// ----------------------------------------------------
async function fetchLiquidityYieldFromMoralis(address) {
  const apiKey = MORALIS_API_KEY;
  if (!apiKey) {
    console.warn("⚠️ MORALIS_API_KEY is missing, returning liquidityYieldRaw = 0");
    return 0;
  }

  const baseUrl = `https://deep-index.moralis.io/api/v2.2/wallets/${address}/defi/summary`;
  const url = new URL(baseUrl);
  url.searchParams.set("chain", "base");

  console.log(`🔍 Moralis DeFi summary for ${address}: ${url.toString()}`);

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      accept: "application/json",
      "X-API-Key": apiKey
    }
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(
      `❌ Moralis DeFi summary error ${res.status}: ${text.slice(0, 300)}`
    );
    return 0;
  }

  const data = await res.json();

  const totalValue = Number(data.total_usd_value || 0);
  const totalUnclaimed = Number(data.total_unclaimed_usd_value || 0);

  const safeTotal =
    (Number.isFinite(totalValue) ? totalValue : 0) +
    (Number.isFinite(totalUnclaimed) ? totalUnclaimed : 0);

  console.log(
    `✅ DeFi summary for ${address}: total_usd_value=${totalValue}, total_unclaimed_usd_value=${totalUnclaimed}, liquidityYieldRaw=${safeTotal}`
  );

  return safeTotal;
}

// ----------------------------------------------------
// Tier mapping
// ----------------------------------------------------
function clampTier(t) {
  if (!Number.isFinite(t)) return 0;
  return Math.min(5, Math.max(0, Math.round(t)));
}

function mapActivityDaysToTier(days) {
  if (days >= 365) return 5;
  if (days >= 180) return 4;
  if (days >= 60) return 3;
  if (days >= 10) return 2;
  if (days >= 1) return 1;
  return 0;
}

function mapTxCountToTier(tx) {
  if (tx >= 1000) return 5;
  if (tx >= 200) return 4;
  if (tx >= 50) return 3;
  if (tx >= 10) return 2;
  if (tx >= 1) return 1;
  return 0;
}

function mapDefiSwapsToTier(swaps) {
  if (swaps >= 500) return 5;
  if (swaps >= 100) return 4;
  if (swaps >= 25) return 3;
  if (swaps >= 5) return 2;
  if (swaps >= 1) return 1;
  return 0;
}

function mapNftMintsToTier(mints) {
  if (mints >= 51) return 5;
  if (mints >= 21) return 4;
  if (mints >= 11) return 3;
  if (mints >= 6) return 2;
  if (mints >= 3) return 1;
  return 0;
}

function mapGasSpentToTier(gasEth) {
  if (gasEth >= 500) return 5;
  if (gasEth >= 100) return 4;
  if (gasEth >= 25) return 3;
  if (gasEth >= 5) return 2;
  if (gasEth > 0) return 1;
  return 0;
}

function mapDefiVolumeToTier(volumeUsd) {
  if (volumeUsd >= 250000) return 5;
  if (volumeUsd >= 50000) return 4;
  if (volumeUsd >= 10000) return 3;
  if (volumeUsd >= 1000) return 2;
  if (volumeUsd > 0) return 1;
  return 0;
}

function mapLiquidityYieldToTier(raw) {
  if (raw >= 500000) return 5;
  if (raw >= 100000) return 4;
  if (raw >= 20000) return 3;
  if (raw >= 5000) return 2;
  if (raw > 0) return 1;
  return 0;
}

function mapBuilderScoreToTier(score) {
  if (!Number.isFinite(score)) return 0;
  if (score >= 90) return 5;
  if (score >= 70) return 4;
  if (score >= 50) return 3;
  if (score >= 30) return 2;
  if (score > 0) return 1;
  return 0;
}

function mapSocialScoreToTier(score) {
  if (!Number.isFinite(score)) return 0;
  if (score >= 90) return 5;
  if (score >= 70) return 4;
  if (score >= 50) return 3;
  if (score >= 30) return 2;
  if (score > 0) return 1;
  return 0;
}

// ----------------------------------------------------
// Label helpers
// ----------------------------------------------------
function labelActivityDays(tier) {
  switch (tier) {
    case 0:
      return "Dormant";
    case 1:
      return "Explorer";
    case 2:
      return "Regular";
    case 3:
      return "Native";
    case 4:
      return "Grinder";
    case 5:
      return "Base Addict";
    default:
      return "Unknown";
  }
}

function labelTxCount(tier) {
  switch (tier) {
    case 0:
      return "No Activity";
    case 1:
      return "Getting Started";
    case 2:
      return "Active User";
    case 3:
      return "Power User";
    case 4:
      return "Onchain DeGen";
    case 5:
      return "Tx Machine";
    default:
      return "Unknown";
  }
}

function labelDefiSwaps(tier) {
  switch (tier) {
    case 0:
      return "No DeFi";
    case 1:
      return "DeFi Tourist";
    case 2:
      return "DeFi User";
    case 3:
      return "DeFi Farmer";
    case 4:
      return "DeFi DeGen";
    case 5:
      return "DeFi Overlord";
    default:
      return "Unknown";
  }
}

function labelLiquidityYield(tier) {
  switch (tier) {
    case 0:
      return "No Liquidity";
    case 1:
      return "Test LP";
    case 2:
      return "Liquidity Provider";
    case 3:
      return "Yield Farmer";
    case 4:
      return "Protocol Pillar";
    case 5:
      return "Liquidity Whale";
    default:
      return "Unknown";
  }
}

function labelBuilder(tier) {
  switch (tier) {
    case 0:
      return "Not a Builder";
    case 1:
      return "Curious";
    case 2:
      return "Budding Builder";
    case 3:
      return "Experienced Builder";
    case 4:
      return "Base Builder";
    case 5:
      return "Master Architect";
    default:
      return "Unknown";
  }
}

function labelNftMints(tier) {
  switch (tier) {
    case 0:
      return "No NFTs";
    case 1:
      return "NFT Newbie";
    case 2:
      return "NFT Collector";
    case 3:
      return "NFT Enthusiast";
    case 4:
      return "NFT DeGen";
    case 5:
      return "NFT Whale";
    default:
      return "Unknown";
  }
}

function labelSocial(tier) {
  switch (tier) {
    case 0:
      return "Silent";
    case 1:
      return "Observer";
    case 2:
      return "Active";
    case 3:
      return "Voice";
    case 4:
      return "Influencer";
    case 5:
      return "Onchain Celebrity";
    default:
      return "Unknown";
  }
}

function labelGasSpent(tier) {
  switch (tier) {
    case 0:
      return "No Ring";
    case 1:
      return "Faded Ring";
    case 2:
      return "Bronze Ring";
    case 3:
      return "Silver Ring";
    case 4:
      return "Gold Ring";
    case 5:
      return "Mythic Ring";
    default:
      return "Unknown Ring";
  }
}

function labelDefiVolume(tier) {
  switch (tier) {
    case 0:
      return "Barefoot";
    case 1:
      return "Dusty Sandals";
    case 2:
      return "Traveler Boots";
    case 3:
      return "Explorer Boots";
    case 4:
      return "Blazing Boots";
    case 5:
      return "Warp Boots";
    default:
      return "Unknown Boots";
  }
}

function labelOverallTier(tier) {
  switch (tier) {
    case 0:
      return "Newcomer";
    case 1:
      return "Base Explorer";
    case 2:
      return "Base Adept";
    case 3:
      return "Base Native";
    case 4:
      return "Base Veteran";
    case 5:
      return "Base Legend";
    default:
      return "Unknown";
  }
}

// ----------------------------------------------------
// Overall tier / score
// ----------------------------------------------------
function computeOverallTier(tiers) {
  const values = Object.values(tiers).map((t) => Number(t || 0));
  if (!values.length) return 0;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return clampTier(avg);
}

function computeOverallScore(tiers) {
  const values = Object.values(tiers).map((t) => Number(t || 0));
  if (!values.length) return 0;
  const sum = values.reduce((a, b) => a + b, 0);
  const max = 5 * values.length;
  return Math.round((sum / max) * 100);
}

// ----------------------------------------------------
// Beast preview
// ----------------------------------------------------
function computeUserType(builderTier, socialTier) {
  if (builderTier >= 4) return "Builder";
  if (socialTier >= 4) return "Influencer";
  return "User";
}

function computeRarityFromOverallTier(overallTier) {
  if (overallTier >= 5) return "Mythic";
  if (overallTier >= 4) return "Legendary";
  if (overallTier >= 3) return "Epic";
  if (overallTier >= 2) return "Rare";
  if (overallTier >= 1) return "Uncommon";
  return "Common";
}

function buildBeastPreview(basePreview, tiers) {
  const preview = {
    species_id: basePreview?.species_id ?? 1,
    rarity: computeRarityFromOverallTier(tiers.overall || 0),
    user_type: computeUserType(tiers.builder || 0, tiers.social || 0),
    visual_traits: {}
  };

  const visual = basePreview?.visual_traits || {};

  preview.visual_traits.size = {
    source_metric: "activity_days",
    tier: tiers.activity_days || 0,
    label: labelActivityDays(tiers.activity_days || 0),
    description:
      visual.size?.description ||
      "Activity level over time in the Base network."
  };

  preview.visual_traits.muscles = {
    source_metric: "tx_count",
    tier: tiers.tx_count || 0,
    label: labelTxCount(tiers.tx_count || 0),
    description:
      visual.muscles?.description ||
      "How many transactions this Beast has pushed onchain."
  };

  preview.visual_traits.weapon = {
    source_metric: "defi_swaps",
    tier: tiers.defi_swaps || 0,
    label: labelDefiSwaps(tiers.defi_swaps || 0),
    description:
      visual.weapon?.description || "DeFi activity through swaps and trades."
  };

  preview.visual_traits.shield = {
    source_metric: "liquidity_yield",
    tier: tiers.liquidity_yield || 0,
    label: labelLiquidityYield(tiers.liquidity_yield || 0),
    description:
      visual.shield?.description ||
      "Strength of LP, lending and staking positions."
  };

  preview.visual_traits.armor = {
    source_metric: "builder",
    tier: tiers.builder || 0,
    label: labelBuilder(tiers.builder || 0),
    description:
      visual.armor?.description ||
      "Builder reputation in the Base ecosystem."
  };

  preview.visual_traits.neck_medallion = {
    source_metric: "nft_mints",
    tier: tiers.nft_mints || 0,
    label: labelNftMints(tiers.nft_mints || 0),
    description:
      visual.neck_medallion?.description ||
      "NFT minting history on Base."
  };

  preview.visual_traits.helmet = {
    source_metric: "social",
    tier: tiers.social || 0,
    label: labelSocial(tiers.social || 0),
    description:
      visual.helmet?.description ||
      "Offchain & onchain social influence."
  };

  preview.visual_traits.ring = {
    source_metric: "gas_spent",
    tier: tiers.gas_spent || 0,
    label: labelGasSpent(tiers.gas_spent || 0),
    description:
      visual.ring?.description ||
      "Ring forged from the gas this Beast has burned on Base."
  };

  preview.visual_traits.boots = {
    source_metric: "defi_volume",
    tier: tiers.defi_volume || 0,
    label: labelDefiVolume(tiers.defi_volume || 0),
    description:
      visual.boots?.description ||
      "Boots that reflect how much DeFi ground this Beast has covered on Base."
  };

  return preview;
}

// ----------------------------------------------------
// Routes
// ----------------------------------------------------
app.get("/", (_req, res) => {
  res.json({ ok: true, name: "Base Beast backend", version: "0.18" });
});

// Main scoring endpoint
app.get("/api/wallet/:address/score", async (req, res) => {
  const { address } = req.params;

  if (!address) {
    return res.status(400).json({ error: "Missing address param" });
  }

  try {
    const baseProfile = await loadJsonFromMocks("wallet_profile_example.json");
    const data = JSON.parse(JSON.stringify(baseProfile));

    const lowerAddr = address.toLowerCase();
    const manual = MANUAL_SCORES[lowerAddr] || {};
    if (manual.builder_score != null || manual.social_score != null) {
      console.log(
        `[ManualScores] Overrides for ${lowerAddr}:`,
        JSON.stringify(manual)
      );
    }

    const { txCount, activityDays, gasSpentNative } = await fetchTxStats(
      address
    );
    const nftMintsRaw = await fetchNftMintsFromMoralis(address);
    const { swapsCount, swapsVolumeUsd } = await fetchDefiSwapsFromMoralis(
      address
    );
    const liquidityYieldRaw = await fetchLiquidityYieldFromMoralis(address);

    // manual builder / social имеют приоритет над моковыми raw_value
    const builderScoreRaw =
      manual.builder_score ??
      Number(data.scores.metrics.builder.raw_value || 0);
    const socialScoreRaw =
      manual.social_score ??
      Number(data.scores.metrics.social.raw_value || 0);

    const activityTier = mapActivityDaysToTier(activityDays);
    const txTier = mapTxCountToTier(txCount);
    const defiSwapsTier = mapDefiSwapsToTier(swapsCount);
    const nftMintsTier = mapNftMintsToTier(nftMintsRaw);
    const gasSpentTier = mapGasSpentToTier(gasSpentNative);
    const defiVolumeTier = mapDefiVolumeToTier(swapsVolumeUsd);
    const liquidityTier = mapLiquidityYieldToTier(liquidityYieldRaw);
    const builderTier = mapBuilderScoreToTier(builderScoreRaw);
    const socialTier = mapSocialScoreToTier(socialScoreRaw);

    const tiers = {
      activity_days: activityTier,
      tx_count: txTier,
      defi_swaps: defiSwapsTier,
      liquidity_yield: liquidityTier,
      builder: builderTier,
      nft_mints: nftMintsTier,
      social: socialTier,
      gas_spent: gasSpentTier,
      defi_volume: defiVolumeTier
    };

    data.scores.tiers = tiers;

    const metrics = data.scores.metrics;

    metrics.activity_days.raw_value = activityDays;
    metrics.activity_days.tier = activityTier;
    metrics.activity_days.tier_label = labelActivityDays(activityTier);

    metrics.tx_count.raw_value = txCount;
    metrics.tx_count.tier = txTier;
    metrics.tx_count.tier_label = labelTxCount(txTier);

    metrics.defi_swaps.raw_value = swapsCount;
    metrics.defi_swaps.tier = defiSwapsTier;
    metrics.defi_swaps.tier_label = labelDefiSwaps(defiSwapsTier);

    metrics.nft_mints.raw_value = nftMintsRaw;
    metrics.nft_mints.tier = nftMintsTier;
    metrics.nft_mints.tier_label = labelNftMints(nftMintsTier);

    metrics.gas_spent.raw_value = gasSpentNative;
    metrics.gas_spent.tier = gasSpentTier;
    metrics.gas_spent.tier_label = labelGasSpent(gasSpentTier);

    metrics.defi_volume.raw_value = swapsVolumeUsd;
    metrics.defi_volume.tier = defiVolumeTier;
    metrics.defi_volume.tier_label = labelDefiVolume(defiVolumeTier);

    metrics.liquidity_yield.raw_value = liquidityYieldRaw;
    metrics.liquidity_yield.tier = liquidityTier;
    metrics.liquidity_yield.tier_label = labelLiquidityYield(liquidityTier);

    metrics.builder.raw_value = builderScoreRaw;
    metrics.builder.tier = builderTier;
    metrics.builder.tier_label = labelBuilder(builderTier);

    metrics.social.raw_value = socialScoreRaw;
    metrics.social.tier = socialTier;
    metrics.social.tier_label = labelSocial(socialTier);

    const overallTier = computeOverallTier(tiers);
    const overallLabel = labelOverallTier(overallTier);
    const overallScore = computeOverallScore(tiers);

    data.scores.overall.tier = overallTier;
    data.scores.overall.label = overallLabel;
    data.scores.overall.score = overallScore;

    data.address = address;
    data.network = "base-mainnet";
    data.updated_at = new Date().toISOString();

    data.beast_preview = buildBeastPreview(baseProfile.beast_preview, {
      ...tiers,
      overall: overallTier
    });

    res.json(data);
  } catch (err) {
    console.error("[/api/wallet/:address/score] error:", err);
    res.status(500).json({ error: "Failed to build wallet score" });
  }
});

// Static metadata (пока мок)
app.get("/api/beast/:tokenId/metadata", async (req, res) => {
  try {
    const metadata = await loadJsonFromMocks("beast_0_metadata.json");
    res.json(metadata);
  } catch (err) {
    console.error("[/api/beast/:tokenId/metadata] error:", err);
    res.status(500).json({ error: "Failed to load metadata" });
  }
});

app.listen(PORT, () => {
  console.log(`Base Beast backend listening on http://localhost:${PORT}`);
});
