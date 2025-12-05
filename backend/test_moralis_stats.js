// backend/test_moralis_stats.js
// Быстрый тест Moralis Wallet Stats для Base

import dotenv from "dotenv";
dotenv.config();

const MORALIS_API_KEY = process.env.MORALIS_API_KEY || "";

if (!MORALIS_API_KEY) {
  console.error("❌ MORALIS_API_KEY is not set in .env");
  process.exit(1);
}

// Твой адрес на Base (без опечаток)
const ADDRESS = "0xfd32507B33220E1Be82E9bb83B4Ea74d4B59Cb25";

async function main() {
  try {
    const url = new URL(
      `https://deep-index.moralis.io/api/v2.2/wallets/${ADDRESS}/stats`
    );

    // ❗ ВАЖНО: параметр ИМЕННО chain, И НЕ chains
    url.searchParams.set("chain", "base"); // можно также "0x2105"

    console.log("➡️  Fetching Moralis wallet stats:", url.toString());

    const res = await fetch(url, {
      method: "GET",
      headers: {
        accept: "application/json",
        "X-API-Key": MORALIS_API_KEY,
      },
    });

    console.log("HTTP status:", res.status);
    const text = await res.text();
    console.log("Raw body (first 1000 chars):");
    console.log(text.slice(0, 1000));
  } catch (err) {
    console.error("❌ Error while calling Moralis wallet stats:", err);
  }
}

main();
