// Mongoose schema: one document = one plant photo checked by the AI.
import mongoose from "mongoose";

const diagnosisSchema = new mongoose.Schema(
  {
    farmerId: { type: String, required: true, index: true },
    crop: String,
    city: String,
    language: { type: String, enum: ["hi", "en"], default: "hi" },
    notes: String,
    // A small thumbnail (base64 JPEG) so the history page can show the photo.
    thumbnail: String,
    // Full AI result (disease name, treatment, etc.).
    result: { type: Object, required: true },
    weather: Object,
  },
  { timestamps: true } // adds createdAt and updatedAt automatically
);

export const Diagnosis = mongoose.model("Diagnosis", diagnosisSchema);
