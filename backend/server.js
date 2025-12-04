import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { JsonRpcProvider } from "ethers";

const app = express();
const PORT = process.env.PORT || 3000;

// В ESM нет __dirname, поэтому делаем сами:
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Base RPC provider ---
// Сейчас подключаемся к реальному Base Mainnet.
// Для тестов/отладки можно заменить на https://sepolia.base.org.
const baseProvider = new JsonRpcProvider("https://mainnet.base.org");

// Вспомогательная функция: читаем JSON из файла
function loadJson(relativePath) {
  const fullPath = path.join(__dirname, relativePath);
  const raw = fs.readFileSync(fullPath, "utf8");
  return JSON.parse(raw);
}

// Маппинг количества транзакций в tier
function mapTxCountToTier(rawTxCount) {
  if (rawTxCount >= 1000) return 5;
  if (rawTxCount >= 500) return 4;
  if (rawTxCount >= 150) return 3;
  if (rawTxCount >= 50) return 2;
  if (rawTxCount >= 10) return 1;
  return 0;
}

const TX_TIER_LABELS = [
  "Onchain Newbie",     // 0
  "Getting Started",    // 1
  "Regular User",       // 2
  "Power User",         // 3
  "Heavy User",         // 4
  "Onchain Degen"       // 5
];

// 1) Профиль кошелька: GET /api/wallet/:address/score
app.get("/api/wallet/:address/score", async (req, res) => {
  try {
    const data = loadJson("mocks/wallet_profile_example.json");
    const address = req.params.address;

    data.address = address;
    data.updated_at = new Date().toISOString();

    // --- Реальный вызов к Base RPC: считаем tx_count ---
    let txCountRaw;

    try {
      // getTransactionCount в ethers v6 возвращает BigInt
      const txCountBigInt = await baseProvider.getTransactionCount(address);
      txCountRaw = Number(txCountBigInt); // для MVP конвертим в number
    } catch (rpcError) {
      console.error("Error fetching tx count from Base RPC:", rpcError);
      return res
        .status(502)
        .json({ error: "Failed to fetch tx count from Base RPC" });
    }

    // Обновляем секцию tx_count в профиле
    if (data.scores?.metrics?.tx_count) {
      data.scores.metrics.tx_count.raw_value = txCountRaw;

      const tier = mapTxCountToTier(txCountRaw);
      data.scores.metrics.tx_count.tier = tier;
      data.scores.metrics.tx_count.tier_label =
        TX_TIER_LABELS[tier] ?? "Unknown";

      if (data.scores.tiers) {
        data.scores.tiers.tx_count = tier;
      }

      // Пока overall оставим как в моках или позже пересчитаем
      // Здесь можно было бы сделать, например:
      // data.scores.overall.tier = Math.max(
      //   data.scores.tiers.activity_days,
      //   data.scores.tiers.tx_count,
      //   ...
      // );
    }

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

    // Пока для любого tokenId отдаём один и тот же мок,
    // позже можно будет делать разные файлы/генерацию
    const data = loadJson("mocks/beast_0_metadata.json");

    // Подменяем имя и ссылки, чтобы завязать на tokenId
    data.name = `Base Beast #${tokenId}`;
    data.external_url = `https://app.basebeast.xyz/beast/${tokenId}`;
    // image тоже можно привязать к tokenId, когда будет генерация картинок

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
