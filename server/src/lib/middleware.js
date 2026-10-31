// Small helper middlewares.

// Every browser gets a random farmer id (saved in localStorage) and sends it in
// the "x-farmer-id" header. This keeps each farmer's history separate without a login.
export function requireFarmerId(req, res, next) {
  const id = req.get("x-farmer-id");
  if (!id || !/^[a-zA-Z0-9-]{8,64}$/.test(id)) {
    return res.status(400).json({ error: "Missing or invalid x-farmer-id header" });
  }
  req.farmerId = id;
  next();
}

// Simple rate limit: max `limit` requests per `windowMs` per IP.
// Protects the AI API key from being used too much (AI calls cost money).
export function rateLimit({ limit, windowMs }) {
  const hits = new Map(); // ip -> array of timestamps
  return (req, res, next) => {
    const now = Date.now();
    const recent = (hits.get(req.ip) || []).filter((t) => now - t < windowMs);
    if (recent.length >= limit) {
      return res.status(429).json({ error: "Too many requests. Please wait a minute and try again." });
    }
    recent.push(now);
    hits.set(req.ip, recent);
    next();
  };
}
