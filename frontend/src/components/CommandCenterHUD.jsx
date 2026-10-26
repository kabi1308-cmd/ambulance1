import React from "react";
import {
  ShieldAlert,
  Activity,
  BedDouble,
  Navigation,
  Radio,
  Building2,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from "lucide-react";

export default function CommandCenterHUD({
  hospitals = [],
  lastAllocation = null,
  wsStatus = "connected",
  onNavigateToMap,
}) {
  const safeHospitals = Array.isArray(hospitals) ? hospitals : [];
  const totalFacilities = safeHospitals.length;
  const totalBeds = safeHospitals.reduce((sum, h) => sum + (h?.total_beds || 0), 0);
  const availableBeds = safeHospitals.reduce((sum, h) => sum + (h?.available_beds || 0), 0);
  const utilizationPercent =
    totalBeds > 0 ? Math.round(((totalBeds - availableBeds) / totalBeds) * 100) : 0;
  const availablePercent = totalBeds > 0 ? Math.round((availableBeds / totalBeds) * 100) : 0;

  const criticalHospitals = safeHospitals.filter((h) => h?.available_beds === 0);
  const limitedHospitals = safeHospitals.filter((h) => (h?.available_beds || 0) > 0 && (h?.available_beds || 0) <= 3);

  const isConnected = wsStatus === "connected";
  const isSyncing = wsStatus === "reconnecting" || wsStatus === "connecting";

  return (
    <section className="command-hud" aria-label="Regional Emergency Status HUD">
      <div className="hud-grid">
        {/* Card 1: Regional Facilities & Connectivity */}
        <div className="hud-card">
          <div className="hud-card-header">
            <span className="hud-label">
              <Building2 size={13} className="hud-icon cyan" />
              REGIONAL FACILITIES
            </span>
            <span className={`hud-badge ${isConnected ? "live" : isSyncing ? "warn" : "offline"}`}>
              <span className="hud-dot" />
              {isConnected ? "LIVE FEED" : isSyncing ? "RECONNECTING" : "OFFLINE"}
            </span>
          </div>
          <div className="hud-metric-row">
            <div className="hud-metric-primary">
              <span className="hud-num">{totalFacilities > 0 ? totalFacilities : "--"}</span>
              <span className="hud-sub">ONLINE HUBS</span>
            </div>
            <div className="hud-mini-stats">
              <div className="hud-stat-pill emerald">
                <CheckCircle2 size={11} />
                <span>{safeHospitals.length - criticalHospitals.length - limitedHospitals.length} Optimal</span>
              </div>
              <div className="hud-stat-pill amber">
                <AlertTriangle size={11} />
                <span>{limitedHospitals.length} Low Cap</span>
              </div>
              <div className="hud-stat-pill rose">
                <ShieldAlert size={11} />
                <span>{criticalHospitals.length} Full</span>
              </div>
            </div>
          </div>
          <div className="hud-footer">
            <span>TAMIL NADU REGIONAL EMS GRID</span>
            <span className="hud-mono">ID: TN-DISPATCH-99</span>
          </div>
        </div>

        {/* Card 2: Bed Capacity & Utilization */}
        <div className="hud-card">
          <div className="hud-card-header">
            <span className="hud-label">
              <BedDouble size={13} className="hud-icon emerald" />
              ICU & EMERGENCY BEDS
            </span>
            <span className="hud-mono-pill">
              {availablePercent}% AVAILABLE
            </span>
          </div>
          <div className="hud-metric-row">
            <div className="hud-metric-primary">
              <span className="hud-num">{availableBeds}</span>
              <span className="hud-sub">/ {totalBeds} OPEN</span>
            </div>
            <div className="hud-metric-secondary">
              <span className="hud-sec-label">UTILIZATION</span>
              <span className="hud-sec-val">{utilizationPercent}%</span>
            </div>
          </div>
          <div className="hud-progress-wrap">
            <div
              className={`hud-progress-bar ${
                availableBeds === 0 ? "critical" : availableBeds <= 5 ? "limited" : "normal"
              }`}
              style={{ width: `${utilizationPercent}%` }}
              role="progressbar"
              aria-valuenow={utilizationPercent}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
          <div className="hud-footer">
            <span>REAL-TIME INVENTORY STREAM</span>
            <span className="hud-mono">{totalBeds - availableBeds} OCCUPIED</span>
          </div>
        </div>

        {/* Card 3: Active Incident & Dispatch Status */}
        <div className={`hud-card ${lastAllocation ? "active-dispatch" : ""}`}>
          <div className="hud-card-header">
            <span className="hud-label">
              <Navigation size={13} className="hud-icon cyan" />
              ACTIVE DISPATCH TELEMETRY
            </span>
            <span className={`hud-badge ${lastAllocation ? "en-route" : "standby"}`}>
              <Radio size={11} className={lastAllocation ? "pulse-icon" : ""} />
              {lastAllocation ? "UNIT AMB-07 DISPATCHED" : "FLEET STANDBY"}
            </span>
          </div>
          {lastAllocation ? (
            <div className="hud-dispatch-content">
              <div className="hud-dispatch-hospital">
                <span className="hud-dest-label">RECEIVING FACILITY:</span>
                <strong className="hud-dest-name">
                  {lastAllocation.allocated_hospital?.name || "Assigned Facility"}
                </strong>
              </div>
              <div className="hud-dispatch-metrics">
                <div>
                  <span className="hud-meta-label">GEODESIC EST.</span>
                  <span className="hud-meta-val cyan">{lastAllocation.estimated_time_mins}m</span>
                </div>
                <div>
                  <span className="hud-meta-label">DISTANCE</span>
                  <span className="hud-meta-val">{lastAllocation.distance_km} km</span>
                </div>
                <div>
                  <span className="hud-meta-label">SEVERITY</span>
                  <span className="hud-meta-val rose">
                    L{lastAllocation.triage?.severity || 3}
                  </span>
                </div>
              </div>
              {onNavigateToMap && (
                <button
                  type="button"
                  className="hud-action-link"
                  onClick={onNavigateToMap}
                >
                  Track on Command Map →
                </button>
              )}
            </div>
          ) : (
            <div className="hud-standby-content">
              <div className="hud-standby-indicator">
                <span className="hud-standby-circle" />
                <span className="hud-standby-text">0 Active Critical Dispatches</span>
              </div>
              <span className="hud-standby-note">
                Monitoring regional 108 emergency queue. Ready for field SOS signal.
              </span>
            </div>
          )}
          <div className="hud-footer">
            <span>DISPATCH CHANNEL</span>
            <span className="hud-mono">FREQ: 154.280 MHz</span>
          </div>
        </div>

        {/* Card 4: Critical Capacity Alerts */}
        <div className={`hud-card ${criticalHospitals.length > 0 ? "alert-card" : ""}`}>
          <div className="hud-card-header">
            <span className="hud-label">
              <AlertTriangle size={13} className="hud-icon amber" />
              CRITICAL CAPACITY ALERTS
            </span>
            <span
              className={`hud-badge ${
                criticalHospitals.length > 0 ? "alert" : limitedHospitals.length > 0 ? "warn" : "live"
              }`}
            >
              {criticalHospitals.length > 0
                ? `${criticalHospitals.length} DEPLETED`
                : limitedHospitals.length > 0
                ? `${limitedHospitals.length} AT RISK`
                : "NOMINAL"}
            </span>
          </div>
          <div className="hud-alerts-content">
            {criticalHospitals.length > 0 ? (
              <div className="hud-alert-item danger">
                <ShieldAlert size={14} className="hud-alert-icon" />
                <div>
                  <strong>{criticalHospitals.map((h) => (h?.name ? h.name.split(" ")[0] : "Facility")).join(", ")}</strong>
                  <p>ICU capacity at zero. Patients redirected automatically.</p>
                </div>
              </div>
            ) : limitedHospitals.length > 0 ? (
              <div className="hud-alert-item warning">
                <AlertTriangle size={14} className="hud-alert-icon" />
                <div>
                  <strong>{limitedHospitals.map((h) => (h?.name ? h.name.split(" ")[0] : "Facility")).join(", ")}</strong>
                  <p>Low reserve (≤3 beds open). Monitored for triage diversion.</p>
                </div>
              </div>
            ) : (
              <div className="hud-alert-item nominal">
                <CheckCircle2 size={14} className="hud-alert-icon" />
                <div>
                  <strong>{safeHospitals.length > 0 ? `All ${safeHospitals.length} Facilities Operational` : "Regional Facilities Operational"}</strong>
                  <p>Sufficient ICU reserve across regional sectors.</p>
                </div>
              </div>
            )}
          </div>
          <div className="hud-footer">
            <span>TRIAGE FAILSAFE PROTOCOL</span>
            <span className="hud-mono">AUTO-DIVERT: ACTIVE</span>
          </div>
        </div>
      </div>
    </section>
  );
}
