// Публичный RPC-эндпоинт сети Base
const RPC_URL = "https://mainnet.base.org";

// Любой EVM-адрес в формате 0x... (42 символа)
// Можешь оставить пример или подставить СВОЙ ПУБЛИЧНЫЙ адрес из Metamask/биржи.
// ⚠️ Никогда не вставляй сюда seed-фразу или приватный ключ!
const ADDRESS = "0xfd32507B33220E1Be82E9bb83B4Ea74d4B59Cb25";

// Функция для получения баланса
async function main() {
  const payload = {
    jsonrpc: "2.0",
    id: 1,
    method: "eth_getBalance",
    params: [ADDRESS, "latest"], // "latest" = последний блок
  };

  const response = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    console.error("HTTP error from Base RPC:", response.status, response.statusText);
    return;
  }

  const data = await response.json();

  if (!data.result) {
    console.error("Unexpected response:", data);
    return;
  }

  const balanceHex = data.result;        // баланс в hex, например "0xde0b6b3a7640000"
  const balanceWei = BigInt(balanceHex); // конвертируем hex-строку в BigInt

  // 1 ETH = 10^18 wei
  const WEI_IN_ETH = 10n ** 18n;

  // Делим целые числа, получаем целую часть ETH
  const ethInteger = balanceWei / WEI_IN_ETH;
  const ethRemainder = balanceWei % WEI_IN_ETH;

  // Для наглядности сделаем приближённое значение с дробью
  const balanceEthApprox = Number(balanceWei) / 1e18;

  console.log("Address:                ", ADDRESS);
  console.log("Balance in wei:         ", balanceWei.toString());
  console.log("Balance in ETH (int):   ", ethInteger.toString());
  console.log("Balance in ETH (approx):", balanceEthApprox);
}

// Запускаем и ловим ошибки
main().catch((err) => {
  console.error("Unexpected error:", err);
});
