// backend/server.js
// Base Beast backend
// v0.13 – Moralis for tx+NFT stats (Etherscan as fallback) + cleaned beast_preview

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

// ESM helpers
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// -----------------------------
// Utils: load JSON from mocks
// -----------------------------
async function loadJsonFromMocks(filename) {
  const filePath = path.join(__dirname, "mocks", filename);
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

// -----------------------------
// Helper: fetch tx stats (Moralis → Etherscan fallback)
// -----------------------------
//
// txCount:
//   - Moralis: json.transactions.total
// activityDays (MVP):
//   - эвристика: ceil(txCount / 4), не больше 365
//
async function fetchTxStats(address) {
  const lowerAddr = String(address || "").toLowerCase();
  const defaults = { txCount: 0, activityDays: 0 };

  // 1) Preferred: Moralis wallet stats
  if (MORALIS_API_KEY) {
    try {
      const url = new URL(
        `https://deep-index.moralis.io/api/v2.2/wallets/${address}/stats`
      );
      url.searchParams.set("chain", "base");

      console.log("[TxStats] (Moralis) Fetching:", url.toString());

      const res = await fetch(url, {
        method: "GET",
        headers: {
          accept: "application/json",
          "X-API-Key": MORALIS_API_KEY
        }
      });

      if (!res.ok) {
        const text = await res.text();
        console.error(
          "[TxStats] (Moralis) HTTP error:",
          res.status,
          text.slice(0, 300)
        );
      } else {
        const json = await res.json();
        const txTotal = Number(json?.transactions?.total || 0);

        // MVP: считаем, что в среднем ~4 транзакции в активный день.
        const activityDays =
          txTotal > 0 ? Math.min(Math.ceil(txTotal / 4), 365) : 0;

        console.log(
          `[TxStats] (Moralis) ${address} → txCount=${txTotal}, estActivityDays=${activityDays}`
        );

        return { txCount: txTotal, activityDays };
      }
    } catch (err) {
      console.error("[TxStats] (Moralis) Error:", err);
    }
  } else {
    console.warn("[TxStats] MORALIS_API_KEY not set, skipping Moralis stats");
  }

  // 2) Fallback: Etherscan v2 (если Moralis недоступен)
  if (!ETHERSCAN_API_KEY) {
    console.warn(
      "[TxStats] ETHERSCAN_API_KEY not set, returning default tx stats"
    );
    return defaults;
  }

  try {
    const url = new URL("https://api.etherscan.io/v2/api");
    url.searchParams.set("chainid", "8453"); // Base mainnet
    url.searchParams.set("module", "account");
    url.searchParams.set("action", "txlist");
    url.searchParams.set("address", address);
    url.searchParams.set("startblock", "0");
    url.searchParams.set("endblock", "9999999999");
    url.searchParams.set("page", "1");
    url.searchParams.set("offset", "10000");
    url.searchParams.set("sort", "asc");
    url.searchParams.set("apikey", ETHERSCAN_API_KEY);

    console.log("[TxStats] (Etherscan) Fetching:", url.toString());
    const res = await fetch(url);
    const json = await res.json();

    console.log(
      "[TxStats] (Etherscan) status:",
      json.status,
      "message:",
      json.message
    );

    if (!json || json.status !== "1" || !Array.isArray(json.result) || json.result.length === 0) {
      console.warn("[TxStats] (Etherscan) No tx result for", address);
      return defaults;
    }

    let outgoingCount = 0;
    const activeDays = new Set();

    for (const tx of json.result) {
      const from = String(tx.from || "").toLowerCase();
      const to = String(tx.to || "").toLowerCase();
      const ts = Number(tx.timeStamp);

      if (!Number.isNaN(ts) && ts > 0 && (from === lowerAddr || to === lowerAddr)) {
        const day = new Date(ts * 1000).toISOString().slice(0, 10);
        activeDays.add(day);
      }

      if (from === lowerAddr) outgoingCount += 1;
    }

    const stats = { txCount: outgoingCount, activityDays: activeDays.size };
    console.log(
      `[TxStats] (Etherscan) ${address} → txCount=${stats.txCount}, activityDays=${stats.activityDays}`
    );
    return stats;
  } catch (err) {
    console.error("[TxStats] (Etherscan) error:", err);
    return defaults;
  }
}

// -----------------------------
// Helper: Fetch NFT mints via Moralis
// -----------------------------
//
// Логика:
// - берём все NFT-трансферы на Base для кошелька
// - считаем только события, где:
//      from_address == 0x0000...0000 (mint)
//      to_address   == наш адрес
//      событие не помечено как spam/scam
//
async function fetchNftMintsFromMoralis(address) {
  const lowerAddr = String(address || "").toLowerCase();

  if (!MORALIS_API_KEY) {
    console.warn("[NFT] MORALIS_API_KEY not set; returning 0 NFT mints");
    return 0;
  }

  let totalMints = 0;
  let cursor = null;
  let page = 0;

  try {
    while (true) {
      const url = new URL(
        `https://deep-index.moralis.io/api/v2.2/${address}/nft/transfers`
      );
      url.searchParams.set("chain", "base");
      url.searchParams.set("limit", "100");
      url.searchParams.set("order", "ASC");
      if (cursor) {
        url.searchParams.set("cursor", cursor);
      }

      console.log(
        `[NFT] page=${page} cursor=${cursor || "none"} → ${url.toString()}`
      );

      const res = await fetch(url, {
        method: "GET",
        headers: {
          accept: "application/json",
          "X-API-Key": MORALIS_API_KEY
        }
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("[NFT] Moralis HTTP error:", res.status, text.slice(0, 300));
        break;
      }

      const json = await res.json();

      if (!json || !Array.isArray(json.result)) {
        console.warn("[NFT] Moralis response has no result array");
        break;
      }

      const zeroAddr = "0x0000000000000000000000000000000000000000";

      const pageMints = json.result.filter((ev) => {
        const from = String(ev.from_address || "").toLowerCase();
        const to = String(ev.to_address || "").toLowerCase();
        const spam =
          ev.possible_spam === true ||
          ev.possible_spam === "true" ||
          ev.category === "spam";

        return !spam && from === zeroAddr && to === lowerAddr;
      }).length;

      totalMints += pageMints;

      console.log(
        `[NFT] page=${page}: result=${json.result.length}, mintedHere=${pageMints}, totalMintsSoFar=${totalMints}`
      );

      if (!json.cursor) {
        break;
      }

      cursor = json.cursor;
      page += 1;

      if (page > 5) {
        console.warn("[NFT] Reached page limit (5), stopping pagination");
        break;
      }
    }

    console.log(`[NFT] Final mint count for ${address}: ${totalMints}`);
    return totalMints;
  } catch (err) {
    console.error("[NFT] Error while fetching NFT transfers:", err);
    return 0;
  }
}

// -----------------------------
// Tier mappers
// -----------------------------
function mapTxCountToTier(raw) {
  if (raw < 10) return 0;
  if (raw < 50) return 1;
  if (raw < 150) return 2;
  if (raw < 500) return 3;
  if (raw < 1000) return 4;
  return 5;
}

function mapActivityDaysToTier(raw) {
  if (raw < 3) return 0;
  if (raw < 14) return 1;
  if (raw < 60) return 2;
  if (raw < 180) return 3;
  if (raw < 365) return 4;
  return 5;
}

function mapDefiSwapsToTier(raw) {
  if (raw < 5) return 0;
  if (raw < 20) return 1;
  if (raw < 50) return 2;
  if (raw < 150) return 3;
  if (raw < 400) return 4;
  return 5;
}

// Liquidity & Yield: USD_volume * days
function mapLiquidityYieldToTier(raw) {
  if (raw < 1000) return 0;      // < 1k USD*days
  if (raw < 10000) return 1;     // 1k–10k
  if (raw < 100000) return 2;    // 10k–100k
  if (raw < 500000) return 3;    // 100k–500k
  if (raw < 2000000) return 4;   // 500k–2M
  return 5;                      // >=2M
}

// Builder = Talent Protocol Builder Score (0–100)
function mapBuilderScoreToTier(raw) {
  if (raw < 20) return 0;
  if (raw < 40) return 1;
  if (raw < 60) return 2;
  if (raw < 75) return 3;
  if (raw < 90) return 4;
  return 5;
}

// NFT mints tiers (by count)
function mapNftMintsToTier(raw) {
  if (raw < 3) return 0;
  if (raw <= 5) return 1;
  if (raw <= 10) return 2;
  if (raw <= 20) return 3;
  if (raw <= 50) return 4;
  return 5;
}

// Social score tiers (0–100)
function mapSocialScoreToTier(raw) {
  if (raw < 10) return 0;
  if (raw < 25) return 1;
  if (raw < 40) return 2;
  if (raw < 60) return 3;
  if (raw < 80) return 4;
  return 5;
}

// Overall tier = rounded average
function computeOverallTier(tiers) {
  const values = [
    tiers.activity_days ?? 0,
    tiers.tx_count ?? 0,
    tiers.defi_swaps ?? 0,
    tiers.liquidity_yield ?? 0,
    tiers.builder ?? 0,
    tiers.nft_mints ?? 0,
    tiers.social ?? 0
  ];
  const valid = values.filter((v) => typeof v === "number" && v >= 0);
  if (!valid.length) return 0;
  const sum = valid.reduce((acc, v) => acc + v, 0);
  return Math.round(sum / valid.length);
}

// Overall score 0–100
function computeOverallScore(tiers) {
  const values = [
    tiers.activity_days ?? 0,
    tiers.tx_count ?? 0,
    tiers.defi_swaps ?? 0,
    tiers.liquidity_yield ?? 0,
    tiers.builder ?? 0,
    tiers.nft_mints ?? 0,
    tiers.social ?? 0
  ];
  const valid = values.filter((v) => typeof v === "number" && v >= 0);
  if (!valid.length) return 0;
  const sum = valid.reduce((acc, v) => acc + v, 0);
  const maxTier = 5;
  const score = (sum / (valid.length * maxTier)) * 100;
  return Math.round(score);
}

// -----------------------------
// Label helpers (metrics)
// -----------------------------
function labelActivityDays(tier) {
  const labels = [
    "Dormant",
    "Explorer",
    "Regular",
    "Committed",
    "Resident",
    "Base Native"
  ];
  return labels[tier] || "Unknown";
}

function labelTxCount(tier) {
  const labels = [
    "No Activity",
    "Getting Started",
    "Active User",
    "Power User",
    "Heavy User",
    "Onchain Addict"
  ];
  return labels[tier] || "Unknown";
}

function labelDefiSwaps(tier) {
  const labels = [
    "No DeFi",
    "DEX Newbie",
    "DEX Explorer",
    "Active Trader",
    "DeFi Native",
    "DeFi Beast"
  ];
  return labels[tier] || "Unknown";
}

function labelLiquidityYield(tier) {
  const labels = [
    "No Liquidity",
    "LP Newbie",
    "Liquidity Provider",
    "Yield Farmer",
    "DeFi Guardian",
    "Protocol Pillar"
  ];
  return labels[tier] || "Unknown";
}

function labelBuilder(tier) {
  const labels = [
    "Not a Builder",
    "Learning Builder",
    "Junior Builder",
    "Pro Builder",
    "Senior Builder",
    "Ecosystem Architect"
  ];
  return labels[tier] || "Unknown";
}

function labelNftMints(tier) {
  const labels = [
    "No NFTs",
    "NFT Tourist",
    "NFT Collector",
    "NFT Enthusiast",
    "NFT Whale",
    "NFT Legend"
  ];
  return labels[tier] || "Unknown";
}

function labelSocial(tier) {
  const labels = [
    "Silent",
    "Local Voice",
    "Rising Influencer",
    "Recognized Influencer",
    "KOL",
    "Social Beast"
  ];
  return labels[tier] || "Unknown";
}

function labelOverallTier(tier) {
  const labels = [
    "Newcomer",
    "Base Explorer",
    "Base Adept",
    "Base Native",
    "Base Elite",
    "Base Legend"
  ];
  return labels[tier] || "Unknown";
}

// -----------------------------
// Visual trait builders (beast_preview)
// -----------------------------
function buildSizeTrait(tier) {
  const variants = [
    {
      label: "Tiny",
      description: "Just spawned on Base."
    },
    {
      label: "Small",
      description: "Early explorer with a few active days on Base."
    },
    {
      label: "Medium",
      description: "Regular Base user with consistent activity."
    },
    {
      label: "Large",
      description: "Committed Base resident with a long history."
    },
    {
      label: "Huge",
      description: "Lives on Base almost every day."
    },
    {
      label: "Titan",
      description: "True Base native with massive activity streak."
    }
  ];
  const v = variants[tier] || variants[0];
  return {
    source_metric: "activity_days",
    tier,
    label: v.label,
    description: v.description
  };
}

function buildMusclesTrait(tier) {
  const variants = [
    {
      label: "No Muscles",
      description: "No visible onchain activity yet."
    },
    {
      label: "Lean",
      description: "Just getting into basic onchain actions."
    },
    {
      label: "Fit",
      description: "Comfortable with regular transactions on Base."
    },
    {
      label: "Strong",
      description: "Power user with heavy Base activity."
    },
    {
      label: "Shredded",
      description: "Very high throughput across Base protocols."
    },
    {
      label: "Overpowered",
      description: "Onchain machine with insane transaction volume."
    }
  ];
  const v = variants[tier] || variants[0];
  return {
    source_metric: "tx_count",
    tier,
    label: v.label,
    description: v.description
  };
}

function buildWeaponTrait(tier) {
  const variants = [
    {
      label: "No Weapon",
      description: "Has not touched DeFi swaps yet."
    },
    {
      label: "Wooden Sword",
      description: "First steps into DEX swaps on Base."
    },
    {
      label: "Steel Sword",
      description: "Comfortable with DeFi trading."
    },
    {
      label: "Greatsword",
      description: "Active DeFi trader across Base DEXes."
    },
    {
      label: "Mythic Blade",
      description: "DeFi native warrior on Base."
    },
    {
      label: "Legendary Relic",
      description: "DeFi beast with massive swap footprint."
    }
  ];
  const v = variants[tier] || variants[0];
  return {
    source_metric: "defi_swaps",
    tier,
    label: v.label,
    description: v.description
  };
}

function buildShieldTrait(tier) {
  const variants = [
    {
      label: "No Shield",
      description: "No LP, lending or staking activity."
    },
    {
      label: "Wooden Shield",
      description: "First LP or yield experiments."
    },
    {
      label: "Iron Shield",
      description: "Provides useful liquidity / lending positions."
    },
    {
      label: "Reinforced Shield",
      description: "Actively farming yield on Base."
    },
    {
      label: "Guardian Shield",
      description: "Defends large DeFi positions with care."
    },
    {
      label: "Aegis of Base",
      description: "Pillar of Base liquidity and yield strategies."
    }
  ];
  const v = variants[tier] || variants[0];
  return {
    source_metric: "liquidity_yield",
    tier,
    label: v.label,
    description: v.description
  };
}

function buildArmorTrait(tier) {
  const variants = [
    {
      label: "No Armor",
      description: "Has not earned builder armor yet."
    },
    {
      label: "Leather Armor",
      description: "Learning how to build on Base."
    },
    {
      label: "Chainmail Armor",
      description: "Shipping first smart contracts."
    },
    {
      label: "Plate Armor",
      description: "Confident Base builder with real deployments."
    },
    {
      label: "Techno Armor",
      description: "Senior contributor to Base ecosystem."
    },
    {
      label: "Celestial Armor",
      description: "Architect-level builder shaping Base."
    }
  ];
  const v = variants[tier] || variants[0];
  return {
    source_metric: "builder",
    tier,
    label: v.label,
    description: v.description
  };
}

function buildNeckMedallionTrait(tier) {
  const variants = [
    {
      label: "No Medallion",
      description: "Has not minted NFTs on Base yet."
    },
    {
      label: "Bronze Medallion",
      description: "NFT tourist with a few Base mints."
    },
    {
      label: "Silver Medallion",
      description: "Active NFT collector on Base."
    },
    {
      label: "Gold Medallion",
      description: "NFT enthusiast with many Base mints."
    },
    {
      label: "Platinum Medallion",
      description: "NFT whale dominating Base collections."
    },
    {
      label: "Mythic Medallion",
      description: "NFT legend of the Base ecosystem."
    }
  ];
  const v = variants[tier] || variants[0];
  return {
    source_metric: "nft_mints",
    tier,
    label: v.label,
    description: v.description
  };
}

function buildHelmetTrait(tier) {
  const variants = [
    {
      label: "No Helmet",
      description: "No visible social presence yet."
    },
    {
      label: "Street Cap",
      description: "Local voice among Base users."
    },
    {
      label: "Scout Helm",
      description: "Rising influencer in the ecosystem."
    },
    {
      label: "Influencer Helm",
      description: "Recognized by the Base community."
    },
    {
      label: "KOL Crown",
      description: "Key opinion leader on Base social."
    },
    {
      label: "Beast Crown",
      description: "True social Beast of Base."
    }
  ];
  const v = variants[tier] || variants[0];
  return {
    source_metric: "social",
    tier,
    label: v.label,
    description: v.description
  };
}

// -----------------------------
// User type for beast_preview
// -----------------------------
function deriveUserType(builderTier, socialTier) {
  if (builderTier >= 4) return "Builder";
  if (socialTier >= 4) return "Influencer";
  return "User";
}

// -----------------------------
// Routes
// -----------------------------
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    name: "Base Beast backend",
    version: "0.13.0",
    network: "base-mainnet"
  });
});

app.get("/api/wallet/:address/score", async (req, res) => {
  const address = String(req.params.address || "").trim();
  if (!address) {
    return res.status(400).json({ error: "Address is required" });
  }

  console.log(">>> API /api/wallet called! <<<");
  console.log("Handling /api/wallet for:", address);

  try {
    // 1) Load template
    let data = await loadJsonFromMocks("wallet_profile_example.json");

    // Ensure scores object exists
    data.scores = data.scores || {};
    data.scores.metrics = data.scores.metrics || {};
    data.scores.tiers = data.scores.tiers || {};

    // 2) Basic info
    data.address = address;
    data.network = "base-mainnet";
    data.updated_at = new Date().toISOString();

    const metrics = data.scores.metrics;

    // Raw values from template as fallback
    let txCountRaw = Number(metrics.tx_count?.raw_value || 0);
    let activityDaysRaw = Number(metrics.activity_days?.raw_value || 0);
    let defiSwapsRaw = Number(metrics.defi_swaps?.raw_value || 0);
    let liquidityRaw = Number(metrics.liquidity_yield?.raw_value || 0);
    let builderRaw = Number(metrics.builder?.raw_value || 0);
    let nftMintsRaw = Number(metrics.nft_mints?.raw_value || 0);
    let socialRaw = Number(metrics.social?.raw_value || 0);

    // 3) Real tx stats (Moralis → Etherscan fallback)
    const { txCount, activityDays } = await fetchTxStats(address);
    txCountRaw = txCount;
    activityDaysRaw = activityDays;

    // 4) Real NFT mints via Moralis
    const nftMints = await fetchNftMintsFromMoralis(address);
    nftMintsRaw = nftMints;

    // 5) Map raw → tiers
    const txTier = mapTxCountToTier(txCountRaw);
    const actTier = mapActivityDaysToTier(activityDaysRaw);
    const defiTier = mapDefiSwapsToTier(defiSwapsRaw);
    const liqTier = mapLiquidityYieldToTier(liquidityRaw);
    const builderTier = mapBuilderScoreToTier(builderRaw);
    const nftMintsTier = mapNftMintsToTier(nftMintsRaw);
    const socialTier = mapSocialScoreToTier(socialRaw);

    const tiers = data.scores.tiers;
    tiers.activity_days = actTier;
    tiers.tx_count = txTier;
    tiers.defi_swaps = defiTier;
    tiers.liquidity_yield = liqTier;
    tiers.builder = builderTier;
    tiers.nft_mints = nftMintsTier;
    tiers.social = socialTier;

    const overallTier = computeOverallTier(tiers);
    const overallScore = computeOverallScore(tiers);
    tiers.overall = overallTier;

    data.scores.tiers = tiers;
    data.scores.overall = {
      tier: overallTier,
      label: labelOverallTier(overallTier),
      score: overallScore
    };

    // 6) metrics filled
    data.scores.metrics.activity_days = {
      ...(metrics.activity_days || {}),
      raw_value: activityDaysRaw,
      tier: actTier,
      tier_label: labelActivityDays(actTier)
    };
    data.scores.metrics.tx_count = {
      ...(metrics.tx_count || {}),
      raw_value: txCountRaw,
      tier: txTier,
      tier_label: labelTxCount(txTier)
    };
    data.scores.metrics.defi_swaps = {
      ...(metrics.defi_swaps || {}),
      raw_value: defiSwapsRaw,
      tier: defiTier,
      tier_label: labelDefiSwaps(defiTier)
    };
    data.scores.metrics.liquidity_yield = {
      ...(metrics.liquidity_yield || {}),
      raw_value: liquidityRaw,
      tier: liqTier,
      tier_label: labelLiquidityYield(liqTier)
    };
    data.scores.metrics.builder = {
      ...(metrics.builder || {}),
      raw_value: builderRaw,
      tier: builderTier,
      tier_label: labelBuilder(builderTier)
    };
    data.scores.metrics.nft_mints = {
      ...(metrics.nft_mints || {}),
      raw_value: nftMintsRaw,
      tier: nftMintsTier,
      tier_label: labelNftMints(nftMintsTier)
    };
    data.scores.metrics.social = {
      ...(metrics.social || {}),
      raw_value: socialRaw,
      tier: socialTier,
      tier_label: labelSocial(socialTier)
    };

    // 7) beast_preview – полностью от тиров
    const existingBeast = data.beast_preview || {};

    const userType = deriveUserType(builderTier, socialTier);

    data.beast_preview = {
      species_id: existingBeast.species_id ?? 1,
      rarity: existingBeast.rarity ?? "Common",
      user_type: userType,
      visual_traits: {
        size: buildSizeTrait(actTier),
        muscles: buildMusclesTrait(txTier),
        weapon: buildWeaponTrait(defiTier),
        shield: buildShieldTrait(liqTier),
        armor: buildArmorTrait(builderTier),
        neck_medallion: buildNeckMedallionTrait(nftMintsTier),
        helmet: buildHelmetTrait(socialTier)
      }
    };

    console.log(
      `[WalletScore] ${address} → tx=${txCountRaw}, days=${activityDaysRaw}, nftMints=${nftMintsRaw}, overallTier=${overallTier}, overallScore=${overallScore}`
    );

    return res.json(data);
  } catch (err) {
    console.error("Error in /api/wallet/:address/score:", err);
    return res
      .status(500)
      .json({ error: "Failed to load wallet profile or compute metrics" });
  }
});

app.get("/api/beast/:tokenId/metadata", async (req, res) => {
  const tokenId = String(req.params.tokenId || "0").trim();
  try {
    let metadata = await loadJsonFromMocks("beast_0_metadata.json");
    metadata.name = `Base Beast #${tokenId}`;
    metadata.external_url = `https://app.basebeast.xyz/beast/${tokenId}`;
    return res.json(metadata);
  } catch (err) {
    console.error("Error in /api/beast/:tokenId/metadata:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log("===============================================");
  console.log(" Base Beast backend v0.13");
  console.log(" Moralis for tx+NFT, Etherscan fallback");
  console.log(" ETHERSCAN_API_KEY set:", !!ETHERSCAN_API_KEY);
  console.log(" MORALIS_API_KEY set:", !!MORALIS_API_KEY);
  console.log("===============================================");
  console.log(`Listening on http://localhost:${PORT}`);
});
