// Page 2: chat with the AI assistant, by typing or by voice.
import { useEffect, useRef, useState } from "react";
import { chat } from "../api.js";
import { listen, canListen, speak, stopSpeaking, canSpeak } from "../lib/speech.js";

export default function Chat({ t, language, city }) {
  const [messages, setMessages] = useState([]); // [{ role, content }]
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);
  useEffect(() => () => stopSpeaking(), []); // stop talking when leaving the page

  async function send(text, { speakReply = false } = {}) {
    const question = text.trim();
    if (!question || loading) return;
    const next = [...messages, { role: "user", content: question }];
    setMessages(next); setInput(""); setError(""); setLoading(true);
    try {
      const { reply } = await chat({ messages: next, language, city });
      setMessages([...next, { role: "assistant", content: reply }]);
      if (speakReply) speak(reply, language); // asked by voice -> answer by voice
    } catch (err) {
      setError(err.message || t.error);
      setMessages(messages); // undo the unanswered question
      setInput(question);
    } finally {
      setLoading(false);
    }
  }

  function onMic() {
    stopSpeaking();
    setListening(true); setError("");
    listen(language, {
      onText: (heard) => send(heard, { speakReply: true }),
      onEnd: () => setListening(false),
      onError: () => setListening(false),
    });
  }

  return (
    <div className="card chat">
      <div className="messages">
        <div className="msg assistant">{t.chatHello}</div>
        {messages.length === 0 && (
          <div className="examples">
            {t.examples.map((ex) => <button key={ex} onClick={() => send(ex)}>{ex}</button>)}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            {m.content}
            {m.role === "assistant" && canSpeak && (
              <button className="speak-btn" onClick={() => speak(m.content, language)} aria-label="listen">🔊</button>
            )}
          </div>
        ))}
        {loading && <div className="msg assistant"><span className="spinner dark" /> {t.thinking}</div>}
        <div ref={bottomRef} />
      </div>

      {listening && <p className="center listening">{t.listening}</p>}
      {error && <p className="error">{error}</p>}

      <form className="chat-input" onSubmit={(e) => { e.preventDefault(); send(input); }}>
        {canListen && (
          <button type="button" className={`mic ${listening ? "on" : ""}`} onClick={onMic} disabled={loading || listening} aria-label="speak">
            {t.speak}
          </button>
        )}
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={t.chatPlaceholder} maxLength={2000} />
        <button className="primary" disabled={loading || !input.trim()}>{t.send}</button>
      </form>
    </div>
  );
}
