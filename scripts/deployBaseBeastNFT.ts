import { network } from "hardhat";

async function main() {
  const { ethers } = await network.connect();

  const [deployer] = await ethers.getSigners();
  console.log("Deploying BaseBeastNFT with account:", deployer.address);

  const registryAddress = "0x8B4feE104054fa90164Bdbff25C767FB956C53ce";
  const baseTokenURI = "https://example.com/metadata/";

  const nft = await ethers.deployContract("BaseBeastNFT", [
    registryAddress,
    baseTokenURI,
  ]);

  await nft.waitForDeployment();

  const nftAddress = await nft.getAddress();
  console.log("BaseBeastNFT deployed to:", nftAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
