// Main app: header, language switch, city, weather card, and 3 tabs.
import { useEffect, useState } from "react";
import { strings } from "./i18n.js";
import Diagnose from "./pages/Diagnose.jsx";
import Chat from "./pages/Chat.jsx";
import History from "./pages/History.jsx";
import WeatherCard from "./components/WeatherCard.jsx";
import { DEMO_MODE } from "./demo.js";

// Read/write a value in localStorage safely (it can be blocked in some browsers).
function useSaved(key, initial) {
  const [value, setValue] = useState(() => {
    try { return localStorage.getItem(key) ?? initial; } catch { return initial; }
  });
  useEffect(() => {
    try { localStorage.setItem(key, value); } catch { /* ignore */ }
  }, [key, value]);
  return [value, setValue];
}

export default function App() {
  const [language, setLanguage] = useSaved("language", "hi");
  const [city, setCity] = useSaved("city", "");
  const [tab, setTab] = useState("diagnose");
  const t = strings[language];

  useEffect(() => { document.documentElement.lang = language; }, [language]);

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>🌱 {t.appName}</h1>
          <p className="tagline">{t.tagline}</p>
        </div>
        <button className="lang-btn" onClick={() => setLanguage(language === "hi" ? "en" : "hi")}>
          {language === "hi" ? "English" : "हिंदी"}
        </button>
      </header>

      {DEMO_MODE && (
        <p className="demo-banner">
          {t.demoBanner}{" "}
          <a href="https://github.com/Omkr2703/smart-farmer-portal" target="_blank" rel="noreferrer">GitHub ↗</a>
        </p>
      )}

      <section className="card city-row">
        <label>
          📍 {t.city}
          <input value={city} onChange={(e) => setCity(e.target.value)} placeholder={t.cityPlaceholder} />
        </label>
        <WeatherCard city={city} t={t} />
      </section>

      <nav className="tabs">
        {["diagnose", "chat", "history"].map((name) => (
          <button key={name} className={tab === name ? "active" : ""} onClick={() => setTab(name)}>
            {t["tab" + name[0].toUpperCase() + name.slice(1)]}
          </button>
        ))}
      </nav>

      <main>
        {tab === "diagnose" && <Diagnose t={t} language={language} city={city} />}
        {tab === "chat" && <Chat t={t} language={language} city={city} />}
        {tab === "history" && <History t={t} language={language} />}
      </main>

      <footer className="footer">{t.disclaimer}</footer>
    </div>
  );
}
