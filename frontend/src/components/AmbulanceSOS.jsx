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
  AlertCircle,
  Stethoscope,
  Send,
  Radio,
} from "lucide-react";
import { triggerSOS } from "../api";
import { formatApiError } from "../utils/errorFormatter";
import { playDispatchAlert, playTacticalClick } from "../utils/audioAlerts";

const locationPresets = [
  { name: "Chennai Central", lat: 13.0827, lng: 80.2707, sector: "North Corridor" },
  { name: "Coimbatore Junction", lat: 11.0168, lng: 76.9558, sector: "Kongu Region" },
  { name: "Madurai Central", lat: 9.9252, lng: 78.1198, sector: "South Hub" },
  { name: "Trichy Central", lat: 10.7905, lng: 78.7047, sector: "Central Delta" },
];

const clinicalScenarios = [
  {
    label: "Acute STEMI / Chest Pain",
    dept: "Cath Lab",
    text: "54yo male with crushing substernal chest pain, diaphoresis, suspected acute STEMI",
    severity: 4,
    vitals: { pulse: "112", systolic: "88", spo2: "92", temperature: "37.1" },
  },
  {
    label: "Acute Stroke / Neuro Deficit",
    dept: "Neuro ICU",
    text: "62yo female with sudden facial drooping, right-sided hemiparesis, acute stroke onset <2h",
    severity: 5,
    vitals: { pulse: "84", systolic: "178", spo2: "96", temperature: "36.8" },
  },
  {
    label: "Severe Thermal Burn",
    dept: "Burn Unit",
    text: "35yo industrial worker with 35% TBSA partial and full thickness flame burns",
    severity: 4,
    vitals: { pulse: "128", systolic: "95", spo2: "94", temperature: "36.4" },
  },
  {
    label: "High-Speed Vehicular Trauma",
    dept: "Trauma ICU",
    text: "28yo unrestrained driver post-collision, compound femur fracture, unstable pelvis, active bleeding",
    severity: 5,
    vitals: { pulse: "135", systolic: "78", spo2: "90", temperature: "35.9" },
  },
  {
    label: "Cardiac Arrest / Resuscitation",
    dept: "ICU Resuscitation",
    text: "Patient in pulseless electrical activity, CPR in progress, post-shock rhythm instability",
    severity: 5,
    vitals: { pulse: "40", systolic: "55", spo2: "75", temperature: "35.2" },
  },
  {
    label: "Acute Respiratory Distress",
    dept: "Respiratory ICU",
    text: "Severe bronchospasm and cyanosis, accessory muscle use, failing respiratory effort",
    severity: 4,
    vitals: { pulse: "124", systolic: "140", spo2: "81", temperature: "38.2" },
  },
];

export default function AmbulanceSOS({
  ambulanceCoords,
  onCoordsChange,
  onAllocation,
  onViewMap,
}) {
  const [lat, setLat] = useState(String(ambulanceCoords.lat));
  const [lng, setLng] = useState(String(ambulanceCoords.lng));
  const [isHardwareGps, setIsHardwareGps] = useState(false);

  // Clinical state
  const [symptoms, setSymptoms] = useState("");
  const [severity, setSeverity] = useState(3);
  const [pulse, setPulse] = useState("");
  const [systolic, setSystolic] = useState("");
  const [spo2, setSpo2] = useState("");
  const [temperature, setTemperature] = useState("");

  const [activeScenario, setActiveScenario] = useState(null);
  const [sending, setSending] = useState(false);
  const [geoLocating, setGeoLocating] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [result, setResult] = useState(null);

  const applyLocationPreset = (preset) => {
    playTacticalClick();
    setLat(String(preset.lat));
    setLng(String(preset.lng));
    setIsHardwareGps(false);
    onCoordsChange({ lat: preset.lat, lng: preset.lng });
    setFieldErrors((prev) => ({ ...prev, lat: null, lng: null }));
  };

  const applyClinicalScenario = (scenario) => {
    playTacticalClick();
    setActiveScenario(scenario.label);
    setSymptoms(scenario.text);
    setSeverity(scenario.severity);
    if (scenario.vitals) {
      setPulse(scenario.vitals.pulse);
      setSystolic(scenario.vitals.systolic);
      setSpo2(scenario.vitals.spo2);
      setTemperature(scenario.vitals.temperature);
    }
  };

  const handleUseCurrentLocation = () => {
    setFormError("");
    if (!navigator.geolocation) {
      setFormError("Browser Geolocation is not supported in this environment.");
      return;
    }
    setGeoLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latitude = pos.coords.latitude.toFixed(4);
        const longitude = pos.coords.longitude.toFixed(4);
        setLat(latitude);
        setLng(longitude);
        setIsHardwareGps(true);
        onCoordsChange({ lat: Number(latitude), lng: Number(longitude) });
        setGeoLocating(false);
        setFieldErrors((prev) => ({ ...prev, lat: null, lng: null }));
      },
      (err) => {
        setGeoLocating(false);
        setIsHardwareGps(false);
        setFormError("Hardware GPS access denied or unavailable. Manual coordinates active.");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const validateForm = () => {
    const errors = {};
    const latNum = Number(lat);
    const lngNum = Number(lng);

    if (isNaN(latNum) || latNum < -90 || latNum > 90) {
      errors.lat = "Latitude must be between -90.0 and +90.0.";
    }
    if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
      errors.lng = "Longitude must be between -180.0 and +180.0.";
    }

    if (pulse.trim()) {
      const p = Number(pulse);
      if (isNaN(p) || p < 30 || p > 250) {
        errors.pulse = "Pulse must be between 30 and 250 bpm.";
      }
    }
    if (systolic.trim()) {
      const s = Number(systolic);
      if (isNaN(s) || s < 40 || s > 260) {
        errors.systolic = "Systolic BP must be between 40 and 260 mmHg.";
      }
    }
    if (spo2.trim()) {
      const o = Number(spo2);
      if (isNaN(o) || o < 50 || o > 100) {
        errors.spo2 = "SpO2 must be between 50% and 100%.";
      }
    }
    if (temperature.trim()) {
      const t = Number(temperature);
      if (isNaN(t) || t < 30.0 || t > 45.0) {
        errors.temperature = "Body Temp must be between 30.0°C and 45.0°C.";
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const submit = async () => {
    setFormError("");
    if (sending) return;

    if (!validateForm()) {
      setFormError("Please correct highlighted validation errors before dispatching.");
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

      playDispatchAlert();
      const coords = { lat: Number(lat), lng: Number(lng) };
      onCoordsChange(coords);
      onAllocation(response, coords);
      setResult(response);
    } catch (exception) {
      setFormError(
        formatApiError(
          exception,
          "Emergency dispatch link unavailable. Verify backend command server is online."
        )
      );
    } finally {
      setSending(false);
    }
  };

  const getSeverityLabel = (level) => {
    switch (level) {
      case 5:
        return { label: "CRITICAL / CODE RED", style: "sev-5" };
      case 4:
        return { label: "HIGH URGENCY", style: "sev-4" };
      case 3:
        return { label: "MODERATE EMERGENCY", style: "sev-3" };
      case 2:
        return { label: "LOW URGENCY", style: "sev-2" };
      default:
        return { label: "MINOR / STABLE", style: "sev-1" };
    }
  };

  const sevInfo = getSeverityLabel(severity);

  return (
    <section className="view sos-view">
      {/* Section Heading */}
      <div className="section-heading">
        <div>
          <p className="eyebrow">FIELD CONSOLE // 02</p>
          <h1>Emergency Dispatch & Clinical Triage Console</h1>
          <p className="muted">
            Transmits real-time GPS coordinates, clinical complaints, and patient vitals to the multi-factor ICU allocation engine.
          </p>
        </div>
        <div className="console-status">
          <span className="signal-dot" /> UNIT AMB-07 // FIELD DISPATCH READY
        </div>
      </div>

      <div className="sos-layout">
        {/* Left Column: Intake Console */}
        <div className="console-panel card-panel">
          {/* SECTION 1: Geospatial Coordinates */}
          <div className="panel-subhead">
            <div className="panel-label">
              <Crosshair size={16} />
              <span>1. AMBULANCE GEOSPATIAL ANCHOR</span>
            </div>
            <span className={`gps-indicator ${isHardwareGps ? "hardware" : "manual"}`}>
              {isHardwareGps ? "HARDWARE GPS FIXED" : "MANUAL / SIMULATED ANCHOR"}
            </span>
          </div>

          <div className="input-grid">
            <label className={fieldErrors.lat ? "has-error" : ""}>
              <span>LATITUDE (-90 to +90)</span>
              <input
                type="number"
                step="0.0001"
                value={lat}
                onChange={(e) => {
                  setLat(e.target.value);
                  setIsHardwareGps(false);
                }}
                placeholder="13.0827"
              />
              {fieldErrors.lat && <span className="field-err">{fieldErrors.lat}</span>}
            </label>

            <label className={fieldErrors.lng ? "has-error" : ""}>
              <span>LONGITUDE (-180 to +180)</span>
              <input
                type="number"
                step="0.0001"
                value={lng}
                onChange={(e) => {
                  setLng(e.target.value);
                  setIsHardwareGps(false);
                }}
                placeholder="80.2707"
              />
              {fieldErrors.lng && <span className="field-err">{fieldErrors.lng}</span>}
            </label>
          </div>

          {/* Browser Location Detection */}
          <button
            type="button"
            className="location-detect-button"
            onClick={handleUseCurrentLocation}
            disabled={geoLocating}
          >
            <LocateFixed size={15} />
            <span>
              {geoLocating ? "ACQUIRING HARDWARE GPS LOCK..." : "USE CURRENT BROWSER GPS POSITION"}
            </span>
          </button>

          {/* Quick Location Presets */}
          <div className="preset-label">REGIONAL PRESET HUBS (TAMIL NADU)</div>
          <div className="presets">
            {locationPresets.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => applyLocationPreset(preset)}
                className={lat === String(preset.lat) && lng === String(preset.lng) ? "active-preset" : ""}
              >
                <MapPin size={13} />
                <span>{preset.name}</span>
              </button>
            ))}
          </div>

          {/* SECTION 2: Clinical Scenarios & Symptoms */}
          <div className="panel-subhead" style={{ marginTop: "28px" }}>
            <div className="panel-label">
              <Activity size={16} />
              <span>2. CLINICAL PRESENTATION & SCENARIOS</span>
            </div>
            <span className="mono-sub">ICU SPECIALTY MATCHER</span>
          </div>

          <div className="preset-label">RAPID EMERGENCY SCENARIO PRESETS</div>
          <div className="scenario-grid">
            {clinicalScenarios.map((scenario) => {
              const isSelected = activeScenario === scenario.label;
              return (
                <button
                  key={scenario.label}
                  type="button"
                  onClick={() => applyClinicalScenario(scenario)}
                  className={`scenario-btn ${isSelected ? "selected" : ""}`}
                >
                  <div className="scen-top">
                    <span className="scen-label">{scenario.label}</span>
                    <span className={`scen-sev sev-${scenario.severity}`}>L{scenario.severity}</span>
                  </div>
                  <span className="scen-dept">TARGET: {scenario.dept}</span>
                </button>
              );
            })}
          </div>

          {/* Chief Complaint Textarea */}
          <label style={{ marginTop: "14px" }}>
            <span>PATIENT CHIEF COMPLAINT / CLINICAL SIGNS</span>
            <textarea
              rows={3}
              value={symptoms}
              placeholder="Describe symptoms, mechanism of injury, onset time, or clinical findings..."
              onChange={(e) => setSymptoms(e.target.value)}
            />
          </label>

          {/* Severity Slider */}
          <div className="severity-control-wrap">
            <div className="sev-header">
              <span>FIELD TRIAGE SEVERITY:</span>
              <strong className={`sev-readout ${sevInfo.style}`}>
                LEVEL {severity} / 5 — {sevInfo.label}
              </strong>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={severity}
              onChange={(e) => {
                playTacticalClick();
                setSeverity(Number(e.target.value));
              }}
              className={`severity-slider sev-${severity}`}
              aria-label="Patient Field Severity Level"
            />
            <div className="slider-ticks">
              <span>1: MINOR</span>
              <span>2: LOW</span>
              <span>3: MODERATE</span>
              <span>4: URGENT</span>
              <span>5: CRITICAL</span>
            </div>
          </div>

          {/* SECTION 3: Vital Signs */}
          <div className="panel-subhead" style={{ marginTop: "28px" }}>
            <div className="panel-label">
              <HeartPulse size={16} />
              <span>3. PATIENT VITALS (PHYSIOLOGICAL TELEMETRY)</span>
            </div>
            <span className="mono-sub">OPTIONAL FIELD INPUT</span>
          </div>

          <div className="vitals-input-grid">
            <label className={fieldErrors.pulse ? "has-error" : ""}>
              <span>PULSE RATE (BPM)</span>
              <div className="vital-input-wrap">
                <input
                  type="number"
                  placeholder="e.g. 110"
                  value={pulse}
                  onChange={(e) => setPulse(e.target.value)}
                />
                <span className="unit-tag">BPM</span>
              </div>
              {fieldErrors.pulse && <span className="field-err">{fieldErrors.pulse}</span>}
            </label>

            <label className={fieldErrors.systolic ? "has-error" : ""}>
              <span>SYSTOLIC BP (mmHg)</span>
              <div className="vital-input-wrap">
                <input
                  type="number"
                  placeholder="e.g. 85"
                  value={systolic}
                  onChange={(e) => setSystolic(e.target.value)}
                />
                <span className="unit-tag">mmHg</span>
              </div>
              {fieldErrors.systolic && <span className="field-err">{fieldErrors.systolic}</span>}
            </label>

            <label className={fieldErrors.spo2 ? "has-error" : ""}>
              <span>OXYGEN SpO2 (%)</span>
              <div className="vital-input-wrap">
                <input
                  type="number"
                  placeholder="e.g. 88"
                  value={spo2}
                  onChange={(e) => setSpo2(e.target.value)}
                />
                <span className="unit-tag">%</span>
              </div>
              {fieldErrors.spo2 && <span className="field-err">{fieldErrors.spo2}</span>}
            </label>

            <label className={fieldErrors.temperature ? "has-error" : ""}>
              <span>BODY TEMP (°C)</span>
              <div className="vital-input-wrap">
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 38.5"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                />
                <span className="unit-tag">°C</span>
              </div>
              {fieldErrors.temperature && <span className="field-err">{fieldErrors.temperature}</span>}
            </label>
          </div>

          {/* Medical Prototype Disclaimer Banner */}
          <div className="prototype-disclaimer-box" role="note">
            <ShieldAlert size={18} className="disclaimer-icon" />
            <div className="disclaimer-content">
              <strong>CLINICAL DECISION SUPPORT // PROTOTYPE ALGORITHMIC ENGINE</strong>
              <p>
                Calculates optimal receiving facility matching travel distance, bed availability, and specialty requirements.
                This algorithmic triage recommendation does NOT replace confirmed medical physician diagnosis or statutory EMS protocol.
              </p>
            </div>
          </div>

          {/* Submit Emergency Button */}
          <button
            type="button"
            className="sos-button"
            onClick={submit}
            disabled={sending}
            title="Dispatch emergency allocation signal"
          >
            <AlertTriangle size={22} className={sending ? "spin" : "warning-icon"} />
            <span>
              {sending
                ? "COMPUTING OPTIMAL ALLOCATION MATRIX..."
                : "TRANSMIT EMERGENCY SOS DISPATCH"}
            </span>
          </button>

          {formError && (
            <div className="form-error-banner" role="alert">
              <AlertCircle size={15} />
              <span>{formError}</span>
            </div>
          )}
        </div>

        {/* Right Column: Mission Briefing Panel */}
        <aside className="briefing-panel card-panel">
          <span className="briefing-kicker">DISPATCH PROTOCOL // MULTI-FACTOR SCORING</span>
          <h2>Automated ICU Bed Allocation Matrix</h2>
          <p>
            The Crisis-Grid triage scoring engine continuously balances geodesic travel time, specialized department availability (Cath Lab, Stroke, Burn, Trauma), and real-time hospital bed depletion rates.
          </p>

          {/* Live Intake Summary */}
          <div className="intake-summary-card">
            <div className="summary-title">CURRENT SIGNAL TELEMETRY</div>
            <div className="summary-row">
              <span>Target Anchor:</span>
              <strong>{lat ? `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}` : "Unset"}</strong>
            </div>
            <div className="summary-row">
              <span>Severity Rating:</span>
              <strong className={sevInfo.style}>Level {severity} ({sevInfo.label})</strong>
            </div>
            <div className="summary-row">
              <span>Symptoms Intake:</span>
              <span className="symptoms-snippet">
                {symptoms ? symptoms.slice(0, 75) + (symptoms.length > 75 ? "..." : "") : "None entered (Default Trauma)"}
              </span>
            </div>
            {(pulse || systolic || spo2 || temperature) && (
              <div className="summary-vitals-strip">
                {pulse && <span>Pulse: {pulse} bpm</span>}
                {systolic && <span>BP: {systolic} mmHg</span>}
                {spo2 && <span>SpO2: {spo2}%</span>}
                {temperature && <span>Temp: {temperature}°C</span>}
              </div>
            )}
          </div>

          {/* Protocol Features */}
          <div className="protocol-row">
            <Navigation size={17} />
            <div>
              <strong>30 KM/H BASELINE RESPONSE SPEED</strong>
              <small>Provides conservative, robust ETA scoring bounds.</small>
            </div>
          </div>

          <div className="protocol-row">
            <Crosshair size={17} />
            <div>
              <strong>CONCURRENT ATOMIC RESERVATIONS</strong>
              <small>Thread-safe locking guarantees zero ICU double-bookings.</small>
            </div>
          </div>

          <div className="protocol-row">
            <Stethoscope size={17} />
            <div>
              <strong>CLINICAL SPECIALTY DECREMENTATION</strong>
              <small>Deducts specific Cath Lab / Neuro beds upon allocation.</small>
            </div>
          </div>
        </aside>
      </div>

      {/* Allocation Confirmed Modal */}
      {result && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="allocation-modal">
            <button
              className="close-modal"
              onClick={() => setResult(null)}
              aria-label="Close allocation dialog"
            >
              <X size={18} />
            </button>

            <div className="success-mark">
              <CheckCircle2 size={28} />
            </div>

            <p className="eyebrow">ALLOCATION CONFIRMED // BED RESERVED</p>
            <h2>{result.allocated_hospital.name}</h2>
            <p className="coordinates">
              <MapPin size={14} />
              <span>
                {result.allocated_hospital.lat.toFixed(5)}°N, {result.allocated_hospital.lng.toFixed(5)}°E
              </span>
            </p>

            <div className="modal-pills">
              <span className="triage-pill">
                SEVERITY {result.triage?.severity} // {result.triage?.triage_label?.toUpperCase()}
              </span>
              <span className={`specialty-pill ${result.specialty_match ? "matched" : "unmatched"}`}>
                {result.specialty_match
                  ? `✓ ${result.triage?.specialty_required} UNIT RESERVED`
                  : `GENERAL ICU (${result.triage?.specialty_required} UNAVAILABLE)`}
              </span>
            </div>

            <div className="result-stats">
              <div>
                <b>{result.distance_km}</b>
                <span>KM GEODESIC</span>
              </div>
              <div>
                <b>{result.estimated_time_mins}</b>
                <span>MIN BASELINE ETA</span>
              </div>
              <div>
                <b>{result.allocation_score}</b>
                <span>ALLOCATION SCORE</span>
              </div>
            </div>

            <p className="modal-rationale">
              {result.allocation_reason}
            </p>

            <button
              className="route-button"
              onClick={() => {
                setResult(null);
                onViewMap();
              }}
            >
              <Navigation size={16} />
              <span>TRACK MISSION ON COMMAND MAP</span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
