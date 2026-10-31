// Entry point of the backend server.
import "dotenv/config"; // loads variables from .env into process.env
import express from "express";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import { MulterError } from "multer";
import { connectDB } from "./lib/db.js";
import { requireFarmerId, rateLimit } from "./lib/middleware.js";
import { AIError } from "./services/ai.js";
import diagnoseRoute from "./routes/diagnose.js";
import chatRoute from "./routes/chat.js";
import historyRoute from "./routes/history.js";
import weatherRoute from "./routes/weather.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.set("trust proxy", 1); // needed on Render/Railway so req.ip is the real user IP
app.use(cors({ origin: process.env.CLIENT_ORIGIN || true }));
app.use(express.json({ limit: "200kb" }));

app.get("/api/health", (req, res) => res.json({ ok: true }));

const aiLimit = rateLimit({ limit: 10, windowMs: 60_000 }); // 10 AI calls per minute per IP
app.use("/api/weather", weatherRoute);
app.use("/api/diagnose", requireFarmerId, aiLimit, diagnoseRoute);
app.use("/api/chat", requireFarmerId, aiLimit, chatRoute);
app.use("/api/history", requireFarmerId, historyRoute);

// In production, the same server also serves the built React app (client/dist).
const here = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(here, "../../client/dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api).*/, (req, res) => res.sendFile(path.join(clientDist, "index.html")));
}

// Central error handler - turns errors into friendly JSON.
app.use((err, req, res, next) => {
  if (err instanceof MulterError) {
    return res.status(400).json({ error: "Photo is too large (max 5 MB)." });
  }
  if (err instanceof AIError) {
    return res.status(422).json({ error: err.message });
  }
  if (err instanceof Anthropic.RateLimitError) {
    return res.status(503).json({ error: "AI is busy right now. Please try again in a minute." });
  }
  if (err instanceof Anthropic.AuthenticationError) {
    console.error("[ai] Invalid ANTHROPIC_API_KEY");
    return res.status(500).json({ error: "AI service is not configured." });
  }
  if (err instanceof Anthropic.APIError) {
    console.error("[ai]", err.status, err.message);
    return res.status(502).json({ error: "AI service error. Please try again." });
  }
  console.error(err);
  res.status(500).json({ error: "Something went wrong. Please try again." });
});

connectDB()
  .then(() => app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`)))
  .catch((err) => {
    console.error("Failed to start:", err);
    process.exit(1);
  });
