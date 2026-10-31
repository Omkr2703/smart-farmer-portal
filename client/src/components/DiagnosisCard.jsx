// Shows the AI's diagnosis report in a farmer-friendly way.
import { useState } from "react";
import { speak, stopSpeaking, canSpeak } from "../lib/speech.js";

function List({ title, items }) {
  if (!items?.length) return null;
  return (
    <div className="section">
      <h4>{title}</h4>
      <ul>{items.map((x, i) => <li key={i}>{x}</li>)}</ul>
    </div>
  );
}

export default function DiagnosisCard({ result, t, language }) {
  const [speaking, setSpeaking] = useState(false);

  function toggleSpeak() {
    if (speaking) { stopSpeaking(); setSpeaking(false); return; }
    const text = [
      result.problemName, result.summary,
      t.organic, ...result.organicTreatment,
      t.weatherAdvice, result.weatherAdvice,
    ].filter(Boolean).join(". ");
    setSpeaking(true);
    speak(text, language, () => setSpeaking(false));
  }

  return (
    <div className={`card result status-${result.healthStatus}`}>
      <div className="result-head">
        <div>
          <span className="badge">{t.status[result.healthStatus]}</span>
          <h3>{result.problemName}</h3>
          <small>{result.crop} · {t.confidence}: {t[result.confidence]}</small>
        </div>
        {canSpeak && <button className="ghost" onClick={toggleSpeak}>{speaking ? t.stop : t.listen}</button>}
      </div>
      <p>{result.summary}</p>
      {result.weatherAdvice && (
        <div className="section highlight">
          <h4>{t.weatherAdvice}</h4>
          <p>{result.weatherAdvice}</p>
        </div>
      )}
      <List title={t.symptoms} items={result.symptomsSeen} />
      <List title={t.causes} items={result.causes} />
      <List title={t.organic} items={result.organicTreatment} />
      <List title={t.chemical} items={result.chemicalTreatment} />
      <List title={t.prevention} items={result.prevention} />
      {result.seeExpert && <p className="warn">{t.seeExpert}</p>}
    </div>
  );
}
