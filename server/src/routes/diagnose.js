// POST /api/diagnose  - farmer uploads a plant photo, AI returns the diagnosis.
import { Router } from "express";
import multer from "multer";
import { diagnosePlant } from "../services/ai.js";
import { getWeather } from "../services/weather.js";
import { saveDiagnosis } from "../services/store.js";

const router = Router();
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// Keep the uploaded file in memory (we only need to forward it to the AI).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => cb(null, ALLOWED.includes(file.mimetype)),
});

router.post("/", upload.single("photo"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Please upload a photo (JPG, PNG or WEBP, max 5 MB)." });
    }
    const crop = clean(req.body.crop, 60);
    const notes = clean(req.body.notes, 500);
    const city = clean(req.body.city, 80);
    const language = req.body.language === "en" ? "en" : "hi";

    // Weather is optional - if it fails, we still diagnose.
    let weather = null;
    if (city) {
      try {
        weather = await getWeather(city);
      } catch (err) {
        console.warn("[weather]", err.message);
      }
    }

    const result = await diagnosePlant({
      imageBase64: req.file.buffer.toString("base64"),
      mediaType: req.file.mimetype,
      crop,
      notes,
      language,
      weather,
    });

    const thumb = req.body.thumbnail;
    const saved = await saveDiagnosis({
      farmerId: req.farmerId,
      crop: crop || result.crop,
      city,
      language,
      notes,
      thumbnail: isSmallJpeg(thumb) ? thumb : undefined,
      result,
      weather,
    });

    res.json(saved);
  } catch (err) {
    next(err);
  }
});

function clean(value, max) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function isSmallJpeg(s) {
  return typeof s === "string" && s.startsWith("data:image/jpeg;base64,") && s.length < 80_000;
}

export default router;
