const { ethers } = require("ethers");

const RPC_URL = "https://mainnet.base.org";

// сюда подставь СВОЙ публичный адрес, который ты уже проверял раньше
const ADDRESS = "0x4c3e70b967c28f4eedbd4ac793458811f6eac334";

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);

  // Получаем баланс в wei (BigInt)
  const balanceWei = await provider.getBalance(ADDRESS);

  // Форматируем баланс в ETH (Base ETH)
  const balanceEth = ethers.formatEther(balanceWei);

  console.log("Address:        ", ADDRESS);
  console.log("Balance (wei):  ", balanceWei.toString());
  console.log("Balance (ETH):  ", balanceEth);
}

main().catch((err) => {
  console.error("Error in base-balance-ethers:", err);
});
