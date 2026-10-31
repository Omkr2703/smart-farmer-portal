# 🌱 Smart Farmer Portal

**🔗 Live:** https://omkr2703.github.io/smart-farmer-portal/ (also at https://smart-farmer-portal.onrender.com)

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
| AI | Google Gemini API (vision + structured JSON output + function-calling agent) |
| Database | MongoDB (Mongoose); falls back to in-memory storage when not configured |
| Weather | Open-Meteo API (free, no key) |

## Architecture

```
React app ──► Express API ──► Gemini API (vision, structured output, agent + tools)
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

Requirements: Node.js 20+ and a free [Gemini API key](https://aistudio.google.com/apikey). MongoDB is optional.

```bash
cp server/.env.example server/.env   # then put your GEMINI_API_KEY in server/.env
npm run install-all
npm run dev:server    # terminal 1 -> http://localhost:5000
npm run dev:client    # terminal 2 -> http://localhost:5173
```

## Deploy (Render, free tier)

1. On [render.com](https://render.com): **New → Blueprint → connect this repo**. Render reads `render.yaml`.
2. Enter `GEMINI_API_KEY` and `MONGODB_URI` (free cluster from MongoDB Atlas) when asked.
3. Deploy. The same server serves the API and the React app.
4. To make the GitHub Pages site use this backend, add a repository variable `API_URL` (your Render URL) under **Settings → Secrets and variables → Actions → Variables**, then re-run the "Deploy to GitHub Pages" workflow.

> Without `API_URL`, the GitHub Pages build runs in demo mode: weather is live and AI answers are samples.

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
