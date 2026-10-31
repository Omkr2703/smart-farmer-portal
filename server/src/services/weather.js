// Weather from Open-Meteo (free, no API key needed).
// Step 1: turn a city name into latitude/longitude (geocoding).
// Step 2: get current weather + 3-day forecast for that point.

const cache = new Map(); // city -> { data, time }  (avoid calling the API again and again)
const CACHE_MS = 30 * 60 * 1000; // 30 minutes

export async function getWeather(city) {
  const key = city.trim().toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.time < CACHE_MS) return hit.data;

  const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en`;
  const geo = await fetchJson(geoUrl);
  const place = geo.results?.[0];
  if (!place) throw new Error(`City not found: ${city}`);

  const params = new URLSearchParams({
    latitude: place.latitude,
    longitude: place.longitude,
    current: "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m",
    daily: "temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max",
    timezone: "auto",
    forecast_days: "3",
  });
  const w = await fetchJson(`https://api.open-meteo.com/v1/forecast?${params}`);

  const data = {
    place: [place.name, place.admin1, place.country].filter(Boolean).join(", "),
    current: {
      temperatureC: w.current.temperature_2m,
      humidityPct: w.current.relative_humidity_2m,
      rainMm: w.current.precipitation,
      windKmh: w.current.wind_speed_10m,
    },
    next3Days: w.daily.time.map((date, i) => ({
      date,
      maxC: w.daily.temperature_2m_max[i],
      minC: w.daily.temperature_2m_min[i],
      rainMm: w.daily.precipitation_sum[i],
      rainChancePct: w.daily.precipitation_probability_max[i],
    })),
  };
  cache.set(key, { data, time: Date.now() });
  return data;
}

async function fetchJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Weather API error ${res.status}`);
  return res.json();
}
