import { readFileSync } from "node:fs";
import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

const RPC_URL = "https://sepolia.base.org";

async function main() {
  const PRIVATE_KEY = process.env.PRIVATE_KEY;

  if (!PRIVATE_KEY || PRIVATE_KEY === "" || PRIVATE_KEY.startsWith("0x000000")) {
    throw new Error(
      "PRIVATE_KEY не задан или заглушка. Проверь .env и вставь приватный ключ builder-кошелька."
    );
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(
    "Deploying FavoriteRecords from address:",
    await wallet.getAddress()
  );

  const artifactJson = readFileSync(
    "./artifacts/contracts/FavoriteRecords.sol/FavoriteRecords.json",
    "utf8"
  );
  const artifact = JSON.parse(artifactJson);

  const factory = new ethers.ContractFactory(
    artifact.abi,
    artifact.bytecode,
    wallet
  );

  console.log("Sending FavoriteRecords deploy transaction...");
  const contract = await factory.deploy(); // конструктор без параметров

  console.log("Deploy tx hash:", contract.deploymentTransaction().hash);

  const deployed = await contract.waitForDeployment();
  const address = await deployed.getAddress();
  console.log("✅ FavoriteRecords deployed at:", address);
}

main().catch((err) => {
  console.error("Error deploying FavoriteRecords:", err);
  process.exitCode = 1;
});
