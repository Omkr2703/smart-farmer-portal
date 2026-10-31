// GET    /api/history      - this farmer's past diagnoses
// DELETE /api/history/:id  - delete one
import { Router } from "express";
import { listDiagnoses, deleteDiagnosis } from "../services/store.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    res.json(await listDiagnoses(req.farmerId, 30));
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const ok = await deleteDiagnosis(req.farmerId, req.params.id);
    res.status(ok ? 204 : 404).end();
  } catch (err) {
    next(err);
  }
});

export default router;
