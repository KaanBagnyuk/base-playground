import { network } from "hardhat";

const { ethers, networkName } = await network.connect();

async function main() {
  console.log("======================================");
  console.log("🚀 Deploying BaseBeastNFT");
  console.log("Network:", networkName);
  console.log("======================================");

  const registryAddress = process.env.BEAST_REGISTRY_ADDRESS;

  if (!registryAddress) {
    throw new Error("BEAST_REGISTRY_ADDRESS is missing in .env");
  }

  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log("Deploying BaseBeastNFT with account:", deployer.address);
  console.log("Deployer balance (ETH):", ethers.formatEther(balance));
  console.log("Using BeastScoreRegistry:", registryAddress);

  // Пока baseTokenURI пустой — обновим позже через setBaseTokenURI
  const baseTokenURI = "";

  const NFT = await ethers.getContractFactory("BaseBeastNFT");
  const nft = await NFT.deploy(registryAddress, baseTokenURI);

  console.log("⏳ Waiting for deployment tx to confirm...");
  await nft.waitForDeployment();

  const nftAddress = await nft.getAddress();

  console.log("✅ BaseBeastNFT deployed to:", nftAddress);
  console.log("======================================");
  console.log("👉 Добавь в .env строку:");
  console.log(`BEAST_NFT_ADDRESS=${nftAddress}`);
}

main().catch((error) => {
  console.error("❌ Error in deployBaseBeastNFT:", error);
  process.exitCode = 1;
});
