import React from "react";
import { Navigation, Play, Pause, RotateCcw, FastForward, ShieldAlert, Activity } from "lucide-react";

export default function AmbulanceTracker({
  status, // "STANDBY" | "EN ROUTE" | "ARRIVED"
  currentCoords,
  destinationName,
  remainingDistanceKm,
  remainingDurationMins,
  progressPercent,
  isSimulating,
  onToggleSimulation,
  onResetSimulation,
  onFastForward,
  simulationSpeed,
  onChangeSpeed,
}) {
  const isEnRoute = status === "EN ROUTE";
  const isArrived = status === "ARRIVED";

  return (
    <div className="tracker-card card-panel">
      <div className="card-top">
        <div className="unit-badge">
          <Navigation size={14} className="pulse-icon" />
          <span>UNIT AMB-07 / AMBULANCE A-01</span>
        </div>
        <div className="mode-badge">
          <span className="mode-dot" />
          <span>SIMULATION MODE</span>
        </div>
      </div>

      <div className="tracker-body">
        <div className="status-row">
          <div className="status-indicator">
            <span className="status-label">CURRENT STATUS</span>
            <div className={`status-pill ${status.toLowerCase().replace(" ", "-")}`}>
              <Activity size={13} />
              <strong>{status}</strong>
            </div>
          </div>
          {destinationName && (
            <div className="destination-indicator">
              <span className="status-label">ASSIGNED DESTINATION</span>
              <strong className="dest-name">{destinationName}</strong>
            </div>
          )}
        </div>

        <div className="metrics-grid">
          <div className="metric-box">
            <span className="metric-label">REMAINING DISTANCE</span>
            <span className="metric-value">
              {remainingDistanceKm !== null ? `${remainingDistanceKm.toFixed(1)} km` : "--"}
            </span>
          </div>
          <div className="metric-box">
            <span className="metric-label">ESTIMATED ETA</span>
            <span className="metric-value highlight">
              {remainingDurationMins !== null ? `${Math.ceil(remainingDurationMins)} min` : "--"}
            </span>
          </div>
          <div className="metric-box">
            <span className="metric-label">ROUTE PROGRESS</span>
            <span className="metric-value">{Math.round(progressPercent)}%</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="route-progress-track">
          <div
            className={`route-progress-fill ${isArrived ? "complete" : ""}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Simulation Controls */}
        <div className="simulation-controls">
          <button
            className="sim-btn play-btn"
            onClick={onToggleSimulation}
            disabled={isArrived || remainingDistanceKm === null}
            title={isSimulating ? "Pause Simulation" : "Start Simulation"}
          >
            {isSimulating ? <Pause size={14} /> : <Play size={14} />}
            <span>{isSimulating ? "PAUSE" : "SIMULATE ROUTE"}</span>
          </button>

          <button
            className="sim-btn icon-only"
            onClick={onResetSimulation}
            disabled={progressPercent === 0}
            title="Reset Simulation"
          >
            <RotateCcw size={14} />
          </button>

          <div className="speed-selector">
            <span className="speed-label">SPEED:</span>
            {[1, 2, 5].map((speed) => (
              <button
                key={speed}
                className={`speed-btn ${simulationSpeed === speed ? "active" : ""}`}
                onClick={() => onChangeSpeed(speed)}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>

        <div className="coordinates-footer">
          <span>
            LAT: {currentCoords?.lat?.toFixed(5) || "--"} | LNG: {currentCoords?.lng?.toFixed(5) || "--"}
          </span>
          <span className="notice-tag">LIVE MAP TRACKING</span>
        </div>
      </div>
    </div>
  );
}
