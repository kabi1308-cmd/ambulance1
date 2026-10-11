import { useState } from "react";
import {
  AlertTriangle,
  Crosshair,
  MapPin,
  Navigation,
  X,
  LocateFixed,
  Activity,
  HeartPulse,
  Thermometer,
  ShieldAlert,
  CheckCircle2,
} from "lucide-react";
import { triggerSOS } from "../api";
import { formatApiError } from "../utils/errorFormatter";

const presets = [
  ["Chennai Central", 13.0827, 80.2707],
  ["Coimbatore Junction", 11.0168, 76.9558],
  ["Madurai Central", 9.9252, 78.1198],
  ["Trichy Central", 10.7905, 78.7047],
];

const symptomPresets = [
  { label: "Acute Chest Pain / STEMI", text: "acute chest pain and diaphoresis, suspected STEMI", severity: 4 },
  { label: "Suspected Stroke / Neuro Deficit", text: "facial drooping, slurred speech, acute stroke symptoms", severity: 5 },
  { label: "Severe Thermal Burn", text: "severe flame burn injury, skin compromised", severity: 4 },
  { label: "Vehicular Trauma / Fracture", text: "high-speed vehicle crash, multiple fractures and bleeding", severity: 4 },
  { label: "Cardiac Arrest / Shock", text: "cardiac arrest, unresponsive, non-palpable pulse, shock", severity: 5 },
  { label: "Respiratory Distress", text: "severe difficulty breathing, respiratory failure", severity: 4 },
];

export default function AmbulanceSOS({
  ambulanceCoords,
  onCoordsChange,
  onAllocation,
  onViewMap,
}) {
  const [lat, setLat] = useState(String(ambulanceCoords.lat));
  const [lng, setLng] = useState(String(ambulanceCoords.lng));
  
  // Clinical state
  const [symptoms, setSymptoms] = useState("");
  const [severity, setSeverity] = useState(3);
  const [pulse, setPulse] = useState("");
  const [systolic, setSystolic] = useState("");
  const [spo2, setSpo2] = useState("");
  const [temperature, setTemperature] = useState("");

  const [sending, setSending] = useState(false);
  const [geoLocating, setGeoLocating] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const applyPreset = (preset) => {
    setLat(String(preset[1]));
    setLng(String(preset[2]));
    onCoordsChange({ lat: preset[1], lng: preset[2] });
  };

  const applySymptomPreset = (item) => {
    setSymptoms(item.text);
    setSeverity(item.severity);
  };

  const handleUseCurrentLocation = () => {
    setError("");
    if (!navigator.geolocation) {
      setError("Browser geolocation is not supported.");
      return;
    }
    setGeoLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latitude = pos.coords.latitude.toFixed(4);
        const longitude = pos.coords.longitude.toFixed(4);
        setLat(latitude);
        setLng(longitude);
        onCoordsChange({ lat: Number(latitude), lng: Number(longitude) });
        setGeoLocating(false);
      },
      (err) => {
        setGeoLocating(false);
        setError("Location access denied or unavailable. Manual input active.");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const validateInputs = () => {
    const latNum = Number(lat);
    const lngNum = Number(lng);

    if (isNaN(latNum) || latNum < -90 || latNum > 90) {
      return "Latitude must be a valid number between -90.0 and 90.0.";
    }
    if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
      return "Longitude must be a valid number between -180.0 and 180.0.";
    }

    if (pulse.trim()) {
      const p = Number(pulse);
      if (isNaN(p) || p < 30 || p > 250) {
        return "Pulse must be between 30 and 250 bpm.";
      }
    }
    if (systolic.trim()) {
      const s = Number(systolic);
      if (isNaN(s) || s < 40 || s > 260) {
        return "Systolic Blood Pressure must be between 40 and 260 mmHg.";
      }
    }
    if (spo2.trim()) {
      const o = Number(spo2);
      if (isNaN(o) || o < 50 || o > 100) {
        return "Oxygen Saturation (SpO2) must be between 50% and 100%.";
      }
    }
    if (temperature.trim()) {
      const t = Number(temperature);
      if (isNaN(t) || t < 30.0 || t > 45.0) {
        return "Body Temperature must be between 30.0°C and 45.0°C.";
      }
    }

    return null;
  };

  const submit = async () => {
    setError("");
    const validationError = validateInputs();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSending(true);
    try {
      const vitalsObj = {};
      if (pulse.trim()) vitalsObj.pulse = Number(pulse);
      if (systolic.trim()) vitalsObj.systolic = Number(systolic);
      if (spo2.trim()) vitalsObj.spo2 = Number(spo2);
      if (temperature.trim()) vitalsObj.temperature = Number(temperature);

      const response = await triggerSOS(
        lat,
        lng,
        symptoms,
        severity,
        vitalsObj
      );

      const coords = { lat: Number(lat), lng: Number(lng) };
      onCoordsChange(coords);
      onAllocation(response, coords);
      setResult(response);
    } catch (exception) {
      setError(
        formatApiError(
          exception,
          "Dispatch link unavailable. Check the command server."
        )
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="view sos-view">
      <div className="section-heading">
        <div>
          <p className="eyebrow">FIELD CONSOLE / 02</p>
          <h1>Emergency Dispatch</h1>
          <p className="muted">
            Transmit live patient location and clinical telemetry to the allocation engine.
          </p>
        </div>
        <div className="console-status">
          <span className="signal-dot" /> UNIT AMB-07 / SECURE
        </div>
      </div>

      <div className="sos-layout">
        <div className="console-panel">
          {/* Section 1: Location */}
          <div className="panel-label">
            <Crosshair size={16} /> AMBULANCE GEOLOCATION
          </div>
          <div className="input-grid">
            <label>
              LATITUDE (-90 to 90)
              <input
                type="number"
                step="0.0001"
                value={lat}
                onChange={(event) => setLat(event.target.value)}
              />
            </label>
            <label>
              LONGITUDE (-180 to 180)
              <input
                type="number"
                step="0.0001"
                value={lng}
                onChange={(event) => setLng(event.target.value)}
              />
            </label>
          </div>
          <button
            type="button"
            className="location-detect-button"
            onClick={handleUseCurrentLocation}
            disabled={geoLocating}
          >
            <LocateFixed size={15} />
            {geoLocating ? "ACQUIRING GPS LOCATION..." : "USE CURRENT GPS LOCATION"}
          </button>
          
          <div className="preset-label">QUICK LOCATION PRESETS</div>
          <div className="presets">
            {presets.map((preset) => (
              <button key={preset[0]} onClick={() => applyPreset(preset)}>
                <MapPin size={14} />
                {preset[0]}
              </button>
            ))}
          </div>

          {/* Section 2: Clinical Intake & Symptoms */}
          <div className="panel-label" style={{ marginTop: "24px" }}>
            <Activity size={16} /> CLINICAL SYMPTOMS & PRESENTATION
          </div>
          
          <div className="preset-label">COMMON CLINICAL SCENARIOS</div>
          <div className="presets" style={{ marginBottom: "12px" }}>
            {symptomPresets.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => applySymptomPreset(item)}
                style={{
                  fontSize: "9px",
                  borderColor: symptoms === item.text ? "#22d3ee" : undefined,
                  background: symptoms === item.text ? "rgba(34, 211, 238, 0.15)" : undefined,
                }}
              >
                {item.label}
              </button>
            ))}
          </div>

          <label style={{ marginBottom: "12px" }}>
            PATIENT SYMPTOMS & CHIEF COMPLAINT
            <textarea
              rows={2}
              style={{
                width: "100%",
                background: "#071b2a",
                border: "1px solid #2a4856",
                color: "#e3f6ff",
                padding: "10px",
                fontSize: "11px",
                fontFamily: "inherit",
                resize: "vertical",
              }}
              value={symptoms}
              placeholder="e.g. 52yo male with sudden acute chest pain radiating to left arm..."
              onChange={(e) => setSymptoms(e.target.value)}
            />
          </label>

          <label style={{ marginBottom: "16px" }}>
            FIELD SEVERITY LEVEL: <b>{severity} / 5 ({severity >= 5 ? "CRITICAL / CODE RED" : severity >= 4 ? "HIGH URGENCY" : severity === 3 ? "MODERATE" : "LOW / STABLE"})</b>
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={severity}
              onChange={(e) => setSeverity(Number(e.target.value))}
              style={{ accentColor: "#22d3ee", cursor: "pointer" }}
            />
          </label>

          {/* Section 3: Optional Vital Signs */}
          <div className="panel-label">
            <HeartPulse size={16} /> PATIENT VITALS (OPTIONAL)
          </div>
          <div className="input-grid" style={{ marginBottom: "16px" }}>
            <label>
              PULSE RATE (BPM)
              <input
                type="number"
                placeholder="e.g. 110"
                value={pulse}
                onChange={(e) => setPulse(e.target.value)}
              />
            </label>
            <label>
              SYSTOLIC BP (mmHg)
              <input
                type="number"
                placeholder="e.g. 85"
                value={systolic}
                onChange={(e) => setSystolic(e.target.value)}
              />
            </label>
            <label>
              SpO2 OXYGEN (%)
              <input
                type="number"
                placeholder="e.g. 88"
                value={spo2}
                onChange={(e) => setSpo2(e.target.value)}
              />
            </label>
            <label>
              TEMP (°C)
              <input
                type="number"
                step="0.1"
                placeholder="e.g. 38.5"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
              />
            </label>
          </div>

          {/* Medical Prototype Notice */}
          <div style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "8px",
            padding: "10px 12px",
            background: "rgba(14, 165, 233, 0.08)",
            border: "1px solid rgba(14, 165, 233, 0.25)",
            fontSize: "10px",
            color: "#7dd3fc",
            marginBottom: "18px",
            lineHeight: "1.5",
          }}>
            <ShieldAlert size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
            <span>
              <strong>PROTOTYPE CLINICAL ASSIST:</strong> Algorithmic triage matches nearest available specialized ICU capacity.
              Does not replace emergency physician diagnoses or institutional protocols.
            </span>
          </div>

          <button className="sos-button" onClick={submit} disabled={sending}>
            <AlertTriangle size={23} />
            {sending
              ? "CALCULATING OPTIMAL RECEIVING UNIT..."
              : "DISPATCH EMERGENCY SOS"}
          </button>
          {error && <p className="error-message">{error}</p>}
        </div>

        {/* Briefing Panel */}
        <div className="briefing-panel">
          <span className="briefing-kicker">DISPATCH PROTOCOL</span>
          <h2>Fastest viable care, calculated in real time.</h2>
          <p>
            Every signal is evaluated against clinical vitals, symptom urgency, road distance,
            and specialized ICU bed availability across regional medical centers.
          </p>

          <div style={{ marginTop: "18px", padding: "12px", background: "rgba(10, 24, 38, 0.7)", border: "1px solid #1a384d" }}>
            <span style={{ fontSize: "9px", color: "#64748b", letterSpacing: "0.5px" }}>CLINICAL SUMMARY</span>
            <div style={{ marginTop: "6px", fontSize: "11px", color: "#e2e8f0" }}>
              <strong>Triage Severity:</strong> Level {severity} / 5
            </div>
            <div style={{ fontSize: "11px", color: "#94a3b8" }}>
              <strong>Symptoms:</strong> {symptoms ? symptoms.slice(0, 60) + (symptoms.length > 60 ? "..." : "") : "Unspecified"}
            </div>
            {(pulse || systolic || spo2 || temperature) && (
              <div style={{ marginTop: "6px", fontSize: "10px", color: "#38bdf8" }}>
                Vitals: {pulse ? `Pulse ${pulse} bpm | ` : ""}{systolic ? `BP ${systolic} | ` : ""}{spo2 ? `SpO2 ${spo2}% | ` : ""}{temperature ? `${temperature}°C` : ""}
              </div>
            )}
          </div>

          <div className="protocol-row" style={{ marginTop: "18px" }}>
            <Navigation size={17} />
            <span>30 KM/H BASELINE RESPONSE SPEED</span>
          </div>
          <div className="protocol-row">
            <Crosshair size={17} />
            <span>MULTI-FACTOR SPECIALTY SCORING</span>
          </div>
        </div>
      </div>

      {/* Allocation Modal */}
      {result && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="allocation-modal">
            <button
              className="close-modal"
              onClick={() => setResult(null)}
              aria-label="Close allocation details"
            >
              <X size={18} />
            </button>
            <div className="success-mark">
              <Navigation size={25} />
            </div>
            <p className="eyebrow">ALLOCATION CONFIRMED</p>
            <h2>{result.allocated_hospital.name}</h2>
            <p className="coordinates">
              <MapPin size={14} /> {result.allocated_hospital.lat.toFixed(5)} /{" "}
              {result.allocated_hospital.lng.toFixed(5)}
            </p>

            <div style={{
              display: "flex",
              justifyContent: "center",
              gap: "8px",
              margin: "12px 0 16px",
              flexWrap: "wrap",
            }}>
              <span style={{
                padding: "4px 8px",
                fontSize: "10px",
                fontWeight: "700",
                background: "rgba(34, 211, 238, 0.15)",
                border: "1px solid #0891b2",
                color: "#67e8f9",
              }}>
                SEVERITY {result.triage?.severity} / {result.triage?.triage_label?.toUpperCase()}
              </span>
              <span style={{
                padding: "4px 8px",
                fontSize: "10px",
                fontWeight: "700",
                background: result.specialty_match ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
                border: `1px solid ${result.specialty_match ? "#059669" : "#d97706"}`,
                color: result.specialty_match ? "#6ee7b7" : "#fcd34d",
              }}>
                {result.specialty_match ? `✓ ${result.triage?.specialty_required} UNIT RESERVED` : `GENERAL ICU (${result.triage?.specialty_required} UNAVAILABLE)`}
              </span>
            </div>

            <div className="result-stats">
              <div>
                <b>{result.distance_km}</b>
                <span>KM DISTANCE</span>
              </div>
              <div>
                <b>{result.estimated_time_mins}</b>
                <span>MIN ETA</span>
              </div>
              <div>
                <b>{result.allocation_score}</b>
                <span>OPTIMIZATION SCORE</span>
              </div>
            </div>

            <button
              className="route-button"
              onClick={() => {
                setResult(null);
                onViewMap();
              }}
            >
              View Route in Command Center <Navigation size={16} />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
