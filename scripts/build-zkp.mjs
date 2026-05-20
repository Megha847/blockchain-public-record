/**
 * Builds ZoKrates artifacts (program, proving key, verification key) and
 * exports Solidity Groth16 verifiers via zokrates-js (real SNARKs, bn128).
 *
 * Run: node scripts/build-zkp.mjs
 * Requires: npm install (zokrates-js in server workspace or root)
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const require = createRequire(import.meta.url);

async function loadZokrates() {
  const { initialize } = require("zokrates-js");
  const zokratesProvider = await initialize();
  return zokratesProvider.withOptions({
    backend: "ark",
    scheme: "g16",
    curve: "bn128",
  });
}

const CIRCUITS = [
  { name: "age", file: "age.zok", contractName: "VerifierAge" },
  { name: "hash_match", file: "hash_match.zok", contractName: "VerifierHash" },
  { name: "ownership", file: "ownership.zok", contractName: "VerifierOwn" },
];

async function buildOne(zk, { name, file, contractName }) {
  const srcPath = path.join(root, "zkp", "circuits", file);
  const source = fs.readFileSync(srcPath, "utf8");
  const outDir = path.join(root, "zkp", "artifacts", name);
  fs.mkdirSync(outDir, { recursive: true });

  console.info(`[zkp] Compiling ${file}...`);
  const artifacts = zk.compile(source);

  console.info(`[zkp] Trusted setup (deterministic entropy for reproducible academic demo)...`);
  const keypair = zk.setup(artifacts.program, `entropy-${name}-public-records-demo`);

  const solidity = zk.exportSolidityVerifier(keypair.vk);
  const renamed = solidity.replace(/\bcontract Verifier\b/g, `contract ${contractName}`);

  const verifierPath = path.join(
    root,
    "contracts",
    "contracts",
    "verifiers",
    `${contractName}.sol`
  );
  fs.mkdirSync(path.dirname(verifierPath), { recursive: true });
  fs.writeFileSync(verifierPath, renamed, "utf8");

  fs.writeFileSync(path.join(outDir, "program.bin"), Buffer.from(artifacts.program));
  fs.writeFileSync(
    path.join(outDir, "proving.key"),
    Buffer.from(keypair.pk)
  );
  fs.writeFileSync(
    path.join(outDir, "verification.key.json"),
    JSON.stringify(keypair.vk),
    "utf8"
  );
  fs.writeFileSync(
    path.join(outDir, "abi.json"),
    JSON.stringify(artifacts.abi, null, 2),
    "utf8"
  );

  console.info(`[zkp] Wrote ${contractName}.sol and artifacts for ${name}`);
}

async function main() {
  const zk = await loadZokrates();
  for (const c of CIRCUITS) {
    await buildOne(zk, c);
  }
  console.info("[zkp] Done. Run: npm run contracts:compile");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
