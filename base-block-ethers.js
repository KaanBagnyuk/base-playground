const { ethers } = require("ethers");

// RPC-эндпоинт сети Base Mainnet
const RPC_URL = "https://mainnet.base.org";

async function main() {
  // Создаём провайдера через ethers
  const provider = new ethers.JsonRpcProvider(RPC_URL);

  // Спрашиваем у провайдера номер последнего блока
  const blockNumber = await provider.getBlockNumber();

  console.log("Base mainnet latest block (via ethers):", blockNumber);
}

main().catch((err) => {
  console.error("Error in base-block-ethers:", err);
});

