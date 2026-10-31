// GET /api/weather?city=Bhopal  - weather card on the home page
import { Router } from "express";
import { getWeather } from "../services/weather.js";

const router = Router();

router.get("/", async (req, res) => {
  const city = String(req.query.city || "").trim().slice(0, 80);
  if (!city) return res.status(400).json({ error: "city is required" });
  try {
    res.json(await getWeather(city));
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

export default router;
