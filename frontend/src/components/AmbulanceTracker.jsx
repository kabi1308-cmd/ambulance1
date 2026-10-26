import React from "react";
import { Navigation, Play, Pause, RotateCcw, Activity } from "lucide-react";
import { playTacticalClick } from "../utils/audioAlerts";

export default function AmbulanceTracker({
  status = "STANDBY", // "STANDBY" | "EN ROUTE" | "ARRIVED"
  currentCoords,
  destinationName,
  remainingDistanceKm,
  remainingDurationMins,
  progressPercent = 0,
  isSimulating = false,
  onToggleSimulation,
  onResetSimulation,
  simulationSpeed = 1,
  onChangeSpeed,
}) {
  const isEnRoute = status === "EN ROUTE";
  const isArrived = status === "ARRIVED";

  return (
    <div className="tracker-card card-panel">
      {/* Card Header with Clear Simulation Transparency */}
      <div className="card-top">
        <div className="unit-badge">
          <Navigation size={14} className="pulse-icon" />
          <span>UNIT AMB-07 // ADVANCED LIFE SUPPORT</span>
        </div>
        <div className="mode-badge simulated" title="Ambulance movement along route is simulated via timer interpolation">
          <span className="mode-dot" />
          <span>SIMULATED EN-ROUTE TELEMETRY</span>
        </div>
      </div>

      <div className="tracker-body">
        {/* Status Row */}
        <div className="status-row">
          <div className="status-indicator">
            <span className="status-label">MISSION DISPATCH STATE</span>
            <div className={`status-pill ${status.toLowerCase().replace(" ", "-")}`}>
              <Activity size={13} />
              <strong>{status}</strong>
            </div>
          </div>
          {destinationName && (
            <div className="destination-indicator">
              <span className="status-label">ASSIGNED RECEIVING FACILITY</span>
              <strong className="dest-name">{destinationName}</strong>
            </div>
          )}
        </div>

        {/* Dynamic Telemetry Metrics */}
        <div className="metrics-grid">
          <div className="metric-box">
            <span className="metric-label">REMAINING DISTANCE</span>
            <span className="metric-value">
              {remainingDistanceKm !== null ? `${remainingDistanceKm.toFixed(1)} km` : "--"}
            </span>
          </div>
          <div className="metric-box">
            <span className="metric-label">ESTIMATED REMAINING ETA</span>
            <span className="metric-value highlight">
              {remainingDurationMins !== null ? `${Math.ceil(remainingDurationMins)} min` : "--"}
            </span>
          </div>
          <div className="metric-box">
            <span className="metric-label">ROUTE COMPLETION</span>
            <span className="metric-value">{Math.round(progressPercent)}%</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="route-progress-track" role="progressbar" aria-valuenow={Math.round(progressPercent)} aria-valuemin={0} aria-valuemax={100}>
          <div
            className={`route-progress-fill ${isArrived ? "complete" : ""}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Simulation Playback Controls */}
        <div className="simulation-controls">
          <button
            type="button"
            className="sim-btn play-btn"
            onClick={() => {
              playTacticalClick();
              onToggleSimulation();
            }}
            disabled={isArrived || remainingDistanceKm === null}
            title={isSimulating ? "Pause Simulated Movement" : "Start Simulated Movement"}
          >
            {isSimulating ? <Pause size={14} /> : <Play size={14} />}
            <span>{isSimulating ? "PAUSE SIMULATION" : "SIMULATE ROUTE"}</span>
          </button>

          <button
            type="button"
            className="sim-btn icon-only"
            onClick={() => {
              playTacticalClick();
              onResetSimulation();
            }}
            disabled={progressPercent === 0}
            title="Reset simulation to origin"
            aria-label="Reset route simulation"
          >
            <RotateCcw size={14} />
          </button>

          <div className="speed-selector" role="group" aria-label="Simulation Speed Controls">
            <span className="speed-label">SPEED:</span>
            {[1, 2, 5].map((speed) => (
              <button
                key={speed}
                type="button"
                className={`speed-btn ${simulationSpeed === speed ? "active" : ""}`}
                onClick={() => {
                  playTacticalClick();
                  onChangeSpeed(speed);
                }}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>

        {/* Telemetry Transparency Footer */}
        <div className="coordinates-footer">
          <span>
            LAT: {currentCoords?.lat?.toFixed(5) || "--"} | LNG: {currentCoords?.lng?.toFixed(5) || "--"}
          </span>
          <span className="sim-notice-tag">
            SIMULATED ROUTE INTERPOLATION // 30 KM/H BASELINE
          </span>
        </div>
      </div>
    </div>
  );
}
