import { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Send, Sparkles, Volume2 } from "lucide-react";
import { parseDispatchText } from "../api";
import { formatApiError } from "../utils/errorFormatter";

export default function AIChatAssistant({ onParsedDispatch, onViewMap }) {
  const [input, setInput] = useState("45yo male experiencing acute chest pain near Guindy, Chennai");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState("");

  const recognitionRef = useRef(null);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore cleanup error
        }
      }
    };
  }, []);

  const toggleVoiceCapture = () => {
    setVoiceNotice("");

    // If currently listening, stop it
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      typeof window !== "undefined" &&
      (window.SpeechRecognition || window.webkitSpeechRecognition);

    if (!SpeechRecognition) {
      setVoiceNotice(
        "Browser Web Speech API is not supported in this browser. Please use keyboard text input."
      );
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceNotice("Listening... Speak emergency details now (location, vitals, symptoms).");
      };

      recognition.onresult = (event) => {
        if (event.results && event.results[0] && event.results[0][0]) {
          const transcript = event.results[0][0].transcript;
          setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
          setVoiceNotice(`Captured: "${transcript}"`);
        }
      };

      recognition.onerror = (event) => {
        setIsListening(false);
        if (event.error === "not-allowed" || event.error === "permission-denied") {
          setVoiceNotice("Microphone permission denied. Please allow microphone access in your browser settings.");
        } else if (event.error === "no-speech") {
          setVoiceNotice("No speech detected. Press Voice Capture and speak clearly.");
        } else {
          setVoiceNotice(`Speech recognition notice: ${event.error}. You can also type directly.`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
      setVoiceNotice("Could not initialize microphone. Please type call details manually.");
    }
  };

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
          placeholder="Describe emergency call details (e.g. location, symptoms, urgency)..."
        />

        {voiceNotice && (
          <div style={{
            fontSize: "11px",
            color: isListening ? "#38bdf8" : "#94a3b8",
            padding: "8px 12px",
            background: "rgba(15, 34, 48, 0.7)",
            border: "1px solid #1f3550",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}>
            <Volume2 size={14} style={{ flexShrink: 0 }} />
            <span>{voiceNotice}</span>
          </div>
        )}

        <div className="chat-actions">
          <button
            type="button"
            className="ghost-button"
            onClick={toggleVoiceCapture}
            style={{
              borderColor: isListening ? "#ef4444" : undefined,
              color: isListening ? "#fca5a5" : undefined,
              background: isListening ? "rgba(239, 68, 68, 0.15)" : undefined,
            }}
          >
            {isListening ? <MicOff size={14} /> : <Mic size={14} />}
            {isListening ? "Listening... (Click to Stop)" : "Voice Capture"}
          </button>
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
