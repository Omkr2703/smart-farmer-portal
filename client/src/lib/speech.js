// Voice features using the browser's built-in Web Speech API (free, no key).
// Works best in Chrome on Android / desktop.

const Recognition = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
export const canListen = Boolean(Recognition);
export const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;

const LOCALE = { hi: "hi-IN", en: "en-IN" };

// Start listening. Calls onText(finalText) when the farmer stops speaking.
export function listen(language, { onText, onEnd, onError }) {
  const rec = new Recognition();
  rec.lang = LOCALE[language];
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  rec.onresult = (e) => onText(e.results[0][0].transcript);
  rec.onerror = (e) => onError?.(e.error);
  rec.onend = () => onEnd?.();
  rec.start();
  return () => rec.stop(); // call this to stop early
}

// Read text aloud.
export function speak(text, language, onEnd) {
  if (!canSpeak) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/[*#_`]/g, ""));
  u.lang = LOCALE[language];
  const voice = window.speechSynthesis.getVoices().find((v) => v.lang === u.lang);
  if (voice) u.voice = voice;
  u.onend = () => onEnd?.();
  window.speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if (canSpeak) window.speechSynthesis.cancel();
}
