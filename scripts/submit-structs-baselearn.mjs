import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

const RPC_URL = "https://sepolia.base.org";

// Данные из лога кошелька Base (Structs-модуль)
const TO_ADDRESS = "0x9eB1Fa4cD9bd29ca2C8e72217a642811c1F6176d";
const DATA =
  "0x06d82f29000000000000000000000000ecb90f4a8c2df6a194e0cf7e5145af459dc35f03";

async function main() {
  const PRIVATE_KEY = process.env.PRIVATE_KEY;

  if (!PRIVATE_KEY || PRIVATE_KEY === "" || PRIVATE_KEY.startsWith("0x000000")) {
    throw new Error(
      "PRIVATE_KEY не задан или выглядит как заглушка. Проверь .env и убедись, что там ключ Wallet B."
    );
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log("Отправляем транзакцию от адреса:", await wallet.getAddress());

  const tx = await wallet.sendTransaction({
    to: TO_ADDRESS,
    data: DATA,
    value: 0n,
    // gasLimit не задаём, даём ноде самой оценить.
  });

  console.log("Транзакция отправлена, hash:", tx.hash);

  const receipt = await tx.wait();
  console.log("✅ Транзакция включена в блок:", receipt.blockNumber);
}

main().catch((err) => {
  console.error("Ошибка при отправке транзакции:", err);
  process.exitCode = 1;
});
