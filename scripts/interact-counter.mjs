import { readFileSync } from "node:fs";
import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

// RPC тестовой сети Base Sepolia
const RPC_URL = "https://sepolia.base.org";

// 👉 сюда вставляем адрес ЗАДЕПЛОЕННОГО контракта Counter
const CONTRACT_ADDRESS = "0x643116b2d8B7FA06dae47219d493FB33B30302B0";

async function main() {
  const PRIVATE_KEY = process.env.PRIVATE_KEY;

  if (
    !PRIVATE_KEY ||
    PRIVATE_KEY === "" ||
    PRIVATE_KEY.startsWith("0x000000")
  ) {
    throw new Error(
      "❌ PRIVATE_KEY не задан или ещё заглушка. Проверь .env и убедись, что там приватный ключ тестового кошелька Base Sepolia."
    );
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log("Using wallet:", await wallet.getAddress());
  console.log("Contract address:", CONTRACT_ADDRESS);

  // Читаем артефакт контракта Counter, который сгенерировал Hardhat
  const artifactJson = readFileSync(
    "./artifacts/contracts/Counter.sol/Counter.json",
    "utf8"
  );
  const artifact = JSON.parse(artifactJson);

  // Создаём объект контракта
  const contract = new ethers.Contract(CONTRACT_ADDRESS, artifact.abi, wallet);

  // 1) Читаем текущее значение count
  const current = await contract.count();
  console.log("Current count:", current.toString());

  // 2) Вызываем increment() — это транзакция, тратится gas
  console.log("Calling increment()...");
  const tx = await contract.increment();
  console.log("Tx sent, hash:", tx.hash);

  // Ждём, пока транзакция попадёт в блок
  const receipt = await tx.wait();
  console.log("Tx confirmed in block:", receipt.blockNumber);

  // 3) Снова читаем count
  const updated = await contract.count();
  console.log("Updated count:", updated.toString());
}

main().catch((err) => {
  console.error("Error interacting with Counter:", err);
  process.exitCode = 1;
});
