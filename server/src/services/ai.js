// All AI logic lives here (Google Gemini API - free tier).
//  1. diagnosePlant()  - looks at a plant photo and returns a structured report (JSON).
//  2. chatWithAgent()  - a chat assistant that can call tools (weather, farmer's history).
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { getWeather } from "./weather.js";
import { listDiagnoses } from "./store.js";

// Get a free key from https://aistudio.google.com/apikey
if (!process.env.GEMINI_API_KEY) console.error("[ai] GEMINI_API_KEY is not set!");
// timeout: give up on one call after 30 s. attempts: 1 turns off the SDK's own slow
// retries (up to 5 tries with growing waits) - we switch to the next model instead.
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: { timeout: 30_000, retryOptions: { attempts: 1 } },
});
// Free-tier models, tried in order. If one is busy (503), over its limit (429)
// or not available (404), we automatically try the next one.
// Override with GEMINI_MODELS="model-a,model-b" if Google renames them.
const MODELS = (process.env.GEMINI_MODELS || "gemini-flash-latest,gemini-flash-lite-latest,gemini-2.5-flash,gemini-2.5-flash-lite")
  .split(",").map((m) => m.trim()).filter(Boolean);
const RETRYABLE = new Set([404, 429, 500, 503]);

// Call Gemini with automatic fallback to the next model.
async function generate(request) {
  let lastError;
  for (const model of MODELS) {
    try {
      const response = await ai.models.generateContent({ ...request, model });
      response.usedModel = model;
      return response;
    } catch (err) {
      lastError = err;
      if (!RETRYABLE.has(err.status)) throw err; // e.g. bad key - no point trying other models
      console.warn(`[ai] ${model} failed (${err.status}), trying next model`);
    }
  }
  throw lastError;
}

const LANG_NAME = { hi: "simple Hindi (Devanagari script)", en: "simple English" };

// ---------------------------------------------------------------------------
// 1. Plant diagnosis from a photo
// ---------------------------------------------------------------------------

// The exact shape of the answer we want back. Gemini is told to follow this
// JSON schema, and we validate the reply with Zod before using it.
const DiagnosisSchema = z.object({
  isPlant: z.boolean().describe("false if the photo does not show a plant or crop"),
  crop: z.string().describe("crop or plant name, e.g. Tomato"),
  healthStatus: z.enum(["healthy", "disease", "pest", "nutrient_deficiency", "unclear"]),
  problemName: z.string().describe("common name of the problem, or 'Healthy'"),
  confidence: z.enum(["low", "medium", "high"]),
  summary: z.string().describe("2-3 line explanation a farmer can understand"),
  symptomsSeen: z.array(z.string()),
  causes: z.array(z.string()),
  organicTreatment: z.array(z.string()).describe("home or organic remedies with quantities"),
  chemicalTreatment: z.array(z.string()).describe("common product/active ingredient, dose, and safety note"),
  prevention: z.array(z.string()),
  weatherAdvice: z.string().describe("when to spray / irrigate given the forecast; empty if no weather"),
  seeExpert: z.boolean().describe("true if the farmer should contact a Krishi Vigyan Kendra / expert"),
});
const DiagnosisJsonSchema = z.toJSONSchema(DiagnosisSchema);

const DIAGNOSE_SYSTEM = `You are an agricultural plant-health expert helping small farmers in India.
You look at a photo of a plant, leaf, fruit or field and identify diseases, pests or nutrient problems.
Rules:
- Be honest about uncertainty. If the photo is blurry or unclear, set confidence "low" and say what photo to take instead.
- If the image is not a plant, set isPlant false and explain briefly in summary; leave lists empty.
- Prefer cheap, locally available remedies first (organic), then chemical options with dose per litre/acre and a safety note (gloves, mask, waiting period before harvest).
- Use the weather forecast, if given, to advise on timing: do not suggest spraying before rain or in strong wind.
- Recommend a Krishi Vigyan Kendra (KVK) or expert when the problem is serious or you are unsure.
- Keep sentences short and practical. No jargon.`;

export async function diagnosePlant({ imageBase64, mediaType, crop, notes, language, weather }) {
  const details = [
    crop && `Farmer says the crop is: ${crop}`,
    notes && `Farmer's notes: ${notes}`,
    weather ? `Weather at ${weather.place}: ${JSON.stringify(weather)}` : "No weather data available.",
    `Write every text field in ${LANG_NAME[language] || LANG_NAME.hi}.`,
  ].filter(Boolean).join("\n");

  const response = await generate({
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: mediaType, data: imageBase64 } },
          { text: `Please check this plant.\n${details}` },
        ],
      },
    ],
    config: {
      systemInstruction: DIAGNOSE_SYSTEM,
      responseMimeType: "application/json",
      responseJsonSchema: DiagnosisJsonSchema,
    },
  });

  // Parse and validate the JSON reply. If anything is off, show a friendly error.
  let parsed;
  try {
    parsed = DiagnosisSchema.safeParse(JSON.parse(response.text ?? ""));
  } catch {
    parsed = { success: false };
  }
  if (!parsed.success) {
    throw new AIError("The AI could not analyse this image. Please try again or use a clearer photo.");
  }
  return parsed.data;
}

// ---------------------------------------------------------------------------
// 2. Chat assistant (AI agent with tools)
// ---------------------------------------------------------------------------

const CHAT_SYSTEM = `You are a friendly farming assistant for small farmers in India.
You help with crop choice, sowing time, irrigation, fertiliser, pests and diseases, weather decisions and government schemes.
- Answer in short, simple sentences. Use bullet points for steps. Keep answers under 150 words unless asked for more.
- Do not use markdown symbols like ** or #. Plain text and "•" bullets only.
- Use the get_weather tool whenever the answer depends on weather (spraying, irrigation, sowing, harvesting).
- Use the get_my_crop_history tool when the farmer refers to their earlier photos or past problems.
- If you don't know something specific (exact local prices, scheme deadlines), say so and suggest the local KVK or agriculture office.
- Never invent numbers you are not sure about.`;

// Tool definitions: what the AI is told it can call.
const TOOL_DECLARATIONS = [
  {
    name: "get_weather",
    description: "Get current weather and the 3-day forecast (temperature, humidity, rain, wind) for an Indian city or district.",
    parametersJsonSchema: {
      type: "object",
      properties: { city: { type: "string", description: "City or district name, e.g. Bhopal" } },
      required: ["city"],
    },
  },
  {
    name: "get_my_crop_history",
    description: "Get this farmer's recent plant photo diagnoses (crop, problem, date). Takes no input.",
  },
];

// Tool implementations: the real code that runs when the AI calls a tool.
async function runTool(name, args, farmerId) {
  try {
    if (name === "get_weather") {
      return await getWeather(String(args?.city || ""));
    }
    if (name === "get_my_crop_history") {
      const items = await listDiagnoses(farmerId, 5);
      return items.map((d) => ({
        date: d.createdAt,
        crop: d.result.crop,
        problem: d.result.problemName,
        status: d.result.healthStatus,
        city: d.city,
      }));
    }
    return { error: `Unknown tool ${name}` };
  } catch (err) {
    return { error: err.message };
  }
}

const MAX_STEPS = 5; // safety limit on tool-call rounds

// messages: [{ role: "user" | "assistant", content: "text" }, ...] - last one is the farmer's new question
export async function chatWithAgent({ messages, language, city, farmerId }) {
  const context = [
    `Reply in ${LANG_NAME[language] || LANG_NAME.hi}.`,
    city && `The farmer's location is ${city}.`,
  ].filter(Boolean).join(" ");

  // Gemini calls the assistant role "model".
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  // The agent loop: ask the AI -> if it wants a tool, run it and send the result back -> repeat.
  for (let step = 0; step < MAX_STEPS; step++) {
    const response = await generate({
      contents,
      config: {
        systemInstruction: `${CHAT_SYSTEM}\n${context}`,
        tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
      },
    });

    const calls = response.functionCalls ?? [];
    console.log(`[ai] chat step ${step + 1}: ${calls.length ? "tools " + calls.map((c) => c.name).join(", ") : "final answer"}`);
    if (calls.length === 0) {
      return response.text?.trim() || "Sorry, I could not answer. Please try again.";
    }

    // Keep the AI's tool request in the conversation, then add every tool result in one message.
    contents.push(response.candidates[0].content);
    const results = await Promise.all(
      calls.map(async (call) => ({
        functionResponse: {
          id: call.id,
          name: call.name,
          response: { result: await runTool(call.name, call.args, farmerId) },
        },
      }))
    );
    contents.push({ role: "user", parts: results });
  }

  return "Sorry, that took too many steps. Please ask in a simpler way.";
}

// Health check for the AI: makes one tiny call and reports what happened.
// Never returns the API key - only whether it is set and Google's error message.
export async function checkAI() {
  const started = Date.now();
  const info = { models: MODELS, keySet: Boolean(process.env.GEMINI_API_KEY) };
  try {
    const response = await generate({ contents: "Reply with just: OK" });
    return { ...info, ok: true, usedModel: response.usedModel, reply: response.text?.trim(), ms: Date.now() - started };
  } catch (err) {
    return { ...info, ok: false, status: err.status, error: String(err.message).slice(0, 500), ms: Date.now() - started };
  }
}

// An error whose message is safe to show to the user.
export class AIError extends Error {}
