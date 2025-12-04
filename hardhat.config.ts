import { HardhatUserConfig } from "hardhat/config";
import hardhatEthers from "@nomicfoundation/hardhat-ethers";  // <-- ВАЖНО
import dotenv from "dotenv";

dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "";

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
    "base-sepolia": {
      type: "http",
      url: "https://sepolia.base.org",
      chainId: 84532,
      accounts:
        PRIVATE_KEY && !PRIVATE_KEY.startsWith("0x000000")
          ? [PRIVATE_KEY]
          : [],
    },
  },
  plugins: [hardhatEthers],   // <-- ПЛАГИН ПОДКЛЮЧЕН ТУТ
};

export default config;
