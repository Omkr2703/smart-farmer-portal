// All AI (Claude) logic lives here.
//  1. diagnosePlant()  - looks at a plant photo and returns a structured report (JSON).
//  2. chatWithAgent()  - a chat assistant that can call tools (weather, farmer's history).
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat, betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { getWeather } from "./weather.js";
import { listDiagnoses } from "./store.js";

// The SDK reads ANTHROPIC_API_KEY from the environment automatically.
const client = new Anthropic();
const MODEL = process.env.AI_MODEL || "claude-opus-5-5";

// If the model declines a request, the API retries it on a fallback model by itself.
const FALLBACK = { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" };

const LANG_NAME = { hi: "simple Hindi (Devanagari script)", en: "simple English" };

// ---------------------------------------------------------------------------
// 1. Plant diagnosis from a photo
// ---------------------------------------------------------------------------

// The exact shape of the answer we want back. The API guarantees the reply
// matches this schema, so the frontend can rely on every field.
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

const DIAGNOSE_SYSTEM = `You are "Kisan Sahayak", an agricultural plant-health expert helping small farmers in India.
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
    weather
      ? `Weather at ${weather.place}: ${JSON.stringify(weather)}`
      : "No weather data available.",
    `Write every text field in ${LANG_NAME[language] || LANG_NAME.hi}.`,
  ].filter(Boolean).join("\n");

  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    ...FALLBACK,
    output_config: { effort: "medium", format: betaZodOutputFormat(DiagnosisSchema) },
    system: DIAGNOSE_SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
          { type: "text", text: `Please check this plant.\n${details}` },
        ],
      },
    ],
  });

  if (response.stop_reason === "refusal") {
    throw new AIError("The AI could not analyse this image. Please try another photo.");
  }
  if (!response.parsed_output) {
    throw new AIError("The AI reply was incomplete. Please try again.");
  }
  return response.parsed_output;
}

// ---------------------------------------------------------------------------
// 2. Chat assistant (AI agent with tools)
// ---------------------------------------------------------------------------

const CHAT_SYSTEM = `You are "Kisan Sahayak", a friendly farming assistant for small farmers in India.
You help with crop choice, sowing time, irrigation, fertiliser, pests and diseases, weather decisions and government schemes.
- Answer in short, simple sentences. Use bullet points for steps. Keep answers under 150 words unless asked for more.
- Use the get_weather tool whenever the answer depends on weather (spraying, irrigation, sowing, harvesting).
- Use the get_my_crop_history tool when the farmer refers to their earlier photos or past problems.
- If you don't know something specific (exact local prices, scheme deadlines), say so and suggest the local KVK or agriculture office.
- Never invent numbers you are not sure about.`;

function buildTools(farmerId) {
  const weatherTool = betaZodTool({
    name: "get_weather",
    description:
      "Get current weather and the 3-day forecast (temperature, humidity, rain, wind) for an Indian city or district.",
    inputSchema: z.object({ city: z.string().describe("City or district name, e.g. Bhopal") }),
    run: async ({ city }) => {
      try {
        return JSON.stringify(await getWeather(city));
      } catch (err) {
        return `Weather not available: ${err.message}`;
      }
    },
  });

  const historyTool = betaZodTool({
    name: "get_my_crop_history",
    description: "Get this farmer's recent plant photo diagnoses (crop, problem, date).",
    inputSchema: z.object({}),
    run: async () => {
      const items = await listDiagnoses(farmerId, 5);
      if (!items.length) return "No past diagnoses for this farmer.";
      return JSON.stringify(
        items.map((d) => ({
          date: d.createdAt,
          crop: d.result.crop,
          problem: d.result.problemName,
          status: d.result.healthStatus,
          city: d.city,
        }))
      );
    },
  });

  return [weatherTool, historyTool];
}

// messages: [{ role: "user" | "assistant", content: "text" }, ...] - last one is the farmer's new question
export async function chatWithAgent({ messages, language, city, farmerId }) {
  const context = [
    `Reply in ${LANG_NAME[language] || LANG_NAME.hi}.`,
    city && `The farmer's location is ${city}.`,
  ].filter(Boolean).join(" ");

  const finalMessage = await client.beta.messages.toolRunner({
    model: MODEL,
    max_tokens: 16000,
    max_iterations: 5,
    ...FALLBACK,
    output_config: { effort: "low" }, // chat should be fast
    system: `${CHAT_SYSTEM}\n${context}`,
    tools: buildTools(farmerId),
    messages,
  });

  if (finalMessage.stop_reason === "refusal") {
    throw new AIError("Sorry, I can't help with that question.");
  }
  const text = finalMessage.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
  return text || "Sorry, I could not answer. Please try again.";
}

// An error whose message is safe to show to the user.
export class AIError extends Error {}
