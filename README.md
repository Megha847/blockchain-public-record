# Scalable and Secure Public Records System

Full-stack research project combining blockchain anchoring, IPFS storage, and zkSNARK verification with performance evaluation.

## Stack

- Frontend: React + Vite + Framer Motion + Recharts + glassmorphism UI
- Backend: Node/Express + MongoDB + JWT + Socket.IO + Swagger + PDFKit
- Blockchain: Solidity + Hardhat + Ganache + ethers.js
- ZKP: ZoKrates circuits + zkSNARK Solidity verifiers (generated using `zokrates-js`)
- Storage: IPFS API

## Project Structure

- `client` React app
- `server` Node API
- `contracts` Solidity and deploy scripts
- `zkp/circuits` ZoKrates circuits
- `scripts/build-zkp.mjs` generates verifier contracts + zk artifacts

## Setup Commands

```bash
npm install
cd contracts && npm install
cd ..
npm run zkp:build
npm run contracts:compile
```

Start Ganache and deploy:

```bash
npm run contracts:deploy
```

Copy the deployed `publicRecords` address into `.env` as `PUBLIC_RECORDS_ADDRESS`.

Seed users:

```bash
npm run seed
```

Run server and client:

```bash
npm run dev
```

## Auth

- Admin: `admin@records.local` / `Admin@123`
- User: `user@records.local` / `User@1234`

## Core Features

1. JWT role-based auth (admin/user)
2. Record upload with duplicate prevention
3. IPFS CID storage + blockchain hash anchor
4. On-chain verification with emitted events
5. ZKP proof verification endpoints and verifier contracts
6. Performance engine for Traditional vs Encryption vs ZKP
7. Load simulation (10, 50, 100, 500 users)
8. Analytics dashboard with live websocket updates
9. Admin panel for records and event monitoring
10. Auto-generated PDF performance report (`/api/reports/performance.pdf`)

## API Docs

- Swagger UI: `http://localhost:5000/api/docs`

## Performance Experiments

Use:

```bash
cd server
npm run loadtest
```

This executes experiments for user loads `[10, 50, 100, 500]` and modes:
- `traditional`
- `encryption`
- `zkp`

Metrics stored in MongoDB:
- average latency
- peak latency
- throughput

## Notes

- Run IPFS daemon (`kubo`) for real CID writes.
- If IPFS is unavailable, server falls back to deterministic offline CID labels so the rest of the pipeline remains testable.
