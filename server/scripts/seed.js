const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "../../.env"), override: true });

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ["admin", "user"], default: "user" },
});

const User = mongoose.model("User", userSchema);

async function run() {
  console.log("Mongo URI:", process.env.MONGO_URI);

  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing in root .env");
  }

  await mongoose.connect(process.env.MONGO_URI, {
    dbName: "zkp-records",
  });

  const admin = await User.findOne({
    email: "admin@records.local",
  });

  if (!admin) {
    await User.create({
      name: "Admin",
      email: "admin@records.local",
      password: await bcrypt.hash("Admin@123", 12),
      role: "admin",
    });
  }

  const user = await User.findOne({
    email: "user@records.local",
  });

  if (!user) {
    await User.create({
      name: "User",
      email: "user@records.local",
      password: await bcrypt.hash("User@1234", 12),
      role: "user",
    });
  }

  await mongoose.disconnect();
  console.log("seed complete");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
