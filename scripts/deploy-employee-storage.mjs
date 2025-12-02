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

  console.log("Deploying EmployeeStorage from address:", await wallet.getAddress());

  // Читаем артефакт EmployeeStorage
  const artifactJson = readFileSync(
    "./artifacts/contracts/EmployeeStorage.sol/EmployeeStorage.json",
    "utf8"
  );
  const artifact = JSON.parse(artifactJson);

  const factory = new ethers.ContractFactory(
    artifact.abi,
    artifact.bytecode,
    wallet
  );

  // Значения, которые требуют тесты Base:
  const shares = 1000n;
  const name = "Pat";
  const salary = 50000n;
  const idNumber = 112358132134n;

  console.log("Sending EmployeeStorage deploy transaction...");
  const contract = await factory.deploy(shares, name, salary, idNumber);

  console.log("Deploy tx hash:", contract.deploymentTransaction().hash);

  const deployed = await contract.waitForDeployment();
  const address = await deployed.getAddress();
  console.log("✅ EmployeeStorage deployed at:", address);
}

main().catch((err) => {
  console.error("Error deploying EmployeeStorage:", err);
  process.exitCode = 1;
});
