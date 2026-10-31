// DEMO MODE (used only on the GitHub Pages link).
// GitHub Pages can only host static files - there is no backend there, so the
// AI key cannot be used safely. In demo mode:
//   - weather is REAL (Open-Meteo allows calls straight from the browser)
//   - history is saved in this browser (localStorage)
//   - AI answers are SAMPLE answers, clearly labelled as demo
export const DEMO_MODE = __DEMO_MODE__;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const SAMPLE_RESULT = {
  hi: {
    isPlant: true, crop: "टमाटर", healthStatus: "disease", problemName: "अगेती झुलसा (Early Blight)", confidence: "medium",
    summary: "पत्तों पर भूरे गोल धब्बे और उनके चारों ओर पीलापन दिख रहा है। यह फफूंद (fungus) से होने वाली बीमारी है जो नमी में तेज़ी से फैलती है।",
    symptomsSeen: ["निचले पत्तों पर भूरे-काले गोल धब्बे", "धब्बों में छल्ले जैसे निशान", "धब्बों के आसपास पत्ता पीला"],
    causes: ["Alternaria solani फफूंद", "ज़्यादा नमी और पत्तों पर पानी रुकना", "पिछली फसल के संक्रमित अवशेष"],
    organicTreatment: ["संक्रमित पत्ते तोड़कर खेत से दूर नष्ट करें", "नीम तेल 5 ml + थोड़ा साबुन, 1 लीटर पानी में मिलाकर हर 7 दिन छिड़कें", "ट्राइकोडर्मा मिट्टी में मिलाएँ"],
    chemicalTreatment: ["मैन्कोज़ेब 75% WP — 2.5 ग्राम प्रति लीटर पानी", "दस्ताने और मास्क पहनें; तुड़ाई से 7 दिन पहले छिड़काव बंद करें"],
    prevention: ["पौधों के बीच दूरी रखें ताकि हवा चले", "ऊपर से पानी न दें, जड़ में सिंचाई करें", "हर साल फसल बदलें (फसल चक्र)"],
    weatherAdvice: "", seeExpert: false,
  },
  en: {
    isPlant: true, crop: "Tomato", healthStatus: "disease", problemName: "Early Blight", confidence: "medium",
    summary: "Brown round spots with yellow edges are visible on the leaves. This is a fungal disease that spreads fast in humid weather.",
    symptomsSeen: ["Brown-black round spots on lower leaves", "Ring-like (target) pattern in spots", "Yellowing around the spots"],
    causes: ["Alternaria solani fungus", "High humidity and water staying on leaves", "Infected remains of the previous crop"],
    organicTreatment: ["Remove infected leaves and destroy them away from the field", "Spray neem oil 5 ml + a little soap per litre of water every 7 days", "Mix Trichoderma into the soil"],
    chemicalTreatment: ["Mancozeb 75% WP — 2.5 g per litre of water", "Wear gloves and a mask; stop spraying 7 days before harvest"],
    prevention: ["Keep spacing between plants for air flow", "Water at the roots, not from above", "Rotate crops every year"],
    weatherAdvice: "", seeExpert: false,
  },
};

const SAMPLE_CHAT = {
  hi: "यह डेमो वर्ज़न है, इसलिए यहाँ AI से असली जवाब नहीं आता।\n\nपूरे वर्ज़न में AI:\n• आपके शहर का मौसम खुद देखकर सलाह देता है\n• आपकी पिछली फसल जाँच याद रखता है\n• हिंदी में बोलकर जवाब देता है\n\nकोड: github.com/Omkr2703/smart-farmer-portal",
  en: "This is the demo version, so real AI answers are not available here.\n\nIn the full version, the AI:\n• checks your city's weather by itself before advising\n• remembers your past crop checks\n• answers by voice in Hindi\n\nCode: github.com/Omkr2703/smart-farmer-portal",
};

function readHistory() {
  try { return JSON.parse(localStorage.getItem("demoHistory") || "[]"); } catch { return []; }
}
function writeHistory(items) {
  try { localStorage.setItem("demoHistory", JSON.stringify(items.slice(0, 20))); } catch { /* ignore */ }
}

export async function demoDiagnose({ thumbnail, crop, notes, city, language }) {
  await wait(1500); // feel like the AI is working
  const result = { ...SAMPLE_RESULT[language], isDemo: true };
  if (city) {
    try {
      const w = await demoWeather(city);
      const rainy = w.next3Days.slice(0, 2).some((d) => (d.rainChancePct ?? 0) >= 50);
      result.weatherAdvice = language === "hi"
        ? (rainy ? `${w.place} में अगले 2 दिन बारिश की संभावना है — अभी छिड़काव न करें।` : `${w.place} में अगले 2 दिन बारिश की संभावना कम है — सुबह या शाम छिड़काव कर सकते हैं।`)
        : (rainy ? `Rain is likely in ${w.place} in the next 2 days — don't spray now.` : `Low chance of rain in ${w.place} for 2 days — spray in the morning or evening.`);
    } catch { /* weather optional */ }
  }
  const saved = { _id: crypto.randomUUID(), createdAt: new Date().toISOString(), crop, notes, city, language, thumbnail, result };
  writeHistory([saved, ...readHistory()]);
  return saved;
}

export async function demoChat({ language }) {
  await wait(900);
  return { reply: SAMPLE_CHAT[language] };
}

export async function demoHistory() {
  return readHistory();
}

export async function demoDeleteHistory(id) {
  writeHistory(readHistory().filter((d) => d._id !== id));
  return null;
}

// Same logic as server/src/services/weather.js, called straight from the browser.
export async function demoWeather(city) {
  const geo = await (await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en`)).json();
  const place = geo.results?.[0];
  if (!place) throw new Error(`City not found: ${city}`);
  const params = new URLSearchParams({
    latitude: place.latitude, longitude: place.longitude,
    current: "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m",
    daily: "temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max",
    timezone: "auto", forecast_days: "3",
  });
  const w = await (await fetch(`https://api.open-meteo.com/v1/forecast?${params}`)).json();
  return {
    place: [place.name, place.admin1].filter(Boolean).join(", "),
    current: { temperatureC: w.current.temperature_2m, humidityPct: w.current.relative_humidity_2m, rainMm: w.current.precipitation, windKmh: w.current.wind_speed_10m },
    next3Days: w.daily.time.map((date, i) => ({ date, maxC: w.daily.temperature_2m_max[i], minC: w.daily.temperature_2m_min[i], rainMm: w.daily.precipitation_sum[i], rainChancePct: w.daily.precipitation_probability_max[i] })),
  };
}
