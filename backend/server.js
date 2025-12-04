import "dotenv/config";
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 4000;

console.log("Base Beast backend v0.9 (Etherscan v2: tx_count + activity_days + defi_swaps) starting...");

// ESM: собираем __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔑 API key от Etherscan v2 (ты уже его завёл и он работает)
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";
console.log("ETHERSCAN_API_KEY length:", ETHERSCAN_API_KEY.length);
console.log("RUNTIME BACKEND FILE:", __filename);

// Вспомогательная функция: читаем JSON-файлы
function loadJson(relativePath) {
  const fullPath = path.join(__dirname, relativePath);
  const raw = fs.readFileSync(fullPath, "utf8");
  return JSON.parse(raw);
}

// --- Маппинг tx_count -> tier ---
function mapTxCountToTier(rawTxCount) {
  if (rawTxCount >= 1000) return 5;
  if (rawTxCount >= 500) return 4;
  if (rawTxCount >= 150) return 3;
  if (rawTxCount >= 50) return 2;
  if (rawTxCount >= 10) return 1;
  return 0;
}

const TX_TIER_LABELS = [
  "Onchain Newbie",   // 0
  "Getting Started",  // 1
  "Regular User",     // 2
  "Power User",       // 3
  "Heavy User",       // 4
  "Onchain Degen"     // 5
];

// --- Маппинг activity_days -> tier ---
function mapActivityDaysToTier(rawDays) {
  if (rawDays >= 365) return 5;
  if (rawDays >= 180) return 4;
  if (rawDays >= 60) return 3;
  if (rawDays >= 14) return 2;
  if (rawDays >= 3) return 1;
  return 0;
}

const ACTIVITY_TIER_LABELS = [
  "Newcomer",   // 0
  "Explorer",   // 1
  "Regular",    // 2
  "Native",     // 3
  "Veteran",    // 4
  "OG"          // 5
];

// --- Маппинг defi_swaps -> tier ---
function mapDefiSwapsToTier(rawSwaps) {
  if (rawSwaps >= 500) return 5;
  if (rawSwaps >= 100) return 4;
  if (rawSwaps >= 20)  return 3;
  if (rawSwaps >= 5)   return 2;
  if (rawSwaps >= 1)   return 1;
  return 0;
}

const DEFI_TIER_LABELS = [
  "No DeFi",          // 0
  "Getting Started",  // 1
  "Onchain Explorer", // 2
  "DeFi User",        // 3
  "DeFi Power User",  // 4
  "DeFi DeGen"        // 5
];

// --- эвристика: функция похожа на DeFi swap / route / bridge ---
function isDefiLikeFunctionName(fnRaw) {
  if (!fnRaw) return false;

  const fn = String(fnRaw).toLowerCase().trim();

  // иногда Etherscan даёт "swap (uint256,uint256,...)" — вытащим "swap"
  const baseName = fn.split("(")[0].trim();

  const keywords = [
    "swap",
    "route",
    "bridge",
    "zap",
    "liquidity",
    "stake",
    "unstake",
    "deposit",
    "withdraw",
    "borrow",
    "repay",
    "flash"
  ];

  // отсекаем чистые transfer/approve/mint
  const blacklist = ["transfer", "approve", "mint", "send"];

  if (blacklist.some((b) => baseName.includes(b))) {
    return false;
  }

  return keywords.some((kw) => baseName.includes(kw));
}

// --- Тянем normal tx через Etherscan v2 (chainid=8453 = Base Mainnet) ---
// и сразу считаем:
//  - txCount (исходящие)
//  - activityDays (любой from/to)
//  - defiSwaps (исходящие с functionName похожим на DeFi)
async function fetchTxStatsFromEtherscan(address) {
  if (!ETHERSCAN_API_KEY) {
    console.warn("No ETHERSCAN_API_KEY set; returning null stats");
    return null;
  }

  const url = new URL("https://api.etherscan.io/v2/api");
  url.searchParams.set("chainid", "8453");          // Base Mainnet
  url.searchParams.set("module", "account");
  url.searchParams.set("action", "txlist");
  url.searchParams.set("address", address);
  url.searchParams.set("startblock", "0");
  url.searchParams.set("endblock", "9999999999");
  url.searchParams.set("page", "1");
  url.searchParams.set("offset", "10000");
  url.searchParams.set("sort", "asc");
  url.searchParams.set("apikey", ETHERSCAN_API_KEY);

  console.log("Fetching tx stats from Etherscan v2:", url.toString());

  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Etherscan HTTP error: ${resp.status} ${resp.statusText}`);
  }

    const json = await resp.json();
  console.log("Etherscan v2 response status:", json.status, "message:", json.message);

  if (json.status !== "1" || !Array.isArray(json.result) || json.result.length === 0) {
    console.log("No transactions found on Etherscan v2 for:", address);
    console.log("Full Etherscan v2 JSON:", JSON.stringify(json, null, 2)); // 👈 добавили
    return {
      txCount: 0,
      activityDays: 0,
      defiSwaps: 0
    };
  }

  const result = json.result;
  const lowerAddr = address.toLowerCase();

  let outgoingCount = 0;
  const activeDaysSet = new Set();
  let defiSwaps = 0;

  for (const tx of result) {
    const from = String(tx.from || "").toLowerCase();
    const to = String(tx.to || "").toLowerCase();
    const ts = Number(tx.timeStamp);

    // День активности — если адрес участвовал как from или to
    if (!Number.isNaN(ts) && ts > 0 && (from === lowerAddr || to === lowerAddr)) {
      const dayStr = new Date(ts * 1000).toISOString().slice(0, 10);
      activeDaysSet.add(dayStr);
    }

    // txCount — только исходящие транзакции
    if (from === lowerAddr) {
      outgoingCount += 1;

      // пробуем определить DeFi swap / bridge по functionName
      const fnName = tx.functionName || "";
      if (isDefiLikeFunctionName(fnName)) {
        defiSwaps += 1;
      }
    }
  }

  console.log(
    `Etherscan stats for ${address}: outgoingCount=${outgoingCount}, ` +
    `activityDays=${activeDaysSet.size}, defiSwaps=${defiSwaps}`
  );

  // safety: DeFi не может превышать общее число исходящих
  if (defiSwaps > outgoingCount) {
    defiSwaps = outgoingCount;
  }

  return {
    txCount: outgoingCount,
    activityDays: activeDaysSet.size,
    defiSwaps
  };
}

// 1) Профиль кошелька: GET /api/wallet/:address/score
app.get("/api/wallet/:address/score", async (req, res) => {
  try {
    const data = loadJson("mocks/wallet_profile_example.json");
    const address = req.params.address;

    console.log(">>> API /api/wallet called! <<<");
    console.log("Handling /api/wallet for:", address);

    data.address = address;
    data.network = "base-mainnet";
    data.updated_at = new Date().toISOString();

    // Стартовые значения — из JSON (как самый крайний fallback)
    let txCountRaw =
      (data.scores.metrics.tx_count && data.scores.metrics.tx_count.raw_value) || 0;
    let activityDaysRaw =
      (data.scores.metrics.activity_days && data.scores.metrics.activity_days.raw_value) || 0;
    let defiSwapsRaw =
      (data.scores.metrics.defi_swaps && data.scores.metrics.defi_swaps.raw_value) || 0;

    try {
      const stats = await fetchTxStatsFromEtherscan(address);
      if (stats) {
        txCountRaw = stats.txCount;
        activityDaysRaw = stats.activityDays;
        defiSwapsRaw = stats.defiSwaps;
      }
    } catch (e) {
      console.error("Error fetching from Etherscan v2, using mock/fallback values:", e);
    }

    if (defiSwapsRaw > txCountRaw) {
      defiSwapsRaw = txCountRaw;
    }

    // --- Обновляем tx_count ---
    const txMetric = data.scores.metrics.tx_count;
    txMetric.raw_value = txCountRaw;
    const txTier = mapTxCountToTier(txCountRaw);
    txMetric.tier = txTier;
    txMetric.tier_label = TX_TIER_LABELS[txTier] || "Unknown";
    data.scores.tiers.tx_count = txTier;

    // --- Обновляем activity_days ---
    const actMetric = data.scores.metrics.activity_days;
    actMetric.raw_value = activityDaysRaw;
    const actTier = mapActivityDaysToTier(activityDaysRaw);
    actMetric.tier = actTier;
    actMetric.tier_label = ACTIVITY_TIER_LABELS[actTier] || "Unknown";
    data.scores.tiers.activity_days = actTier;

    // --- Обновляем defi_swaps ---
    const defiMetric = data.scores.metrics.defi_swaps;
    defiMetric.raw_value = defiSwapsRaw;
    const defiTier = mapDefiSwapsToTier(defiSwapsRaw);
    defiMetric.tier = defiTier;
    defiMetric.tier_label = DEFI_TIER_LABELS[defiTier] || "Unknown";
    data.scores.tiers.defi_swaps = defiTier;

    res.json(data);
  } catch (err) {
    console.error("Error in /api/wallet/:address/score:", err);
    res
      .status(500)
      .json({ error: "Failed to load wallet profile or compute metrics" });
  }
});

// 2) Метаданные Beasta: GET /api/beast/:tokenId/metadata
app.get("/api/beast/:tokenId/metadata", (req, res) => {
  try {
    const tokenId = req.params.tokenId;
    const data = loadJson("mocks/beast_0_metadata.json");

    data.name = `Base Beast #${tokenId}`;
    data.external_url = `https://app.basebeast.xyz/beast/${tokenId}`;

    res.json(data);
  } catch (err) {
    console.error("Error loading beast metadata mock:", err);
    res.status(500).json({ error: "Failed to load beast metadata mock" });
  }
});

// Стартуем сервер
app.listen(PORT, () => {
  console.log(`Base Beast backend listening on http://localhost:${PORT}`);
});
