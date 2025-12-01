const { ethers } = require("ethers");

const RPC_URL = "https://mainnet.base.org";

// сюда подставь СВОЙ публичный адрес, который ты уже проверял раньше
const ADDRESS = "0xfd32507B33220E1Be82E9bb83B4Ea74d4B59Cb25";

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
