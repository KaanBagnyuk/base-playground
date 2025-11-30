import { readFileSync } from "node:fs";
import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

// RPC тестовой сети Base Sepolia (официальный публичный RPC) :contentReference[oaicite:2]{index=2}
const RPC_URL = "https://sepolia.base.org";

async function main() {
  const PRIVATE_KEY = process.env.PRIVATE_KEY;

  if (!PRIVATE_KEY || PRIVATE_KEY === "" || PRIVATE_KEY.startsWith("0x000000")) {
    throw new Error(
      "PRIVATE_KEY не задан или заглушка. Проверь файл .env и вставь приватный ключ тестового кошелька Base Sepolia."
    );
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log("Deploying from address:", await wallet.getAddress());

  // Читаем артефакт контракта Counter, который сгенерировал Hardhat
  const artifactJson = readFileSync(
    "./artifacts/contracts/Counter.sol/Counter.json",
    "utf8"
  );
  const artifact = JSON.parse(artifactJson);

  const factory = new ethers.ContractFactory(
    artifact.abi,
    artifact.bytecode,
    wallet
  );

  console.log("Sending deploy transaction...");
  const contract = await factory.deploy();

  console.log("Deploy tx hash:", contract.deploymentTransaction().hash);

  const deployed = await contract.waitForDeployment();
  const address = await deployed.getAddress();
  console.log("✅ Counter deployed at:", address);
}

main().catch((err) => {
  console.error("Error deploying Counter:", err);
  process.exitCode = 1;
});
