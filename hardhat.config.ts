import { HardhatUserConfig } from "hardhat/config";
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
    // Локальная сеть Hardhat 3 создаётся автоматически как edr-simulated.
    // Мы её не трогаем — используем "из коробки".

    "base-sepolia": {
      type: "http", // для RPC-сети всегда "http"
      url: "https://sepolia.base.org",
      chainId: 84532,
      accounts:
        PRIVATE_KEY && !PRIVATE_KEY.startsWith("0x000000")
          ? [PRIVATE_KEY]
          : [],
    },
  },
};

export default config;
