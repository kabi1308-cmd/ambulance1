import { useState } from "react";
import { Mic, Send, Sparkles } from "lucide-react";
import { parseDispatchText } from "../api";
import { formatApiError } from "../utils/errorFormatter";

export default function AIChatAssistant({ onParsedDispatch, onViewMap }) {
  const [input, setInput] = useState("45yo male experiencing acute chest pain near Guindy, Chennai");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const submit = async () => {
    if (!input.trim()) return;
    setBusy(true);
    try {
      const response = await parseDispatchText(input);
      setResult(response);
      onParsedDispatch(response.dispatch, {
        lat: response.extracted.lat,
        lng: response.extracted.lng,
      });
      onViewMap();
    } catch (error) {
      setResult({ error: formatApiError(error, "AI parser unavailable. Please retry.") });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ai-assistant card-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">AI DISPATCH ASSISTANT / NLP</p>
          <h2>Voice & Text Triage Intake</h2>
        </div>
        <div className="ai-badge"><Sparkles size={14} /> AI READY</div>
      </div>
      <div className="chat-box">
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          rows={5}
          placeholder="Describe emergency call details..."
        />
        <div className="chat-actions">
          <button className="ghost-button"><Mic size={14} /> Voice Capture</button>
          <button className="primary-button" onClick={submit} disabled={busy}>
            <Send size={14} /> {busy ? "Processing..." : "Send to AI Dispatch"}
          </button>
        </div>
      </div>
      {result && !result.error && (
        <div className="ai-result">
          <p><strong>Extracted intent:</strong> {result.extracted.raw_text}</p>
          <p><strong>Urgency:</strong> {result.triage.triage_label} / {result.extracted.urgency}</p>
          <p><strong>Specialty:</strong> {result.extracted.specialty}</p>
          <p><strong>Selected Hospital:</strong> {result.dispatch.allocated_hospital.name}</p>
        </div>
      )}
      {result?.error && <p className="error-message">{result.error}</p>}
    </div>
  );
}
