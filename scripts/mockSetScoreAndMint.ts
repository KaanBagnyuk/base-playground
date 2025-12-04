import { network } from "hardhat";

async function main() {
  const { ethers } = await network.connect();

  const [user] = await ethers.getSigners();
  console.log("Using account:", user.address);

  const registryAddress = "0x8B4feE104054fa90164Bdbff25C767FB956C53ce";
  const nftAddress = "0x9a6C1342f5dab9b86443a1C27E312AD95E12A43e"; // <-- новый адрес NFT

  const registry = await ethers.getContractAt(
    "BeastScoreRegistry",
    registryAddress
  );
  const nft = await ethers.getContractAt("BaseBeastNFT", nftAddress);

  // ВАЖНО: передаём score как tuple, а не объект
  // Порядок полей ДОЛЖЕН совпадать со struct BeastScore в контракте:
  // activityDaysTier, txCountTier, defiSwapsTier, liquidityTier, builderTier, overallTier
  const scoreTuple = [
    3, // activityDaysTier
    4, // txCountTier
    2, // defiSwapsTier
    1, // liquidityTier
    1, // builderTier
    3, // overallTier
  ];

  console.log("Setting score in BeastScoreRegistry...");
  const tx1 = await registry.setScore(user.address, scoreTuple);
  await tx1.wait();
  console.log("Score set!");

  // Читаем, что реально лежит в реестре
  const onchainScore = await registry.getScore(user.address);
  console.log("Onchain score from registry:", onchainScore);

  console.log("Minting Base Beast NFT...");
  const tx2 = await nft.mintFromScore();
  await tx2.wait();
  console.log("Beast minted!");

  const balance = await nft.balanceOf(user.address);
  console.log("Your BEAST NFT balance:", balance.toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
