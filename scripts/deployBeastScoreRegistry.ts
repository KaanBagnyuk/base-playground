import { network } from "hardhat";

async function main() {
  // Hardhat 3-style: получаем ethers через network.connect()
  const { ethers } = await network.connect();

  const [deployer] = await ethers.getSigners();
  console.log("Deploying BeastScoreRegistry with account:", deployer.address);

  // В ethers v6 контракт деплоится так:
  // deployContract("ИмяКонтрактаИзArtifacts", [аргументы конструктора])
  const registry = await ethers.deployContract("BeastScoreRegistry", [
    deployer.address, // initialOwner / scoreOracle
  ]);

  await registry.waitForDeployment();

  const registryAddress = await registry.getAddress();
  console.log("BeastScoreRegistry deployed to:", registryAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
