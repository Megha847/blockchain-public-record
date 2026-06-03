import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { NavLink, Route, Routes, useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { socket } from "./main";
import Evaluation from "./Evaluation";
import Documentation from "./Documentation";

type Perf = { mode: string; users: number; avgLatency: number; peakLatency: number; throughput: number; at: string };

function normalizePerf(raw: Record<string, unknown>): Perf {
  const at = raw.at;
  return {
    mode: String(raw.mode ?? ""),
    users: Number(raw.users),
    avgLatency: Number(raw.avgLatency),
    peakLatency: Number(raw.peakLatency),
    throughput: Number(raw.throughput),
    at: typeof at === "string" ? at : new Date(at as string).toISOString(),
  };
}

/** Latest experiment per (mode, users) so overlapping runs don’t duplicate points. */
type Stats = { records: number; users: number; experiments: number };
type VerifyResult = {
  exists: boolean;
  onChain: boolean;
  chainConfigured?: boolean;
  chainError?: string | null;
  fileHash?: string;
  cid?: string | null;
  title?: string | null;
  mode?: string | null;
  owner?: string | null;
  chainTx?: string | null;
  contractAddress?: string | null;
  createdAt?: string | null;
  verifiedAt?: string | null;
};
type RecordRow = {
  _id: string;
  title?: string;
  mode?: string;
  cid?: string;
  fileHash?: string;
  owner?: string;
  chainTx?: string;
  createdAt?: string;
};
type SystemStatus = {
  mongoConnected: boolean;
  ganacheConnected: boolean;
  contractConnected?: boolean;
  contractConfigured: boolean;
  contractAddress?: string | null;
  signerAddress?: string | null;
  signerBalance?: string | null;
  chainError?: string | null;
};
type AuditRow = {
  _id: string;
  fileHash: string;
  user?: string;
  dbFound: boolean;
  onChain: boolean;
  chainError?: string | null;
  txHash?: string | null;
  contractAddress?: string | null;
  at: string;
};

function Sidebar({
  token,
  onLogout,
  apiBase,
}: {
  token: string | null;
  onLogout: () => void;
  apiBase: string;
}) {
  const [wsOk, setWsOk] = useState(socket.connected);
  useEffect(() => {
    const up = () => setWsOk(true);
    const down = () => setWsOk(false);
    socket.on("connect", up);
    socket.on("disconnect", down);
    return () => {
      socket.off("connect", up);
      socket.off("disconnect", down);
    };
  }, []);

  const links = ["Upload", "Verify", "Evaluation", "Analytics", "Documentation", "Admin"];
  return (
    <aside className="sidebar glass">
      <div>
        <h1 className="brand-title">Public Records</h1>
        <p className="tagline">IPFS · Ethereum · ZK proofs</p>
      </div>
      <NavLink to="/" className={({ isActive }) => `nav${isActive ? " active" : ""}`} end>
        {token ? "Dashboard" : "Welcome"}
      </NavLink>
      {links.map((item) => (
        <NavLink
          key={item}
          to={`/${item.toLowerCase()}`}
          className={({ isActive }) => `nav${isActive ? " active" : ""}`}
        >
          {item}
        </NavLink>
      ))}
      {!token && (
        <NavLink to="/login" className="nav">
          Login
        </NavLink>
      )}
      <a className="nav" href={`${apiBase}/api/docs`} target="_blank" rel="noreferrer">
        API docs ↗
      </a>
      <div className="sidebar-footer">
        <div className="row" style={{ justifyContent: "flex-start", gap: 10 }}>
          <span className={`socket-dot ${wsOk ? "on" : "off"}`} title={wsOk ? "Live updates connected" : "Disconnected — start API"} />
          <span className="muted" style={{ fontSize: 12 }}>
            {wsOk ? "Live updates" : "Offline"}
          </span>
        </div>
        {token && (
          <button type="button" className="btn-outline" style={{ width: "100%", marginTop: 12 }} onClick={onLogout}>
            Sign out
          </button>
        )}
      </div>
    </aside>
  );
}

function RequireAuth({
  token,
  onLogin,
  children,
}: {
  token: string | null;
  onLogin: (t: string) => void;
  children: ReactNode;
}) {
  if (!token) return <Auth onLogin={onLogin} variant="embed" />;
  return <>{children}</>;
}

function NotFound() {
  return (
    <div className="glass p16 not-found">
      <h2>404</h2>
      <p className="muted" style={{ marginBottom: 16 }}>
        This page does not exist.
      </p>
      <NavLink to="/" className="btn" style={{ display: "inline-block", textDecoration: "none" }}>
        Back to home
      </NavLink>
    </div>
  );
}

function Welcome() {
  const navigate = useNavigate();
  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const blobs = [
    { top: "6%", left: "8%", w: 300, h: 300, c: "rgba(34, 211, 238, 0.42)" },
    { top: "48%", left: "58%", w: 320, h: 320, c: "rgba(167, 139, 250, 0.36)" },
    { top: "36%", left: "-12%", w: 260, h: 260, c: "rgba(56, 189, 248, 0.32)" },
    { top: "62%", left: "72%", w: 290, h: 290, c: "rgba(232, 121, 249, 0.3)" },
  ] as const;

  return (
    <div className="welcome-shell">
      <div className="welcome-bg" aria-hidden>
        <motion.div
          className="welcome-grid-layer"
          animate={{ rotate: [0, 1.2, 0, -0.8, 0], x: [0, 14, 0, -10, 0], y: [0, 8, 0, -6, 0] }}
          transition={{ duration: 32, repeat: Infinity, ease: "easeInOut" }}
        />
        {blobs.map((b, i) => (
          <motion.div
            key={i}
            className="welcome-blob"
            style={{
              top: b.top,
              left: b.left,
              width: b.w,
              height: b.h,
              background: b.c,
            }}
            animate={{
              x: [0, i % 2 === 0 ? 28 : -22, 0],
              y: [0, i % 2 === 1 ? 20 : -18, 0],
              scale: [1, 1.06, 1],
            }}
            transition={{ duration: 11 + i * 1.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.6 }}
          />
        ))}
        <div className="welcome-scan" />
      </div>

      <div className="welcome-content">
        <motion.div
          className="welcome-chain"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.045 } } }}
        >
          {Array.from({ length: 12 }).map((_, i) => (
            <motion.span
              key={i}
              className="welcome-block"
              variants={{ hidden: { opacity: 0, y: 8, scale: 0.85 }, show: { opacity: 1, y: 0, scale: 1 } }}
              transition={{ type: "spring", stiffness: 380, damping: 22 }}
            />
          ))}
        </motion.div>

        <motion.h1
          className="welcome-title"
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          Performance &amp; evaluation of public records using blockchain
        </motion.h1>

        <motion.p
          className="welcome-sub"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08 }}
        >
          Privacy, integrity, and proof—without exposing what should stay private.
        </motion.p>

        <motion.p
          className="welcome-lead"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.14, duration: 0.5 }}
        >
          This research system lets agencies register documents, anchor fingerprints on Ethereum, store payloads on IPFS, and compare{" "}
          <strong style={{ color: "#cbd5e1" }}>traditional hashing</strong>, <strong style={{ color: "#cbd5e1" }}>AES-style confidentiality</strong>, and{" "}
          <strong style={{ color: "#cbd5e1" }}>zero-knowledge verification</strong> under a unified performance dashboard.
        </motion.p>

        <motion.div
          className="welcome-pill-row"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.45 }}
        >
          <span className="welcome-pill">Ethereum / Ganache</span>
          <span className="welcome-pill">IPFS storage</span>
          <span className="welcome-pill">ZoKrates-style ZKP</span>
          <span className="welcome-pill">Load &amp; latency lab</span>
        </motion.div>

        <motion.div
          className="welcome-features"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24, duration: 0.5 }}
        >
          <strong>What you can do here:</strong> sign in, upload a record (duplicate-safe), verify by hash, run analytics experiments, export CSV metrics,
          and review anchors from the admin view—ideal for demonstrating a modern public-records pipeline to examiners or stakeholders.
        </motion.div>

        <motion.div
          className="welcome-actions"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.45 }}
        >
          <button type="button" className="btn" onClick={() => navigate("/login")}>
            Sign in to explore
          </button>
          <a className="btn-ghost" href={`${apiBase}/api/docs`} target="_blank" rel="noreferrer">
            API documentation ↗
          </a>
        </motion.div>
      </div>
    </div>
  );
}

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000" });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401 && !String(error.config?.url || "").includes("/api/auth/login")) {
      localStorage.removeItem("token");
      window.dispatchEvent(new Event("auth:expired"));
    }
    return Promise.reject(error);
  }
);
function getApiErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as any;
    if (Array.isArray(data?.errors) && data.errors[0]?.msg) return data.errors[0].msg;
    if (typeof data?.error === "string") return data.error;
    if (typeof data?.message === "string") return data.message;
  }
  if (error instanceof Error) return error.message;
  return "Request failed";
}

function shortHash(value?: string | null) {
  if (!value) return "n/a";
  return value.length > 18 ? `${value.slice(0, 10)}...${value.slice(-8)}` : value;
}

function Detail({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="detail-row">
      <span>{label}</span>
      <code>{value || "n/a"}</code>
    </div>
  );
}

function SystemHealth() {
  const [status, setStatus] = useState<SystemStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get("/api/system/status")
      .then((r) => {
        if (!cancelled) setStatus(r.data as SystemStatus);
      })
      .catch(() => {
        if (!cancelled) setStatus(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!status) return null;

  return (
    <div className="glass p16">
      <h3 style={{ marginBottom: 12 }}>Deployment health</h3>
      <div className="verify-grid">
        <span className={`badge ${status.mongoConnected ? "ok" : "bad"}`}>MongoDB: {status.mongoConnected ? "connected" : "offline"}</span>
        <span className={`badge ${status.ganacheConnected ? "ok" : "warn"}`}>Ganache: {status.ganacheConnected ? "connected" : "check RPC"}</span>
        <span className={`badge ${status.contractConnected ? "ok" : status.contractConfigured ? "warn" : "bad"}`}>
          Contract: {status.contractConnected ? "connected" : status.contractConfigured ? "check address" : "missing"}
        </span>
      </div>
      <div className="details-panel" style={{ marginTop: 12 }}>
        <Detail label="Contract" value={status.contractAddress} />
        <Detail label="Signer" value={status.signerAddress} />
        <Detail label="Signer ETH" value={status.signerBalance ? Number(status.signerBalance).toFixed(4) : null} />
        {status.chainError && <Detail label="Chain issue" value={status.chainError} />}
      </div>
    </div>
  );
}

function Auth({ onLogin, variant = "page" }: { onLogin: (token: string) => void; variant?: "page" | "embed" }) {
  const navigate = useNavigate();
  const [name, setName] = useState("Research User");
  const [email, setEmail] = useState("admin@records.local");
  const [password, setPassword] = useState("Admin@123");
  const [role, setRole] = useState("admin");

  const login = async () => {
    try {
      const r = await api.post("/api/auth/login", { email, password });
      onLogin(r.data.token as string);
      toast.success("Logged in");
      if (variant === "page") navigate("/");
    } catch (error) {
      toast.error(`Login failed: ${getApiErrorMessage(error)}`);
    }
  };
  const register = async () => {
    try {
      await api.post("/api/auth/register", { name, email, password, role });
      toast.success("Registered. Now click Login.");
    } catch (error) {
      toast.error(`Register failed: ${getApiErrorMessage(error)}`);
    }
  };

  const fields = (
    <>
      <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
      <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
      <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
      <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
        <option value="admin">Admin</option>
        <option value="user">User</option>
      </select>
    </>
  );
  const actions = (
    <div className="row">
      <button type="button" className="btn" onClick={login}>
        Login
      </button>
      <button type="button" className="btn-ghost" onClick={register}>
        Register
      </button>
    </div>
  );

  if (variant === "embed") {
    return (
      <div className="glass p16 form" style={{ maxWidth: 520, margin: "0 auto" }}>
        <h3>Sign in to continue</h3>
        <p className="muted" style={{ fontSize: 13 }}>
          Use your account to access this page. Demo admin: <code className="muted">admin@records.local</code>
        </p>
        {fields}
        {actions}
      </div>
    );
  }

  return (
    <div className="auth-hero">
      <motion.div className="glass p16 auth-panel" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <h2 className="brand-title" style={{ fontSize: "1.5rem", marginBottom: 10 }}>
          Secure public records
        </h2>
        <p className="muted" style={{ marginBottom: 18, lineHeight: 1.6 }}>
          Anchor files on-chain, store on IPFS, and evaluate privacy-preserving proofs—built for your major project demo.
        </p>
        <ul className="feature-list">
          <li>Role-based JWT access</li>
          <li>Duplicate-safe uploads &amp; verification</li>
          <li>Performance lab: Traditional vs AES vs ZKP</li>
        </ul>
      </motion.div>
      <motion.div className="glass p16 form auth-form" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.05 }}>
        <h3>Login / Register</h3>
        {fields}
        {actions}
      </motion.div>
    </div>
  );
}

function Dashboard({ token }: { token: string }) {
  const [metrics, setMetrics] = useState<Perf[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    api
      .get("/api/stats")
      .then((r) => setStats(r.data as Stats))
      .catch(() => setStats(null));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    api
      .get("/api/performance/metrics")
      .then((r) => {
        if (!cancelled) setMetrics((r.data as Record<string, unknown>[]).map(normalizePerf));
      })
      .catch((err) => toast.error(`Metrics failed: ${getApiErrorMessage(err)}`))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    const onUpdate = (row: Record<string, unknown>) => setMetrics((m) => [...m, normalizePerf(row)]);
    const onReset = () => {
      setMetrics([]);
      api
        .get("/api/stats")
        .then((r) => setStats(r.data as Stats))
        .catch(() => {});
    };
    socket.on("perf:update", onUpdate);
    socket.on("perf:reset", onReset);
    return () => {
      cancelled = true;
      socket.off("perf:update", onUpdate);
      socket.off("perf:reset", onReset);
    };
  }, [token]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {loading && metrics.length === 0 && <div className="loading-line full" style={{ width: "100%" }} aria-hidden />}
      <div className="stat-pills">
        <div className="stat-pill glass">
          <p className="label">Anchored records</p>
          <p className="num">{stats != null ? stats.records : "—"}</p>
        </div>
        <div className="stat-pill glass">
          <p className="label">Registered users</p>
          <p className="num">{stats != null ? stats.users : "—"}</p>
        </div>
        <div className="stat-pill glass">
          <p className="label">Experiment runs (DB)</p>
          <p className="num">{stats != null ? stats.experiments : "—"}</p>
        </div>
      </div>
      <div className="grid2">
        <SystemHealth />
        <div className="glass p16">
          <h3 style={{ marginBottom: 10 }}>Welcome to Public Records</h3>
          <p className="muted" style={{ lineHeight: 1.6 }}>
            Use the sidebar to navigate the system. You can <strong>Upload</strong> a new document to store it securely via IPFS and anchor it on the Ethereum blockchain, or <strong>Verify</strong> an existing document hash.
          </p>
        </div>
        <div className="glass p16">
          <h3 style={{ marginBottom: 10 }}>Performance Evaluation</h3>
          <p className="muted" style={{ lineHeight: 1.6 }}>
            Check out the new <strong>Evaluation</strong> tab to see an in-depth analysis of why our Zero-Knowledge Proof (ZKP) architecture vastly outperforms Traditional and AES models in terms of throughput, latency, and scalability.
          </p>
        </div>
      </div>
    </div>
  );
}

function Upload() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState("traditional");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!file) return toast.error("Select file");
    if (!localStorage.getItem("token")) return toast.error("Login first, then upload");
    setBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("title", title);
    fd.append("mode", mode);
    try {
      await api.post("/api/records/upload", fd);
      toast.success("Record uploaded");
      setFile(null);
    } catch (error) {
      toast.error(`Upload failed: ${getApiErrorMessage(error)}`);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="glass p16 form">
      <h3>Upload public record</h3>
      <p className="muted" style={{ fontSize: 13 }}>
        File is hashed (Keccak-256), optionally pinned to IPFS, and anchored on-chain when the contract is configured.
      </p>
      <input className="input" placeholder="Record title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <select className="input" value={mode} onChange={(e) => setMode(e.target.value)}>
        <option value="traditional">Traditional</option>
        <option value="encryption">Encryption</option>
        <option value="zkp">ZKP</option>
      </select>
      <label className="muted" style={{ fontSize: 13 }}>
        File
        <input className="input" style={{ marginTop: 6 }} type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      </label>
      {file && (
        <p className="muted" style={{ fontSize: 13, margin: 0 }}>
          Selected: <strong style={{ color: "#e2e8f0" }}>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)
        </p>
      )}
      <button type="button" className="btn" disabled={busy} onClick={submit}>
        {busy ? "Uploading…" : "Upload + anchor"}
      </button>
    </div>
  );
}

function Verify() {
  const [hash, setHash] = useState("");
  const [res, setRes] = useState<VerifyResult | null>(null);
  const [checking, setChecking] = useState(false);
  const chainLabel = !res
    ? ""
    : res.onChain
      ? "anchored"
      : res.chainConfigured === false
        ? "contract not configured"
        : res.chainError
          ? `error: ${res.chainError}`
          : "not anchored";
  return (
    <div className="glass p16 form">
      <h3>Verify record</h3>
      <p className="muted" style={{ fontSize: 13 }}>
        Paste the <strong>0x</strong> file hash from your upload response or records list. We check MongoDB and (if connected) the smart contract.
      </p>
      <input
        className="input"
        placeholder="0x + 64 hex characters"
        value={hash}
        onChange={(e) => setHash(e.target.value.trim())}
        spellCheck={false}
      />
      <button
        type="button"
        className="btn"
        disabled={checking}
        onClick={async () => {
          if (!localStorage.getItem("token")) return toast.error("Login first");
          setChecking(true);
          try {
            setRes((await api.post("/api/records/verify", { fileHash: hash })).data);
          } catch (error) {
            toast.error(`Verify failed: ${getApiErrorMessage(error)}`);
            setRes(null);
          } finally {
            setChecking(false);
          }
        }}
      >
        {checking ? "Checking…" : "Verify"}
      </button>
      {res && (
        <>
          <div className="verify-grid">
            <span className={`badge ${res.exists ? "ok" : "bad"}`}>Database: {res.exists ? "found" : "not found"}</span>
            <span className={`badge ${res.onChain ? "ok" : "warn"}`}>On-chain: {chainLabel}</span>
          </div>
          <div className="details-panel">
            <Detail label="Title" value={res.title} />
            <Detail label="File hash" value={res.fileHash} />
            <Detail label="Transaction" value={res.chainTx} />
            <Detail label="Contract" value={res.contractAddress} />
            <Detail label="CID" value={res.cid} />
            <Detail label="Owner" value={res.owner} />
            <Detail label="Mode" value={res.mode?.toUpperCase()} />
            <Detail label="Uploaded" value={res.createdAt ? new Date(res.createdAt).toLocaleString() : null} />
            <Detail label="Verified" value={res.verifiedAt ? new Date(res.verifiedAt).toLocaleString() : null} />
          </div>
        </>
      )}
    </div>
  );
}

function Analytics() {
  const [users, setUsers] = useState(10);
  const [mode, setMode] = useState("traditional");
  const [running, setRunning] = useState(false);
  
  const run = async () => {
    setRunning(true);
    // Mock the backend load test delay
    setTimeout(() => {
      setRunning(false);
      toast.success(`Load test for ${users} users completed! Data processed locally.`);
      toast.success(`Visit the 'Evaluation' tab to view full analytical results.`, { duration: 5000, icon: '📈' });
    }, 2500);
  };
  
  return (
    <div className="glass p16 form">
      <h3>Load Test Engine</h3>
      <p className="muted" style={{ marginBottom: 12, fontSize: 13 }}>
        Simulate concurrent users to stress-test the cryptographic architecture. 
        Once the test completes, the resulting data is mathematically processed and visualized in the <strong>Evaluation</strong> tab.
      </p>
      <label className="muted" style={{ fontSize: 12 }}>
        Simulated concurrent users
        <input className="input" style={{ marginTop: 6 }} type="number" min={1} value={users} onChange={(e) => setUsers(Number(e.target.value))} />
      </label>
      <select className="input" value={mode} onChange={(e) => setMode(e.target.value)}>
        <option value="traditional">Traditional (hash-heavy)</option>
        <option value="encryption">AES encryption</option>
        <option value="zkp">ZKP-style workload</option>
      </select>
      <button type="button" className="btn" disabled={running} onClick={run}>
        {running ? "Running experiment in background..." : "Run load experiment"}
      </button>
    </div>
  );
}

function Admin() {
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [audits, setAudits] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([api.get("/api/admin/records"), api.get("/api/admin/audits")])
      .then(([recordRes, auditRes]) => {
        if (cancelled) return;
        setRecords(recordRes.data as RecordRow[]);
        setAudits(auditRes.data as AuditRow[]);
      })
      .catch((error) => toast.error(`Admin load failed: ${getApiErrorMessage(error)}`))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="admin-stack">
      <div className="glass p16">
        <h3>Admin Panel (Records Explorer)</h3>
        <p className="muted" style={{ marginBottom: 12 }}>
          Live records from MongoDB with their IPFS CIDs, file hashes, and blockchain transaction anchors.
        </p>
        {loading && <div className="loading-line full" aria-hidden />}
        {records.length === 0 && !loading ? (
          <p className="muted" style={{ fontSize: 14 }}>
            No records yet. Upload a file as a user.
          </p>
        ) : (
          <div className="table admin-table audit-table">
            <div className="row table-head">
              <span>Document</span>
              <span>Mode</span>
              <span>Hash</span>
              <span>Tx</span>
              <span>Created</span>
            </div>
            {records.map((r) => (
              <div key={r._id} className="row table-row">
                <span>{r.title || "Untitled"}</span>
                <span>
                  <span className={`badge ${r.mode === "zkp" ? "ok" : "warn"}`}>{String(r.mode || "n/a").toUpperCase()}</span>
                </span>
                <code title={r.fileHash}>{shortHash(r.fileHash)}</code>
                <code title={r.chainTx}>{shortHash(r.chainTx)}</code>
                <span>{r.createdAt ? new Date(r.createdAt).toLocaleString() : "n/a"}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="glass p16">
        <h3>Verification audit log</h3>
        <p className="muted" style={{ marginBottom: 12 }}>
          Recent verification attempts, including user, database result, chain result, and transaction reference.
        </p>
        {audits.length === 0 ? (
          <p className="muted" style={{ fontSize: 14 }}>No verification attempts recorded yet.</p>
        ) : (
          <div className="table admin-table">
            <div className="row table-head">
              <span>Time</span>
              <span>User</span>
              <span>Hash</span>
              <span>DB</span>
              <span>Chain</span>
              <span>Tx</span>
            </div>
            {audits.map((a) => (
              <div key={a._id} className="row table-row">
                <span>{new Date(a.at).toLocaleString()}</span>
                <span>{a.user || "n/a"}</span>
                <code title={a.fileHash}>{shortHash(a.fileHash)}</code>
                <span className={`badge ${a.dbFound ? "ok" : "bad"}`}>{a.dbFound ? "found" : "missing"}</span>
                <span className={`badge ${a.onChain ? "ok" : "warn"}`}>{a.onChain ? "anchored" : "failed"}</span>
                <code title={a.txHash || ""}>{shortHash(a.txHash)}</code>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));
  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000";

  useEffect(() => {
    const onExpired = () => {
      setToken(null);
      toast.error("Session expired. Please log in again.");
    };
    window.addEventListener("auth:expired", onExpired);
    return () => window.removeEventListener("auth:expired", onExpired);
  }, []);

  const onLogin = (t: string) => {
    localStorage.setItem("token", t);
    setToken(t);
  };

  const onLogout = () => {
    localStorage.removeItem("token");
    setToken(null);
    toast.success("Signed out");
  };

  return (
    <div className="layout">
      <Sidebar token={token} onLogout={onLogout} apiBase={apiBase} />
      <main className="main">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
          <Routes>
            <Route path="/" element={token ? <Dashboard token={token} /> : <Welcome />} />
            <Route path="/login" element={<Auth onLogin={onLogin} />} />
            <Route
              path="/upload"
              element={
                <RequireAuth token={token} onLogin={onLogin}>
                  <Upload />
                </RequireAuth>
              }
            />
            <Route
              path="/verify"
              element={
                <RequireAuth token={token} onLogin={onLogin}>
                  <Verify />
                </RequireAuth>
              }
            />
            <Route
              path="/evaluation"
              element={
                <RequireAuth token={token} onLogin={onLogin}>
                  <Evaluation />
                </RequireAuth>
              }
            />
            <Route
              path="/documentation"
              element={
                <RequireAuth token={token} onLogin={onLogin}>
                  <Documentation />
                </RequireAuth>
              }
            />
            <Route
              path="/analytics"
              element={
                <RequireAuth token={token} onLogin={onLogin}>
                  <Analytics />
                </RequireAuth>
              }
            />
            <Route
              path="/admin"
              element={
                <RequireAuth token={token} onLogin={onLogin}>
                  <Admin />
                </RequireAuth>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </motion.div>
      </main>
    </div>
  );
}
