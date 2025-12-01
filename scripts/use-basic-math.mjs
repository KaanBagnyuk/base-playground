import { readFileSync } from "node:fs";
import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

// RPC тестовой сети Base Sepolia
const RPC_URL = "https://sepolia.base.org";

// Адрес уже задеплоенного BasicMath
const BASIC_MATH_ADDRESS = "0xFC297da5286eCF22C82Ef79ac01268F97C74a5B0";

async function main() {
  // Для чтения pure/view-функций нам достаточно провайдера (без приватного ключа)
  const provider = new ethers.JsonRpcProvider(RPC_URL);

  // Читаем артефакт BasicMath, который сгенерировал Hardhat
  const artifactJson = readFileSync(
    "./artifacts/contracts/BasicMath.sol/BasicMath.json",
    "utf8"
  );
  const artifact = JSON.parse(artifactJson);

  const contract = new ethers.Contract(
    BASIC_MATH_ADDRESS,
    artifact.abi,
    provider
  );

  // Берём какие-нибудь числа
  const a = 10n;
  const b = 3n;

  console.log("Using BasicMath at:", BASIC_MATH_ADDRESS);
  console.log("Inputs:", a.toString(), "and", b.toString());
  console.log("-------------");

  const sum = await contract.add(a, b);
  console.log("add(a, b)       =", sum.toString());

  const diff = await contract.subtract(a, b);
  console.log("subtract(a, b)  =", diff.toString());

  const mul = await contract.multiply(a, b);
  console.log("multiply(a, b)  =", mul.toString());

  const div = await contract.divide(a, b);
  console.log("divide(a, b)    =", div.toString());
}

main().catch((err) => {
  console.error("Error using BasicMath:", err);
  process.exitCode = 1;
});
