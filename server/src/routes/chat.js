// POST /api/chat  - chat with the AI assistant.
// Body: { messages: [{role, content}], language: "hi"|"en", city?: string }
import { Router } from "express";
import { z } from "zod";
import { chatWithAgent } from "../services/ai.js";

const router = Router();

const ChatBody = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(2000) }))
    .min(1)
    .max(30),
  language: z.enum(["hi", "en"]).default("hi"),
  city: z.string().max(80).optional(),
});

router.post("/", async (req, res, next) => {
  const parsed = ChatBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid chat request" });
  }
  const { messages, language, city } = parsed.data;
  if (messages.at(-1).role !== "user") {
    return res.status(400).json({ error: "Last message must be from the user" });
  }
  try {
    const reply = await chatWithAgent({
      messages: messages.slice(-12), // keep only recent history (saves cost)
      language,
      city,
      farmerId: req.farmerId,
    });
    res.json({ reply });
  } catch (err) {
    next(err);
  }
});

export default router;
