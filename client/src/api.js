// Functions that talk to our backend.
// On the GitHub Pages demo there is no backend, so we use demo.js instead.
import { DEMO_MODE, demoDiagnose, demoChat, demoHistory, demoDeleteHistory, demoWeather } from "./demo.js";

// A random id per browser, so each farmer sees only their own history.
function getFarmerId() {
  let id = null;
  try {
    id = localStorage.getItem("farmerId");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("farmerId", id);
    }
  } catch {
    id = id || crypto.randomUUID();
  }
  return id;
}
const farmerId = getFarmerId();

// Backend address. Empty = same server (local dev, or when the backend serves the app).
const API_URL = __API_URL__;

// Free servers "sleep" when unused. Ping once on page load so it is awake when the farmer needs it.
if (API_URL && !DEMO_MODE) fetch(`${API_URL}/api/health`).catch(() => {});

async function request(path, options = {}) {
  const res = await fetch(API_URL + path, {
    ...options,
    headers: { "x-farmer-id": farmerId, ...(options.headers || {}) },
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export function diagnose({ photo, thumbnail, crop, notes, city, language }) {
  if (DEMO_MODE) return demoDiagnose({ thumbnail, crop, notes, city, language });
  const form = new FormData();
  form.append("photo", photo, "plant.jpg");
  form.append("thumbnail", thumbnail);
  form.append("crop", crop);
  form.append("notes", notes);
  form.append("city", city);
  form.append("language", language);
  return request("/api/diagnose", { method: "POST", body: form });
}

export function chat({ messages, language, city }) {
  if (DEMO_MODE) return demoChat({ language });
  return request("/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ messages, language, city: city || undefined }),
  });
}

export const getHistory = () => (DEMO_MODE ? demoHistory() : request("/api/history"));
export const deleteHistory = (id) => (DEMO_MODE ? demoDeleteHistory(id) : request(`/api/history/${id}`, { method: "DELETE" }));
export const getWeather = (city) => (DEMO_MODE ? demoWeather(city) : request(`/api/weather?city=${encodeURIComponent(city)}`));
