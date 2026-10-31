// A tiny data layer. Routes call these functions and don't care whether
// data lives in MongoDB or in memory.
import { isMongo } from "../lib/db.js";
import { Diagnosis } from "../models/Diagnosis.js";

const memory = []; // used only when MongoDB is not configured

export async function saveDiagnosis(doc) {
  if (isMongo()) {
    const saved = await Diagnosis.create(doc);
    return saved.toObject();
  }
  const saved = { ...doc, _id: crypto.randomUUID(), createdAt: new Date() };
  memory.unshift(saved);
  return saved;
}

export async function listDiagnoses(farmerId, limit = 20) {
  if (isMongo()) {
    return Diagnosis.find({ farmerId }).sort({ createdAt: -1 }).limit(limit).lean();
  }
  return memory.filter((d) => d.farmerId === farmerId).slice(0, limit);
}

export async function deleteDiagnosis(farmerId, id) {
  if (isMongo()) {
    const r = await Diagnosis.deleteOne({ _id: id, farmerId });
    return r.deletedCount > 0;
  }
  const i = memory.findIndex((d) => d._id === id && d.farmerId === farmerId);
  if (i === -1) return false;
  memory.splice(i, 1);
  return true;
}
