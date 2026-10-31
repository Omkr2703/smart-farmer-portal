// Shows current weather for the farmer's city. Waits 800 ms after typing stops.
import { useEffect, useState } from "react";
import { getWeather } from "../api.js";

export default function WeatherCard({ city, t }) {
  const [weather, setWeather] = useState(null);

  useEffect(() => {
    setWeather(null);
    if (city.trim().length < 3) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      getWeather(city.trim())
        .then((w) => !cancelled && setWeather(w))
        .catch(() => !cancelled && setWeather(null));
    }, 800);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [city]);

  if (!weather) return null;
  const c = weather.current;
  const tomorrow = weather.next3Days[1];
  return (
    <div className="weather">
      <strong>{t.weatherNow}: {weather.place}</strong>
      <div className="weather-row">
        <span>🌡️ {c.temperatureC}°C</span>
        <span>💧 {t.humidity} {c.humidityPct}%</span>
        <span>💨 {t.wind} {c.windKmh} km/h</span>
        {tomorrow && <span>🌧️ {t.rain} ({tomorrow.date}): {tomorrow.rainChancePct ?? 0}%</span>}
      </div>
    </div>
  );
}
