// config/db.js — single MongoDB connection via mongoose.

const mongoose = require("mongoose");

async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error("MONGO_URI is not set (see server/.env.example)");
  }
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri);
  console.log("MongoDB connected");
  return mongoose.connection;
}

module.exports = connectDB;
