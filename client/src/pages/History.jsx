// Page 3: the farmer's past photo checks (saved in MongoDB).
import { useEffect, useState } from "react";
import { getHistory, deleteHistory } from "../api.js";
import DiagnosisCard from "../components/DiagnosisCard.jsx";

export default function History({ t, language }) {
  const [items, setItems] = useState(null);
  const [open, setOpen] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getHistory().then(setItems).catch((err) => setError(err.message || t.error));
  }, [t.error]);

  async function remove(id) {
    try {
      await deleteHistory(id);
      setItems((list) => list.filter((d) => d._id !== id));
    } catch (err) {
      setError(err.message || t.error);
    }
  }

  if (error) return <p className="error">{error}</p>;
  if (!items) return <p className="center"><span className="spinner dark" /></p>;
  if (!items.length) return <p className="card center">{t.historyEmpty}</p>;

  return (
    <div className="history">
      {items.map((d) => (
        <div key={d._id}>
          <div className={`card history-item status-${d.result.healthStatus}`} onClick={() => setOpen(open === d._id ? null : d._id)}>
            {d.thumbnail ? <img src={d.thumbnail} alt="" /> : <div className="thumb-placeholder">🌿</div>}
            <div className="grow">
              <strong>{d.result.problemName}</strong>
              <small>{d.result.crop} · {new Date(d.createdAt).toLocaleDateString(language === "hi" ? "hi-IN" : "en-IN")}</small>
              <span className="badge">{t.status[d.result.healthStatus]}</span>
            </div>
            <button className="ghost" onClick={(e) => { e.stopPropagation(); remove(d._id); }}>{t.delete}</button>
          </div>
          {open === d._id && <DiagnosisCard result={d.result} t={t} language={language} />}
        </div>
      ))}
    </div>
  );
}
