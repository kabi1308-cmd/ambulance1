import { useState } from "react";
import { AlertTriangle, Crosshair, MapPin, Navigation, X, LocateFixed } from "lucide-react";
import { triggerSOS } from "../api";
import { formatApiError } from "../utils/errorFormatter";

const presets = [
  ["Chennai Central", 13.0827, 80.2707],
  ["Coimbatore Junction", 11.0168, 76.9558],
  ["Madurai Central", 9.9252, 78.1198],
  ["Trichy Central", 10.7905, 78.7047],
];

export default function AmbulanceSOS({
  ambulanceCoords,
  onCoordsChange,
  onAllocation,
  onViewMap,
}) {
  const [lat, setLat] = useState(String(ambulanceCoords.lat));
  const [lng, setLng] = useState(String(ambulanceCoords.lng));
  const [sending, setSending] = useState(false);
  const [geoLocating, setGeoLocating] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const applyPreset = (preset) => {
    setLat(String(preset[1]));
    setLng(String(preset[2]));
    onCoordsChange({ lat: preset[1], lng: preset[2] });
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

  const submit = async () => {
    setError("");
    setSending(true);
    try {
      const response = await triggerSOS(lat, lng);
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
            Transmit live patient location to the allocation engine.
          </p>
        </div>
        <div className="console-status">
          <span className="signal-dot" /> UNIT AMB-07 / SECURE
        </div>
      </div>
      <div className="sos-layout">
        <div className="console-panel">
          <div className="panel-label">
            <Crosshair size={16} /> AMBULANCE POSITION
          </div>
          <div className="input-grid">
            <label>
              LATITUDE
              <input
                type="number"
                step="0.0001"
                value={lat}
                onChange={(event) => setLat(event.target.value)}
              />
            </label>
            <label>
              LONGITUDE
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
          <button className="sos-button" onClick={submit} disabled={sending}>
            <AlertTriangle size={23} />
            {sending
              ? "CALCULATING OPTIMAL RECEIVING UNIT..."
              : "DISPATCH EMERGENCY SOS"}
          </button>
          {error && <p className="error-message">{error}</p>}
        </div>
        <div className="briefing-panel">
          <span className="briefing-kicker">DISPATCH PROTOCOL</span>
          <h2>Fastest viable care, calculated in real time.</h2>
          <p>
            Every signal is scored against travel time and current bed
            availability. The selected facility is reserved immediately when the
            dispatch is confirmed.
          </p>
          <div className="protocol-row">
            <Navigation size={17} />
            <span>30 KM/H ESTIMATED RESPONSE SPEED</span>
          </div>
          <div className="protocol-row">
            <Crosshair size={17} />
            <span>GEODESIC DISTANCE MODEL</span>
          </div>
        </div>
      </div>
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
