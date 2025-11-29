// Публичный RPC-эндпоинт сети Base Mainnet
const RPC_URL = "https://mainnet.base.org";

// Главная асинхронная функция
async function main() {
  // Это JSON-RPC запрос: мы просим у ноды метод eth_blockNumber
  const payload = {
    jsonrpc: "2.0",
    id: 1,
    method: "eth_blockNumber",
    params: []
  };

  // Отправляем POST-запрос на RPC
  const response = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  // Если сервер ответил с ошибкой HTTP (например 500)
  if (!response.ok) {
    console.error("HTTP error from Base RPC:", response.status, response.statusText);
    return;
  }

  // Читаем JSON-ответ
  const data = await response.json();

  // Если в ответе нет поля result — что-то пошло не так
  if (!data.result) {
    console.error("Unexpected response:", data);
    return;
  }

  const hexBlock = data.result;        // например "0x20bfec1"
  const blockNumber = parseInt(hexBlock, 16); // переводим hex → десятичное число

  console.log("Base mainnet latest block (hex):   ", hexBlock);
  console.log("Base mainnet latest block (number):", blockNumber);
}

// Запускаем функцию и ловим возможные ошибки
main().catch((err) => {
  console.error("Unexpected error:", err);
});
