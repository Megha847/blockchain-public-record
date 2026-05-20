const axios = require("axios");
require("dotenv").config();

async function login() {
  const base = process.env.API_BASE || "http://localhost:5000";
  const r = await axios.post(`${base}/api/auth/login`, {
    email: process.env.ADMIN_EMAIL || "admin@records.local",
    password: process.env.ADMIN_PASSWORD || "Admin@123",
  });
  return r.data.token;
}

async function run() {
  const base = process.env.API_BASE || "http://localhost:5000";
  const token = await login();
  for (const users of [10, 50, 100, 500]) {
    for (const mode of ["traditional", "encryption", "zkp"]) {
      const r = await axios.post(
        `${base}/api/performance/run`,
        { users, mode },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log(users, mode, r.data.avgLatency, r.data.throughput);
    }
  }
}

run().catch((e) => {
  console.error(e.response?.data || e.message);
  process.exit(1);
});
