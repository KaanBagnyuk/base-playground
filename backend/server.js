import "dotenv/config";
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
// Оставляем порт 4000, чтобы не путаться со старыми процессами
const PORT = process.env.PORT || 4000;

console.log("Base Beast backend v0.4 (Etherscan V2, no test overrides) starting...");

// В ESM нет __dirname, поэтому делаем сами:
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Etherscan / Basescan API key из .env
const BASESCAN_API_KEY = process.env.BASESCAN_API_KEY || "";
console.log("BASESCAN_API_KEY length:", BASESCAN_API_KEY.length);

// Вспомогательная функция: читаем JSON из файла
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

// --- Тянем tx'ы из Etherscan V2 для Base (chainid=8453) ---
async function fetchTxStatsFromEtherscan(address) {
  if (!BASESCAN_API_KEY) {
    console.warn("No BASESCAN_API_KEY set; using mocked tx/activity metrics");
    return null;
  }

  const url = new URL("https://api.etherscan.io/v2/api");
  url.searchParams.set("chainid", "8453");          // Base Mainnet
  url.searchParams.set("module", "account");
  url.searchParams.set("action", "txlist");         // normal transactions
  url.searchParams.set("address", address);
  url.searchParams.set("startblock", "0");
  url.searchParams.set("endblock", "9999999999");
  url.searchParams.set("page", "1");
  url.searchParams.set("offset", "10000");
  url.searchParams.set("sort", "asc");
  url.searchParams.set("apikey", BASESCAN_API_KEY);

  console.log("Fetching tx stats from:", url.toString());

  const resp = await fetch(url);

  if (!resp.ok) {
    throw new Error(`Etherscan HTTP error: ${resp.status} ${resp.statusText}`);
  }

  const json = await resp.json();
  console.log("Etherscan response status:", json.status, "message:", json.message);

  if (json.status !== "1" || !Array.isArray(json.result) || json.result.length === 0) {
    console.log("No transactions found for address:", address);
    return {
      txCount: 0,
      activityDays: 0
    };
  }

  const result = json.result;
  const lowerAddr = address.toLowerCase();

  let outgoingCount = 0;
  const activeDaysSet = new Set();

  for (const tx of result) {
    const from = String(tx.from || "").toLowerCase();
    const ts = Number(tx.timeStamp);

    if (from === lowerAddr) {
      outgoingCount += 1;
    }

    if (!Number.isNaN(ts) && ts > 0) {
      const dayStr = new Date(ts * 1000).toISOString().slice(0, 10); // YYYY-MM-DD
      activeDaysSet.add(dayStr);
    }
  }

  console.log(
    `Stats for ${address}: outgoingCount=${outgoingCount}, activityDays=${activeDaysSet.size}`
  );

  return {
    txCount: outgoingCount,
    activityDays: activeDaysSet.size
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

    // Начальные значения из мока (как fallback)
    let txCountRaw = data.scores.metrics.tx_count.raw_value;
    let activityDaysRaw = data.scores.metrics.activity_days.raw_value;

    try {
      const stats = await fetchTxStatsFromEtherscan(address);
      if (stats) {
        txCountRaw = stats.txCount;
        activityDaysRaw = stats.activityDays;
      }
    } catch (e) {
      console.error("Error fetching from Etherscan, using mock values:", e);
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
