import { network } from "hardhat";

const { ethers, networkName } = await network.connect();

async function main() {
  console.log("======================================");
  console.log("🚀 Deploying BeastScoreRegistry");
  console.log("Network:", networkName);
  console.log("======================================");

  const [deployer] = await ethers.getSigners();

  const balance = await ethers.provider.getBalance(deployer.address);

  console.log("Deployer address:", deployer.address);
  console.log("Deployer balance (ETH):", ethers.formatEther(balance));

  // Для MVP делаем орклом самого деплойера
  const scoreOracle = deployer.address;
  console.log("Score oracle will be:", scoreOracle);

  const Registry = await ethers.getContractFactory("BeastScoreRegistry");
  const registry = await Registry.deploy(scoreOracle);

  console.log("⏳ Waiting for deployment tx to confirm...");
  await registry.waitForDeployment();

  const registryAddress = await registry.getAddress();

  console.log("✅ BeastScoreRegistry deployed!");
  console.log("Contract address:", registryAddress);
  console.log("======================================");
  console.log("👉 Вставь этот адрес в .env как:");
  console.log(`BEAST_REGISTRY_ADDRESS=${registryAddress}`);
}

main().catch((error) => {
  console.error("❌ Error in deployBeastScoreRegistry:", error);
  process.exitCode = 1;
});
