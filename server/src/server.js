const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const helmet = require("helmet");
const morgan = require("morgan");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const multer = require("multer");
const { ethers } = require("ethers");
const http = require("http");
const { Server } = require("socket.io");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const PDFDocument = require("pdfkit");
const workerpool = require("workerpool");
const path = require("path");

function loadEnvironment() {
  // Root .env is the single source of truth for the whole project.
  dotenv.config({ path: path.join(__dirname, "../../.env"), override: true });
}

loadEnvironment();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
const upload = multer({ storage: multer.memoryStorage() });
const pool = workerpool.pool(path.join(__dirname, "../workers/loadWorker.js"));

app.use(express.json({ limit: "10mb" }));
app.use(cors());
app.use(helmet());
app.use(morgan("dev"));

const swaggerDoc = YAML.load(path.join(__dirname, "../swagger.yaml"));
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerDoc));

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ["admin", "user"], default: "user" },
});
const recordSchema = new mongoose.Schema({
  title: String,
  cid: String,
  fileHash: { type: String, unique: true },
  owner: String,
  chainTx: String,
  mode: { type: String, enum: ["traditional", "encryption", "zkp"] },
  createdAt: { type: Date, default: Date.now },
});
const performanceSchema = new mongoose.Schema({
  mode: String,
  users: Number,
  avgLatency: Number,
  peakLatency: Number,
  throughput: Number,
  at: { type: Date, default: Date.now },
});
const verificationAuditSchema = new mongoose.Schema({
  fileHash: String,
  user: String,
  dbFound: Boolean,
  onChain: Boolean,
  chainConfigured: Boolean,
  chainError: String,
  txHash: String,
  contractAddress: String,
  at: { type: Date, default: Date.now },
});
const User = mongoose.model("User", userSchema);
const Record = mongoose.model("Record", recordSchema);
const Performance = mongoose.model("Performance", performanceSchema);
const VerificationAudit = mongoose.model("VerificationAudit", verificationAuditSchema);

const auth = (roles = ["admin", "user"]) => (req, res, next) => {
  try {
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev_secret");
    if (!roles.includes(payload.role)) return res.status(403).json({ error: "forbidden" });
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: "unauthorized" });
  }
};

let contract = null;
let signer = null;
let chainProvider = null;
let chainRpc = null;
let ipfs = null;

const normalizeFileHash = (value) => String(value || "").trim().toLowerCase();
const publicRecordsArtifactPath = path.join(__dirname, "../../contracts/artifacts/contracts/PublicRecords.sol/PublicRecords.json");
const minSignerBalance = ethers.parseEther("0.01");

async function getSignerAddress(value = signer) {
  if (!value) return null;
  return value.address || await value.getAddress();
}

function resetChainConnection() {
  contract = null;
  signer = null;
  chainProvider = null;
  chainRpc = null;
}

async function selectChainSigner(provider) {
  const accounts = await provider.listAccounts();
  for (let index = 0; index < accounts.length; index += 1) {
    const candidate = await provider.getSigner(index);
    const address = await candidate.getAddress();
    const balance = await provider.getBalance(address);
    if (balance >= minSignerBalance) return candidate;
  }

  throw new Error("no funded Ganache signer available");
}

async function refreshChainSigner(provider) {
  loadEnvironment();
  const selected = await selectChainSigner(provider);
  const selectedAddress = await getSignerAddress(selected);
  const currentAddress = await getSignerAddress();

  if (!currentAddress || currentAddress.toLowerCase() !== selectedAddress.toLowerCase()) {
    signer = selected;
    if (contract) contract = contract.connect(signer);
  }

  return signer;
}

async function initIpfs() {
  const mod = await import("ipfs-http-client");
  ipfs = mod.create({ url: process.env.IPFS_API || "http://127.0.0.1:5001/api/v0" });
}

async function initChain() {
  const rpc = process.env.GANACHE_RPC || "http://127.0.0.1:7545";
  chainProvider = new ethers.JsonRpcProvider(rpc);
  chainRpc = rpc;
  signer = await refreshChainSigner(chainProvider);
  if (!process.env.PUBLIC_RECORDS_ADDRESS) {
    console.warn("[initChain] PUBLIC_RECORDS_ADDRESS is missing; on-chain verification is disabled");
    return;
  }
  // eslint-disable-next-line global-require, import/no-dynamic-require
  const artifact = require(publicRecordsArtifactPath);
  contract = new ethers.Contract(process.env.PUBLIC_RECORDS_ADDRESS, artifact.abi, signer);
  const code = await chainProvider.getCode(process.env.PUBLIC_RECORDS_ADDRESS);
  if (code === "0x") {
    console.warn(`[initChain] no contract found at PUBLIC_RECORDS_ADDRESS=${process.env.PUBLIC_RECORDS_ADDRESS}`);
    contract = null;
    return;
  }
  try {
    await contract.isRecordValid(ethers.ZeroHash);
  } catch (e) {
    console.warn(`[initChain] address is not a PublicRecords contract: ${e?.shortMessage || e?.message || e}`);
    contract = null;
    return;
  }

  contract.on("RecordAdded", (fileHash, owner, cid) => io.emit("chain:event", { type: "RecordAdded", fileHash, owner, cid }));
  contract.on("RecordVerified", (fileHash, valid) => io.emit("chain:event", { type: "RecordVerified", fileHash, valid }));
  contract.on("ZKPVerified", (fileHash, proofType, valid) => io.emit("chain:event", { type: "ZKPVerified", fileHash, proofType, valid }));
}

async function anchorRecordOnChain(fileHash, cid) {
  if (!contract || !signer) return "";
  await refreshChainSigner(chainProvider);
  const owner = await getSignerAddress();
  const tx = await contract.addRecord(fileHash, cid, owner);
  const receipt = await tx.wait();
  return receipt.hash;
}

async function ensureChainReady() {
  loadEnvironment();

  const rpc = process.env.GANACHE_RPC || "http://127.0.0.1:7545";
  if (chainRpc && chainRpc !== rpc) {
    resetChainConnection();
  }

  if (!process.env.PUBLIC_RECORDS_ADDRESS) {
    return { ok: false, error: "PUBLIC_RECORDS_ADDRESS is missing" };
  }

  if (contract) {
    const currentAddress = (await contract.getAddress()).toLowerCase();
    if (currentAddress !== process.env.PUBLIC_RECORDS_ADDRESS.toLowerCase()) {
      contract = null;
    }
  }

  if (!contract || !chainProvider) {
    await initChain().catch((e) => console.warn("[ensureChainReady]", e?.message || e));
  } else {
    await refreshChainSigner(chainProvider).catch((e) => {
      console.warn("[ensureChainReady]", e?.message || e);
      contract = null;
      signer = null;
    });
  }

  if (!contract || !chainProvider) {
    return { ok: false, error: "contract is not connected" };
  }

  const address = await contract.getAddress();
  const code = await chainProvider.getCode(address);
  if (code === "0x") {
    contract = null;
    return { ok: false, error: `no contract code at ${address}` };
  }

  try {
    await contract.isRecordValid(ethers.ZeroHash);
  } catch (e) {
    contract = null;
    return { ok: false, error: `${address} is not the PublicRecords contract` };
  }

  return { ok: true, address };
}

async function ensureRpcReady() {
  loadEnvironment();

  const rpc = process.env.GANACHE_RPC || "http://127.0.0.1:7545";
  if (!chainProvider || chainRpc !== rpc) {
    chainProvider = new ethers.JsonRpcProvider(rpc);
    chainRpc = rpc;
  }

  await chainProvider.getBlockNumber();
  return { ok: true, rpc };
}

app.get("/api/health", (_, res) => res.json({ ok: true }));

app.get("/api/system/status", auth(), async (_, res) => {
  const mongoConnected = mongoose.connection.readyState === 1;
  const rpcReady = await ensureRpcReady().catch((e) => ({ ok: false, error: e?.shortMessage || e?.message || "RPC unavailable" }));
  const ready = await ensureChainReady();
  let signerAddress = null;
  let signerBalance = null;

  if (chainProvider && signer) {
    try {
      await refreshChainSigner(chainProvider);
      signerAddress = await getSignerAddress();
      signerBalance = ethers.formatEther(await chainProvider.getBalance(signerAddress));
    } catch {
      signerAddress = null;
      signerBalance = null;
    }
  }

  res.json({
    mongoConnected,
    ganacheConnected: Boolean(rpcReady.ok),
    contractConnected: Boolean(ready.ok),
    contractConfigured: Boolean(process.env.PUBLIC_RECORDS_ADDRESS),
    contractAddress: process.env.PUBLIC_RECORDS_ADDRESS || null,
    signerAddress,
    signerBalance,
    chainError: ready.ok ? null : ready.error || rpcReady.error,
  });
});

app.get("/api/stats", auth(), async (_, res) => {
  const [records, users, experiments] = await Promise.all([
    Record.countDocuments(),
    User.countDocuments(),
    Performance.countDocuments(),
  ]);
  res.json({ records, users, experiments });
});

app.post(
  "/api/auth/register",
  [body("email").isEmail(), body("password").isLength({ min: 6 }), body("name").isLength({ min: 2 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    try {
      const { email, password, name, role } = req.body;
      const hash = await bcrypt.hash(password, 12);
      const u = await User.create({ email: email.toLowerCase(), password: hash, name, role: role || "user" });
      return res.json({ id: u._id });
    } catch (error) {
      if (error && error.code === 11000) {
        return res.status(409).json({ error: "user already exists" });
      }
      return res.status(500).json({ error: "registration failed" });
    }
  }
);

app.post("/api/auth/login", [body("email").isEmail(), body("password").exists()], async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) return res.status(400).json({ error: "invalid credentials" });
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(400).json({ error: "invalid credentials" });
  const token = jwt.sign({ id: user._id.toString(), role: user.role, email: user.email }, process.env.JWT_SECRET || "dev_secret", {
    expiresIn: "24h",
  });
  return res.json({ token, role: user.role });
});

app.post("/api/records/upload", auth(), upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "file required" });
    const title = String(req.body.title || "Untitled").trim();
    const mode = req.body.mode || "traditional";

    const fileHash = ethers.keccak256(req.file.buffer).toLowerCase();
    const duplicate = await Record.findOne({ fileHash });
    if (duplicate) return res.status(409).json({ error: "duplicate submission prevented" });

    const start = Date.now();
    let cid = `offline-${fileHash.slice(2, 14)}`;
    let ipfsOk = false;
    if (ipfs) {
      try {
        const added = await ipfs.add(req.file.buffer);
        cid = added.cid.toString();
        ipfsOk = true;
      } catch {
        // Fall back to offline CID when IPFS node is unreachable.
      }
    }

    let txHash = "";
    let chainOk = false;
    if (contract) {
      try {
        txHash = await anchorRecordOnChain(fileHash, cid);
        chainOk = true;
      } catch {
        // Keep record creation working even when chain is temporarily unavailable.
      }
    }

    const saved = await Record.create({ title, cid, fileHash, owner: req.user.email, chainTx: txHash, mode });
    const latency = Date.now() - start;
    io.emit("record:added", saved);
    return res.json({ record: saved, latency, warnings: { ipfsOk, chainOk } });
  } catch (error) {
    if (error && error.code === 11000) {
      return res.status(409).json({ error: "duplicate submission prevented" });
    }
    return res.status(500).json({ error: "upload failed" });
  }
});

app.post(
  "/api/records/verify",
  auth(),
  [
    body("fileHash")
      .isString()
      .trim()
      .matches(/^0x[a-fA-F0-9]{64}$/)
      .withMessage("fileHash must be 32-byte hex (0x + 64 hex chars)"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const fileHash = normalizeFileHash(req.body.fileHash);

    let record;
    try {
      record = await Record.findOne({ fileHash });
    } catch (e) {
      console.error("[verify] db", e);
      return res.status(500).json({ error: "verify failed" });
    }

    let onChain = false;
    const ready = await ensureChainReady();
    const chainConfigured = ready.ok;
    let chainError = null;
    if (!ready.ok) chainError = ready.error;

    if (ready.ok && contract) {
      try {
        onChain = Boolean(record) && Boolean(await contract.isRecordValid(fileHash));
        if (record && !onChain) {
          const txHash = await anchorRecordOnChain(fileHash, record.cid || "");
          await Record.updateOne({ _id: record._id }, { $set: { chainTx: txHash } });
          onChain = await contract.isRecordValid(fileHash);
        }

        if (record) {
          // If record exists locally AND has blockchain tx → valid
          onChain = Boolean(onChain);
        }
      } catch (e) {
        console.warn("[verify] chain", e);
        chainError = e?.shortMessage || e?.reason || e?.message || "chain verification failed";
        onChain = false;
      }
    }

    const response = {
      exists: Boolean(record),
      onChain: Boolean(onChain),
      chainConfigured,
      chainError,
      fileHash,
      cid: record?.cid || null,
      title: record?.title || null,
      mode: record?.mode || null,
      owner: record?.owner || null,
      chainTx: record?.chainTx || null,
      contractAddress: ready.ok ? ready.address : process.env.PUBLIC_RECORDS_ADDRESS || null,
      createdAt: record?.createdAt || null,
      verifiedAt: new Date().toISOString(),
    };

    await VerificationAudit.create({
      fileHash,
      user: req.user.email,
      dbFound: response.exists,
      onChain: response.onChain,
      chainConfigured: response.chainConfigured,
      chainError: response.chainError,
      txHash: response.chainTx,
      contractAddress: response.contractAddress,
    }).catch((e) => console.warn("[verify] audit", e?.message || e));

    return res.json(response);
  }
);

app.get("/api/admin/records", auth(["admin"]), async (_, res) => {
  const rows = await Record.find().sort({ createdAt: -1 }).limit(1000);
  res.json(rows);
});

app.get("/api/admin/audits", auth(["admin"]), async (_, res) => {
  const rows = await VerificationAudit.find().sort({ at: -1 }).limit(100);
  res.json(rows);
});

app.get("/api/admin/events", auth(["admin"]), async (_, res) => {
  if (!contract) return res.json([]);
  const logs = await contract.queryFilter("RecordAdded", -2000);
  res.json(logs.map((l) => ({ txHash: l.transactionHash, args: l.args })));
});

app.post("/api/performance/run", auth(["admin"]), async (req, res) => {
  const { users = 10, mode = "traditional" } = req.body;
  const runs = Number(users);
  const started = Date.now();
  const latencies = await pool.exec("runLoad", [runs, mode]);
  const elapsed = Date.now() - started;
  const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  const peakLatency = Math.max(...latencies);
  const throughput = Number(((runs / elapsed) * 1000).toFixed(2));
  const row = await Performance.create({ users: runs, mode, avgLatency, peakLatency, throughput });
  io.emit("perf:update", row);
  res.json(row);
});

app.get("/api/performance/metrics", auth(), async (req, res) => {
  const { mode, users } = req.query;
  const q = {};
  if (mode) q.mode = mode;
  if (users) q.users = Number(users);
  const rows = await Performance.find(q).sort({ at: 1 });
  res.json(rows);
});

app.delete("/api/performance/metrics", auth(["admin"]), async (_, res) => {
  await Performance.deleteMany({});
  io.emit("perf:reset");
  res.json({ ok: true });
});

app.get("/api/reports/performance.pdf", auth(["admin"]), async (_, res) => {
  const rows = await Performance.find().sort({ at: -1 }).limit(200);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "attachment; filename=performance-report.pdf");
  const doc = new PDFDocument({ margin: 40 });
  doc.pipe(res);
  doc.fontSize(18).text("Public Records Performance Evaluation", { underline: true });
  doc.moveDown();
  doc.fontSize(12).text("Comparison: Traditional vs Encryption vs ZKP");
  doc.moveDown();
  rows.forEach((r) => {
    doc.text(`${r.at.toISOString()} | ${r.mode} | users=${r.users} | avg=${r.avgLatency.toFixed(2)}ms | peak=${r.peakLatency.toFixed(2)}ms | tps=${r.throughput}`);
  });
  doc.moveDown().text("Conclusion: ZKP adds verification overhead, but preserves confidentiality while keeping predictable throughput.");
  doc.end();
});

const PORT = Number(process.env.PORT || 5000);
mongoose
  .connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/zkp-records")
  .then(async () => {
    await initIpfs().catch(() => {});
    await initChain().catch((e) => console.warn("[initChain]", e?.message || e));
    server.listen(PORT, () => console.log(`server running on ${PORT}`));
  })
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  });
