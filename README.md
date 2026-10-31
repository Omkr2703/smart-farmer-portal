# 🌱 Smart Farmer Portal

An AI-powered farming assistant for small farmers in India. It works in **Hindi and English** and supports **voice**.

- 📷 **Crop disease detection:** a farmer uploads a photo of a leaf or plant. The AI identifies the disease, pest or nutrient deficiency, then suggests organic and chemical treatments and prevention steps.
- 🌦️ **Weather-aware advice:** live forecast data is added to every diagnosis, so advice like "don't spray tomorrow, rain is expected" is specific to the farmer's district.
- 💬 **AI agent chat:** farmers ask questions by typing or speaking. The agent uses **tool calling** to fetch live weather and the farmer's own past diagnoses before it answers.
- 🎤 **Voice in, voice out:** speech-to-text and text-to-speech in Hindi, for farmers who find typing hard.
- 📋 **History:** every diagnosis is saved in MongoDB.

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | React 19, Vite, Web Speech API, Canvas image compression |
| Backend | Node.js, Express 5, Multer, Zod validation |
| AI | Claude API (vision + structured JSON output + tool-calling agent) |
| Database | MongoDB (Mongoose); falls back to in-memory storage when not configured |
| Weather | Open-Meteo API (free, no key) |

## Architecture

```
React app ──► Express API ──► Claude API (vision, structured output, agent + tools)
                  │                         │
                  │                  tools: get_weather, get_my_crop_history
                  ├──► Open-Meteo (weather, cached 30 min)
                  └──► MongoDB (diagnoses)
```

**Engineering details**
- Photos are resized in the browser to at most 1280px before upload. This means faster uploads on slow rural networks and cheaper AI calls.
- AI responses are constrained to a JSON schema, so the UI never breaks on malformed output.
- The API key stays on the server only. Each IP is rate-limited to protect AI costs.
- Weather responses are cached for 30 minutes.
- Errors are handled centrally and returned as friendly messages.

## Run locally

Requirements: Node.js 20+ and an [Anthropic API key](https://platform.claude.com). MongoDB is optional.

```bash
cp server/.env.example server/.env   # then put your ANTHROPIC_API_KEY in server/.env
npm run install-all
npm run dev:server    # terminal 1 -> http://localhost:5000
npm run dev:client    # terminal 2 -> http://localhost:5173
```

## Deploy (Render, free tier)

1. Push this repo to GitHub.
2. On [render.com](https://render.com): **New → Web Service → connect the repo**.
3. Set **Build command** to `npm run build` and **Start command** to `npm start`.
4. Under **Environment**, add `ANTHROPIC_API_KEY` and `MONGODB_URI` (free cluster from MongoDB Atlas).
5. Deploy. The same server serves the API and the React app.

## API

| Method | Path | Description |
|---|---|---|
| POST | `/api/diagnose` | multipart: `photo`, `crop`, `notes`, `city`, `language` |
| POST | `/api/chat` | `{ messages: [{role, content}], language, city }` |
| GET | `/api/history` | farmer's past diagnoses |
| DELETE | `/api/history/:id` | delete one diagnosis |
| GET | `/api/weather?city=` | current weather and 3-day forecast |

All endpoints except weather require an `x-farmer-id` header. The frontend generates this id once per browser.

> ⚠️ AI advice can be wrong. For serious crop problems, farmers should also consult their local Krishi Vigyan Kendra (KVK).
