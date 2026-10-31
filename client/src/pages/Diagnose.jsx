// Page 1: farmer takes/chooses a photo, AI diagnoses it.
import { useState } from "react";
import { diagnose } from "../api.js";
import { prepareImage } from "../lib/image.js";
import DiagnosisCard from "../components/DiagnosisCard.jsx";

export default function Diagnose({ t, language, city }) {
  const [image, setImage] = useState(null); // { photo, thumbnail, preview }
  const [crop, setCrop] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  async function onPick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(""); setResult(null);
    try {
      setImage(await prepareImage(file));
    } catch (err) {
      setError(err.message);
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!image) return setError(t.needPhoto);
    setLoading(true); setError(""); setResult(null);
    try {
      const saved = await diagnose({ ...image, crop, notes, city, language });
      setResult(saved.result);
    } catch (err) {
      setError(err.message || t.error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <form className="card" onSubmit={onSubmit}>
        <label className="photo-picker">
          {image ? <img src={image.preview} alt="" /> : <span>{t.choosePhoto}</span>}
          {/* capture="environment" opens the back camera on phones */}
          <input type="file" accept="image/*" capture="environment" onChange={onPick} hidden />
        </label>
        {image && <small className="center">{t.changePhoto} ↑</small>}

        <label>
          {t.crop}
          <input value={crop} onChange={(e) => setCrop(e.target.value)} placeholder={t.cropPlaceholder} maxLength={60} />
        </label>
        <label>
          {t.notes}
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t.notesPlaceholder} rows={2} maxLength={500} />
        </label>

        <button className="primary" disabled={loading}>
          {loading ? <><span className="spinner" /> {t.checking}</> : t.check}
        </button>
        {error && <p className="error">{error}</p>}
      </form>

      {result && <DiagnosisCard result={result} t={t} language={language} />}
    </>
  );
}
