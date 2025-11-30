import { HardhatUserConfig } from "hardhat/config";
import dotenv from "dotenv";

// Загружаем переменные окружения из .env
dotenv.config();

// Читаем приватный ключ из .env (пока там фейковое значение)
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";

const config: HardhatUserConfig = {
  solidity: "0.8.28", // эту версию Hardhat уже скачал
  networks: {
    // Локальная сеть Hardhat (по умолчанию)
    hardhat: {},

    // Тестовая сеть Base Sepolia
    "base-sepolia": {
      url: "https://sepolia.base.org",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      gasPrice: 1_000_000_000, // 1 gwei
    },
  },
  defaultNetwork: "hardhat",
};

export default config;
