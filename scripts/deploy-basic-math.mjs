import { readFileSync } from "node:fs";
import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

// RPC тестовой сети Base Sepolia (официальный публичный RPC)
const RPC_URL = "https://sepolia.base.org";

async function main() {
  const PRIVATE_KEY = process.env.PRIVATE_KEY;

  if (!PRIVATE_KEY || PRIVATE_KEY === "" || PRIVATE_KEY.startsWith("0x000000")) {
    throw new Error(
      "PRIVATE_KEY не задан или заглушка. Проверь файл .env и вставь приватный ключ тестового / builder-кошелька Base Sepolia."
    );
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log("Deploying BasicMath from address:", await wallet.getAddress());

  // Читаем артефакт контракта BasicMath, который сгенерировал Hardhat
  const artifactJson = readFileSync(
    "./artifacts/contracts/BasicMath.sol/BasicMath.json",
    "utf8"
  );
  const artifact = JSON.parse(artifactJson);

  const factory = new ethers.ContractFactory(
    artifact.abi,
    artifact.bytecode,
    wallet
  );

  console.log("Sending BasicMath deploy transaction...");
  const contract = await factory.deploy();

  console.log("Deploy tx hash:", contract.deploymentTransaction().hash);

  const deployed = await contract.waitForDeployment();
  const address = await deployed.getAddress();
  console.log("✅ BasicMath deployed at:", address);
}

main().catch((err) => {
  console.error("Error deploying BasicMath:", err);
  process.exitCode = 1;
});
