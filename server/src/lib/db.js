// Database connection.
// If MONGODB_URI is set, we use MongoDB (via Mongoose).
// If it is empty or "none", we fall back to an in-memory store so the app still runs locally.
import mongoose from "mongoose";

let usingMongo = false;

export async function connectDB() {
  const uri = (process.env.MONGODB_URI || "").trim();
  if (!uri || uri.toLowerCase() === "none") {
    console.warn("[db] MONGODB_URI not set - using in-memory storage (data is lost on restart).");
    return;
  }
  await mongoose.connect(uri);
  usingMongo = true;
  console.log("[db] Connected to MongoDB");
}

export function isMongo() {
  return usingMongo;
}
