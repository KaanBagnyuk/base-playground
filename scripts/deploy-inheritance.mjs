import { readFileSync } from "node:fs";
import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

const RPC_URL = "https://sepolia.base.org";

async function main() {
  const PRIVATE_KEY = process.env.PRIVATE_KEY;

  if (!PRIVATE_KEY || PRIVATE_KEY === "" || PRIVATE_KEY.startsWith("0x000000")) {
    throw new Error(
      "PRIVATE_KEY не задан или заглушка. Проверь .env и вставь приватный ключ builder-кошелька."
    );
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log("Deploying from address:", await wallet.getAddress());

  // ---------- Salesperson ----------

  const salespersonArtifactJson = readFileSync(
    "./artifacts/contracts/InheritanceExercise.sol/Salesperson.json",
    "utf8"
  );
  const salespersonArtifact = JSON.parse(salespersonArtifactJson);

  const salespersonFactory = new ethers.ContractFactory(
    salespersonArtifact.abi,
    salespersonArtifact.bytecode,
    wallet
  );

  const spIdNumber = 55555n;
  const spManagerId = 12345n;
  const spHourlyRate = 20n;

  console.log("Sending Salesperson deploy transaction...");
  const salesperson = await salespersonFactory.deploy(
    spIdNumber,
    spManagerId,
    spHourlyRate
  );
  console.log(
    "Salesperson deploy tx hash:",
    salesperson.deploymentTransaction().hash
  );

  const salespersonDeployed = await salesperson.waitForDeployment();
  const salespersonAddress = await salespersonDeployed.getAddress();
  console.log("✅ Salesperson deployed at:", salespersonAddress);

  // ---------- EngineeringManager ----------

  const engMgrArtifactJson = readFileSync(
    "./artifacts/contracts/InheritanceExercise.sol/EngineeringManager.json",
    "utf8"
  );
  const engMgrArtifact = JSON.parse(engMgrArtifactJson);

  const engMgrFactory = new ethers.ContractFactory(
    engMgrArtifact.abi,
    engMgrArtifact.bytecode,
    wallet
  );

  const emIdNumber = 54321n;
  const emManagerId = 11111n;
  const emAnnualSalary = 200000n;

  console.log("Sending EngineeringManager deploy transaction...");
  const engineeringManager = await engMgrFactory.deploy(
    emIdNumber,
    emManagerId,
    emAnnualSalary
  );
  console.log(
    "EngineeringManager deploy tx hash:",
    engineeringManager.deploymentTransaction().hash
  );

  const engineeringManagerDeployed = await engineeringManager.waitForDeployment();
  const engineeringManagerAddress = await engineeringManagerDeployed.getAddress();
  console.log("✅ EngineeringManager deployed at:", engineeringManagerAddress);

  // ---------- InheritanceSubmission ----------

  const submissionArtifactJson = readFileSync(
    "./artifacts/contracts/InheritanceExercise.sol/InheritanceSubmission.json",
    "utf8"
  );
  const submissionArtifact = JSON.parse(submissionArtifactJson);

  const submissionFactory = new ethers.ContractFactory(
    submissionArtifact.abi,
    submissionArtifact.bytecode,
    wallet
  );

  console.log("Sending InheritanceSubmission deploy transaction...");
  const submission = await submissionFactory.deploy(
    salespersonAddress,
    engineeringManagerAddress
  );
  console.log(
    "InheritanceSubmission deploy tx hash:",
    submission.deploymentTransaction().hash
  );

  const submissionDeployed = await submission.waitForDeployment();
  const submissionAddress = await submissionDeployed.getAddress();
  console.log("✅ InheritanceSubmission deployed at:", submissionAddress);

  console.log("\n--- SUMMARY ---");
  console.log("Salesperson:", salespersonAddress);
  console.log("EngineeringManager:", engineeringManagerAddress);
  console.log("InheritanceSubmission:", submissionAddress);
}

main().catch((err) => {
  console.error("Error deploying inheritance contracts:", err);
  process.exitCode = 1;
});
