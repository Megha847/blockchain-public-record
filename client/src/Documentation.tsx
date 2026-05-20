import { motion } from "framer-motion";

export default function Documentation() {
  const keywords = [
    {
      term: "Zero-Knowledge Proofs (ZKP)",
      def: "A cryptographic method by which one party (the prover) can prove to another party (the verifier) that a given statement is true while avoiding conveying any additional information apart from the fact that the statement is indeed true.",
    },
    {
      term: "zk-SNARKs",
      def: "Zero-Knowledge Succinct Non-Interactive Argument of Knowledge. A specific type of ZKP that is extremely fast to verify and requires no back-and-forth interaction between prover and verifier. Used in this project via ZoKrates.",
    },
    {
      term: "IPFS (InterPlanetary File System)",
      def: "A peer-to-peer hypermedia protocol designed to preserve and grow humanity's knowledge by making the web upgradeable, resilient, and more open. Used here for decentralized, tamper-proof document storage.",
    },
    {
      term: "Ethereum Smart Contracts",
      def: "Self-executing contracts with the terms of the agreement directly written into lines of code. The code and the agreements contained therein exist across a distributed, decentralized blockchain network.",
    },
    {
      term: "AES Encryption",
      def: "Advanced Encryption Standard. A symmetric block cipher used by the U.S. government to protect classified information and implemented in software and hardware throughout the world to encrypt sensitive data.",
    },
    {
      term: "Keccak-256 Hashing",
      def: "A cryptographic hash function used widely in Ethereum. It takes an input of any size and produces a fixed-size, completely unique 64-character string. Any change to the file completely changes the hash.",
    },
  ];

  const workflowSteps = [
    {
      title: "Step 1: Document Upload & Hashing",
      desc: "A user selects a document (e.g., PDF, image). The frontend calculates a unique cryptographic hash (Keccak-256) of the file before it even leaves the browser. This ensures privacy.",
      icon: "📄",
    },
    {
      title: "Step 2: IPFS Decentralized Storage",
      desc: "The actual file content is uploaded to the IPFS network. IPFS returns a unique Content Identifier (CID). The file is now stored securely off-chain, preventing blockchain bloat.",
      icon: "🌐",
    },
    {
      title: "Step 3: Blockchain Anchoring",
      desc: "The server takes the file's Hash and the IPFS CID and anchors them onto the Ethereum blockchain via a Smart Contract. This creates an immutable, timestamped public record.",
      icon: "⛓️",
    },
    {
      title: "Step 4: Cryptographic Proof Generation (Prover)",
      desc: "If the user wants to prove they own the document without revealing it, they generate a zk-SNARK proof using ZoKrates circuits. This heavy computation is done locally to preserve privacy.",
      icon: "🔐",
    },
    {
      title: "Step 5: On-Chain Verification (Verifier)",
      desc: "The smart contract or backend quickly mathematically verifies the zk-SNARK proof. If valid, the system confirms the document's authenticity without ever seeing the file contents.",
      icon: "✅",
    },
  ];

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "1rem" }}>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="brand-title" style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>
          Project Documentation
        </h1>
        <p className="muted" style={{ fontSize: "1.1rem", marginBottom: "3rem", maxWidth: "800px" }}>
          Welcome to the comprehensive guide for the <strong>Scalable and Secure Public Records System</strong>. 
          This document will take you from scratch to pro, explaining exactly how blockchain, IPFS, and Zero-Knowledge Proofs work together to secure public records.
        </p>

        {/* FROM SCRATCH TO PRO SECTION */}
        <section style={{ marginBottom: "4rem" }}>
          <h2 style={{ borderBottom: "1px solid #334155", paddingBottom: "10px", marginBottom: "20px" }}>
            The "Scratch to Pro" Learning Path
          </h2>
          <div className="grid2">
            <div className="glass p16">
              <h3 style={{ color: "#38bdf8" }}>1. The Scratch Level (The Problem)</h3>
              <p className="muted" style={{ fontSize: "0.95rem", lineHeight: 1.6 }}>
                Currently, government and medical records are stored in centralized databases. If a hacker breaches the database, records can be modified, deleted, or stolen. Furthermore, verifying a record requires fully exposing the private data to a third party.
              </p>
            </div>
            <div className="glass p16">
              <h3 style={{ color: "#a78bfa" }}>2. The Intermediate Level (The Traditional Fix)</h3>
              <p className="muted" style={{ fontSize: "0.95rem", lineHeight: 1.6 }}>
                We can use <strong>Hashing</strong> to fingerprint a file, and <strong>Blockchain</strong> to store that fingerprint immutably. Now, if the file changes, the hash changes, and the blockchain will reject it. We also add <strong>AES Encryption</strong> to hide the data.
              </p>
            </div>
            <div className="glass p16" style={{ gridColumn: "1 / -1" }}>
              <h3 style={{ color: "#4ade80" }}>3. The Pro Level (The Zero-Knowledge Solution)</h3>
              <p className="muted" style={{ fontSize: "0.95rem", lineHeight: 1.6 }}>
                AES requires sharing secret decryption keys, which is risky. Instead, we use <strong>zk-SNARKs</strong>. With ZKP, we can mathematically prove to a verifier that a document is valid and matches the blockchain anchor, <strong>without ever revealing the document itself or any passwords.</strong> This is the ultimate privacy-preserving solution.
              </p>
            </div>
          </div>
        </section>

        {/* WORKFLOW TIMELINE */}
        <section style={{ marginBottom: "4rem" }}>
          <h2 style={{ borderBottom: "1px solid #334155", paddingBottom: "10px", marginBottom: "20px" }}>
            End-to-End System Workflow
          </h2>
          <div style={{ position: "relative", paddingLeft: "30px" }}>
            {/* Timeline vertical line */}
            <div style={{ position: "absolute", left: "14px", top: "10px", bottom: "10px", width: "2px", backgroundColor: "#334155" }} />
            
            {workflowSteps.map((step, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
                style={{ position: "relative", marginBottom: "2rem" }}
              >
                {/* Timeline dot */}
                <div style={{ 
                  position: "absolute", left: "-27px", top: "4px", width: "22px", height: "22px", 
                  borderRadius: "50%", backgroundColor: "#0f172a", border: "2px solid #38bdf8",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px"
                }}>
                  {index + 1}
                </div>
                
                <div className="glass" style={{ padding: "1.2rem", marginLeft: "1rem" }}>
                  <h3 style={{ margin: "0 0 8px 0", display: "flex", alignItems: "center", gap: "10px" }}>
                    <span>{step.icon}</span> {step.title}
                  </h3>
                  <p className="muted" style={{ margin: 0, lineHeight: 1.5 }}>{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* KEYWORDS DICTIONARY */}
        <section style={{ marginBottom: "4rem" }}>
          <h2 style={{ borderBottom: "1px solid #334155", paddingBottom: "10px", marginBottom: "20px" }}>
            Theory &amp; Keywords Dictionary
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {keywords.map((kw, i) => (
              <div key={i} className="glass" style={{ padding: "1rem", borderLeft: "4px solid #475569" }}>
                <strong style={{ color: "#e2e8f0", fontSize: "1.1rem", display: "block", marginBottom: "5px" }}>
                  {kw.term}
                </strong>
                <span className="muted" style={{ lineHeight: 1.5 }}>
                  {kw.def}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section style={{ marginBottom: "4rem" }}>
          <h2 style={{ borderBottom: "1px solid #334155", paddingBottom: "10px", marginBottom: "20px" }}>
            Phase II: Hyperledger Fabric Roadmap
          </h2>
          <div className="grid2">
            <div className="glass p16">
              <h3 style={{ color: "#38bdf8" }}>Why Fabric Next</h3>
              <p className="muted" style={{ fontSize: "0.95rem", lineHeight: 1.6 }}>
                Phase I proves public anchoring with Ethereum, Ganache, MongoDB, IPFS, and ZKP verification. Phase II will extend the same public-records idea into a permissioned blockchain model using Hyperledger Fabric, which is closer to government, hospital, university, and enterprise record workflows.
              </p>
            </div>
            <div className="glass p16">
              <h3 style={{ color: "#a78bfa" }}>Planned Fabric Features</h3>
              <p className="muted" style={{ fontSize: "0.95rem", lineHeight: 1.6 }}>
                The next phase can introduce Fabric identities, organizations, channels, endorsement policies, private data collections, and chaincode-based record anchoring. This allows controlled access while preserving an immutable verification trail.
              </p>
            </div>
            <div className="glass p16" style={{ gridColumn: "1 / -1" }}>
              <h3 style={{ color: "#4ade80" }}>Evaluation Goal</h3>
              <p className="muted" style={{ fontSize: "0.95rem", lineHeight: 1.6 }}>
                The final comparison can show Ethereum-style public verification versus Fabric-style permissioned verification, focusing on trust model, access control, throughput, privacy, governance, and real-world suitability for public-record departments.
              </p>
            </div>
          </div>
        </section>

      </motion.div>
    </div>
  );
}
