const crypto = require("crypto");
const workerpool = require("workerpool");

async function runLoad(users, mode) {
  const jobs = Array.from({ length: users }, async () => {
    const start = Date.now();
    const payload = crypto.randomBytes(512);
    if (mode === "encryption") {
      const key = crypto.randomBytes(32);
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
      Buffer.concat([cipher.update(payload), cipher.final()]);
    } else if (mode === "zkp") {
      for (let i = 0; i < 30000; i += 1) {
        crypto.createHash("sha256").update(payload).digest("hex");
      }
    } else {
      for (let i = 0; i < 1000; i += 1) crypto.createHash("md5").update(payload).digest("hex");
    }
    return Date.now() - start;
  });
  return Promise.all(jobs);
}

workerpool.worker({ runLoad });
