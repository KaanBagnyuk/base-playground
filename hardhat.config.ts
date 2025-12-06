import { HardhatUserConfig } from "hardhat/config";
import hardhatEthers from "@nomicfoundation/hardhat-ethers";
import dotenv from "dotenv";

dotenv.config();

// Берём приватный ключ и RPC из .env
// .env:
// PRIVATE_KEY=0x...
// RPC_URL=https://mainnet.base.org        # у тебя уже так
// BASE_SEPOLIA_RPC_URL=https://sepolia.base.org  # можно не задавать, есть дефолт
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const RPC_URL_MAINNET = process.env.RPC_URL || "https://mainnet.base.org";
const RPC_URL_SEPOLIA =
  process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";

// Один раз формируем массив accounts
const accounts =
  PRIVATE_KEY && !PRIVATE_KEY.startsWith("0x000000")
    ? [PRIVATE_KEY]
    : [];

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    // 🔵 Base Mainnet — основная сеть, сюда будем деплоить боевые контракты
    "base-mainnet": {
      type: "http",
      url: RPC_URL_MAINNET, // берём из .env RPC_URL
      chainId: 8453,        // Base Mainnet chainId 
      accounts,
    },

    // 🧪 Base Sepolia — тестовая сеть, можешь пока не использовать
    "base-sepolia": {
      type: "http",
      url: RPC_URL_SEPOLIA, // дефолт: https://sepolia.base.org
      chainId: 84532,       // Base Sepolia chainId 
      accounts,
    },
  },

  // плагин ethers подключён корректно
  plugins: [hardhatEthers],
};

export default config;
