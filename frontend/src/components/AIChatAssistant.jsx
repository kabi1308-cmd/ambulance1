import { useState, useRef, useEffect } from "react";
import {
  Mic,
  MicOff,
  Send,
  Sparkles,
  Volume2,
  MapPin,
  Stethoscope,
  ShieldCheck,
  Building2,
  Navigation,
  AlertCircle,
  Radio,
} from "lucide-react";
import { parseDispatchText } from "../api";
import { formatApiError } from "../utils/errorFormatter";
import { playDispatchAlert, playTacticalClick } from "../utils/audioAlerts";

const samplePrompts = [
  "54yo male with acute crushing chest pain near Guindy, Chennai",
  "62yo female with sudden facial drooping and slurred speech near Gandhipuram, Coimbatore",
  "30yo worker with 40% thermal burns near KK Nagar, Madurai",
  "High-speed motorcycle collision with open femur fracture near Thillai Nagar, Trichy",
];

export default function AIChatAssistant({ onParsedDispatch, onViewMap }) {
  const [input, setInput] = useState("45yo male experiencing acute chest pain near Guindy, Chennai");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState("");
  const [history, setHistory] = useState([]);

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
    playTacticalClick();
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
        "Browser Web Speech API is not supported in this environment. Please enter emergency details via keyboard."
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
        setVoiceNotice("Listening... Speak emergency details clearly (location, vitals, symptoms).");
      };

      recognition.onresult = (event) => {
        if (event.results && event.results[0] && event.results[0][0]) {
          const transcript = event.results[0][0].transcript;
          setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
          setVoiceNotice(`Speech captured: "${transcript}"`);
        }
      };

      recognition.onerror = (event) => {
        setIsListening(false);
        if (event.error === "not-allowed" || event.error === "permission-denied") {
          setVoiceNotice("Microphone permission denied. Enable microphone access in browser settings.");
        } else if (event.error === "no-speech") {
          setVoiceNotice("No speech detected. Click Voice Capture again and speak into microphone.");
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

  const handleApplyPrompt = (promptText) => {
    playTacticalClick();
    setInput(promptText);
  };

  const submit = async () => {
    if (!input.trim() || busy) return;
    setBusy(true);
    setVoiceNotice("");

    const userText = input.trim();

    try {
      const response = await parseDispatchText(userText);
      playDispatchAlert();
      setResult(response);

      // Add to conversation history
      setHistory((prev) => [
        ...prev,
        {
          id: Date.now(),
          input: userText,
          response: response,
          timestamp: new Date().toLocaleTimeString("en-GB", { hour12: false }),
        },
      ]);

      onParsedDispatch(response.dispatch, {
        lat: response.extracted.lat,
        lng: response.extracted.lng,
      });
    } catch (error) {
      setResult({
        error: formatApiError(error, "AI dispatch parser unavailable. Verify backend is running."),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="view chat-view">
      <div className="section-heading">
        <div>
          <p className="eyebrow">AI DISPATCH ASSISTANT // NATURAL LANGUAGE INTAKE</p>
          <h1>Voice & Text Triage Intake Console</h1>
          <p className="muted">
            Transcribes radio dispatcher voice transcripts and text calls. Extracts geospatial location, clinical keywords, and triggers automated ICU bed reservation.
          </p>
        </div>
        <div className="ai-badge">
          <Sparkles size={14} /> NLP EXTRACTION ENGINE // READY
        </div>
      </div>

      <div className="chat-layout">
        {/* Left Column: Intake & Dispatch Controls */}
        <div className="chat-intake-card card-panel">
          <div className="panel-subhead">
            <span className="panel-title">DISPATCH TRANSCRIPT INPUT</span>
            <span className="mono-sub">VOICE / KEYBOARD INTENT PARSER</span>
          </div>

          {/* Quick Prompt Presets */}
          <div className="preset-label">EXAMPLE EMERGENCY CALL PROMPTS</div>
          <div className="prompt-chips">
            {samplePrompts.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                className="prompt-chip"
                onClick={() => handleApplyPrompt(prompt)}
              >
                "{prompt}"
              </button>
            ))}
          </div>

          {/* Textarea Input */}
          <div className="chat-input-wrap">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={4}
              placeholder="Enter or dictate emergency call transcription (e.g. location, vitals, symptoms, urgency)..."
              disabled={busy}
            />

            {/* Voice Recording Banner */}
            {voiceNotice && (
              <div
                className={`voice-notice-banner ${isListening ? "active-mic" : ""}`}
                role="status"
              >
                <Volume2 size={15} className={isListening ? "pulse-icon" : ""} />
                <span>{voiceNotice}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="chat-actions">
              <button
                type="button"
                className={`ghost-button voice-btn ${isListening ? "listening" : ""}`}
                onClick={toggleVoiceCapture}
                title={isListening ? "Stop Voice Recording" : "Start Voice Transcription"}
              >
                {isListening ? (
                  <>
                    <MicOff size={15} />
                    <span>STOP RECORDING</span>
                  </>
                ) : (
                  <>
                    <Mic size={15} />
                    <span>VOICE CAPTURE</span>
                  </>
                )}
              </button>

              <button
                type="button"
                className="primary-button dispatch-btn"
                onClick={submit}
                disabled={busy || !input.trim()}
              >
                <Send size={15} className={busy ? "spin" : ""} />
                <span>{busy ? "PARSING & ALLOCATING..." : "ANALYZE & ALLOCATE ICU"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Parsed AI Triage Result */}
        <div className="chat-result-card card-panel">
          <div className="panel-subhead">
            <span className="panel-title">AI CLINICAL EXTRACTION & ALLOCATION</span>
            <span className="mono-sub">STAGE P1 CONTRACT VERIFIED</span>
          </div>

          {result && !result.error ? (
            <div className="ai-result-display">
              <div className="result-header-row">
                <span className="result-badge success">
                  <ShieldCheck size={13} />
                  INTENT PARSED & ALLOCATED
                </span>
                <span className="mono-sub">NLP ENGINE: REGEX + TRIAGE RULES</span>
              </div>

              {/* Extracted Entities Grid */}
              <div className="entity-grid">
                <div className="entity-item">
                  <span className="entity-label">EXTRACTED LOCATION</span>
                  <strong className="entity-val">
                    <MapPin size={12} className="text-cyan" />
                    {result.extracted?.lat.toFixed(4)}°N, {result.extracted?.lng.toFixed(4)}°E
                  </strong>
                </div>

                <div className="entity-item">
                  <span className="entity-label">CLINICAL URGENCY</span>
                  <strong className="entity-val text-amber">
                    SEVERITY {result.extracted?.urgency} // {result.triage?.triage_label?.toUpperCase()}
                  </strong>
                </div>

                <div className="entity-item">
                  <span className="entity-label">REQUIRED SPECIALTY</span>
                  <strong className="entity-val text-cyan">
                    <Stethoscope size={12} className="text-cyan" />
                    {result.extracted?.specialty || "General ICU"}
                  </strong>
                </div>

                <div className="entity-item">
                  <span className="entity-label">ALLOCATED FACILITY</span>
                  <strong className="entity-val text-emerald">
                    <Building2 size={12} className="text-emerald" />
                    {result.dispatch?.allocated_hospital?.name || "Assigned Facility"}
                  </strong>
                </div>
              </div>

              {/* Selection Rationale */}
              <div className="result-reasoning-box">
                <span className="reasoning-title">ALLOCATION RATIONALE</span>
                <p>{result.dispatch?.allocation_reason}</p>
              </div>

              {/* View Map Action */}
              <button
                type="button"
                className="view-route-btn"
                onClick={onViewMap}
              >
                <Navigation size={14} />
                <span>TRACK MISSION ON COMMAND MAP →</span>
              </button>
            </div>
          ) : result?.error ? (
            <div className="ai-error-box" role="alert">
              <AlertCircle size={20} className="text-rose" />
              <div>
                <strong>DISPATCH INTAKE ERROR</strong>
                <p>{result.error}</p>
              </div>
            </div>
          ) : (
            <div className="ai-standby-placeholder">
              <Radio size={24} className="text-muted" />
              <strong>AWAITING DISPATCH CALL TRANSCRIPTION</strong>
              <p>
                Type or speak an emergency situation. The AI assistant will parse patient symptoms, infer required department capacity, and automatically book the fastest viable ICU bed.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
