const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

function upsertRootEnv(key, value) {
  const envPath = path.join(__dirname, "../../.env");
  const line = `${key}=${value}`;
  const existing = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
  const lines = existing.split(/\r?\n/).filter((entry) => entry.trim() !== "");
  const index = lines.findIndex((entry) => entry.startsWith(`${key}=`));

  if (index >= 0) {
    lines[index] = line;
  } else {
    lines.push(line);
  }

  fs.writeFileSync(envPath, `${lines.join("\n")}\n`);
}

async function main() {
  // 🔍 Get deployer account
  const [signer] = await hre.ethers.getSigners();
  console.log("🚀 Deploying from:", signer.address);

  // 💰 ADD THIS HERE (balance check)
  const balance = await hre.ethers.provider.getBalance(signer.address);
  console.log("💰 Balance:", hre.ethers.formatEther(balance));

  // Deploy Verifier Contracts
  const Age = await hre.ethers.getContractFactory("VerifierAge");
  const Hash = await hre.ethers.getContractFactory("VerifierHash");
  const Own = await hre.ethers.getContractFactory("VerifierOwn");

  const age = await Age.deploy();
  await age.waitForDeployment();
  console.log("✅ VerifierAge deployed at:", await age.getAddress());

  const hash = await Hash.deploy();
  await hash.waitForDeployment();
  console.log("✅ VerifierHash deployed at:", await hash.getAddress());

  const own = await Own.deploy();
  await own.waitForDeployment();
  console.log("✅ VerifierOwn deployed at:", await own.getAddress());

  // Deploy Main Contract
  const PublicRecords = await hre.ethers.getContractFactory("PublicRecords");

  const records = await PublicRecords.deploy(
    await age.getAddress(),
    await hash.getAddress(),
    await own.getAddress()
  );

  await records.waitForDeployment();

  console.log("🎯 PublicRecords deployed at:", await records.getAddress());

  const output = {
    deployer: signer.address,
    verifierAge: await age.getAddress(),
    verifierHash: await hash.getAddress(),
    verifierOwn: await own.getAddress(),
    publicRecords: await records.getAddress(),
  };

  upsertRootEnv("PUBLIC_RECORDS_ADDRESS", output.publicRecords);

  console.log("\n📦 Deployment Summary:");
  console.log(JSON.stringify(output, null, 2));
  console.log(`\nUpdated root .env with PUBLIC_RECORDS_ADDRESS=${output.publicRecords}`);
}

main().catch((error) => {
  console.error("❌ Deployment Failed:", error);
  process.exitCode = 1;
});
