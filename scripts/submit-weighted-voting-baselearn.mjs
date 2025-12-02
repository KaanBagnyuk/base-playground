import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

const RPC_URL = "https://sepolia.base.org";

// Эти значения мы берём из лога кошелька, который ты прислал
const TO_ADDRESS = "0x4F333c49B820013e5E6Fe86634DC4Da88039CE50";
const DATA =
  "0x06d82f29000000000000000000000000b5f7b70c8a56666ca0c4f30fae55ee896ee4cb47";

async function main() {
  const PRIVATE_KEY = process.env.PRIVATE_KEY;

  if (!PRIVATE_KEY || PRIVATE_KEY === "" || PRIVATE_KEY.startsWith("0x000000")) {
    throw new Error(
      "PRIVATE_KEY не задан или выглядит как заглушка. Проверь .env."
    );
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log("Отправляем транзакцию от адреса:", await wallet.getAddress());

  const tx = await wallet.sendTransaction({
    to: TO_ADDRESS,
    data: DATA,
    value: 0n,
    // gasLimit можно не указывать, провайдер сам оценит.
    // Если вдруг будет ошибка по газу — добавим вручную.
  });

  console.log("Транзакция отправлена, hash:", tx.hash);

  const receipt = await tx.wait();
  console.log("✅ Транзакция включена в блок:", receipt.blockNumber);
}

main().catch((err) => {
  console.error("Ошибка при отправке транзакции:", err);
  process.exitCode = 1;
});
