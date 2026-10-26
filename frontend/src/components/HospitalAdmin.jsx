import { Minus, Plus, MapPin, BedDouble, AlertTriangle, ShieldCheck, Stethoscope, RefreshCw } from "lucide-react";
import { playTacticalClick } from "../utils/audioAlerts";

function capacityState(available) {
  if (available === 0) return ["CRITICAL CAPACITY", "critical"];
  if (available <= 3) return ["LIMITED RESERVE", "limited"];
  return ["OPERATIONAL", "available"];
}

export default function HospitalAdmin({
  hospitals = [],
  onBedChange,
  onSpecialtyChange,
  updating = null,
}) {
  const safeHospitals = Array.isArray(hospitals) ? hospitals : [];
  if (safeHospitals.length === 0) {
    return (
      <section className="view admin-view">
        <div className="section-heading">
          <div>
            <p className="eyebrow">RESOURCE CONTROL / 01</p>
            <h1>Regional Hospital Capacity</h1>
          </div>
        </div>
        <div className="empty-state-panel">
          <AlertTriangle size={32} className="empty-icon text-amber" />
          <h3>NO FACILITIES DETECTED ONLINE</h3>
          <p>
            The crisis telemetry feed returned zero active medical centers. Check backend network
            connectivity or reset the grid database.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="view admin-view">
      <div className="section-heading">
        <div>
          <p className="eyebrow">RESOURCE CONTROL // REGIONAL TELEMETRY</p>
          <h1>Hospital Bed Inventory & Specialized Units</h1>
          <p className="muted">
            Live telemetry of available ICU beds, specialized treatment departments, and algorithmic capacity forecasting.
          </p>
        </div>
        <div className="network-chip">
          <span className="signal-dot" /> {safeHospitals.length} FACILITIES ONLINE // IN-MEMORY GRID
        </div>
      </div>

      <div className="hospital-grid">
        {safeHospitals.map((hospital, index) => {
          const [label, style] = capacityState(hospital.available_beds);
          const percentage =
            hospital.total_beds > 0
              ? (hospital.available_beds / hospital.total_beds) * 100
              : 0;
          const forecast = hospital.forecast || {};
          const riskLevel = forecast.risk_level || "Stable Capacity";
          const isHighRisk = riskLevel.includes("High Risk");
          const isModerateRisk = riskLevel.includes("Moderate");
          const isUpdating = updating === hospital.id;

          const specialties = hospital.specialties || {};

          return (
            <article
              className={`hospital-card ${style}`}
              key={hospital.id}
              style={{ "--delay": `${index * 60}ms` }}
            >
              {/* Card Header */}
              <div className="card-top">
                <span className="facility-id">
                  {hospital.id.toUpperCase()} // REGIONAL HUB
                </span>
                <span className={`capacity-badge ${style}`}>
                  <span className="badge-dot" />
                  {label}
                </span>
              </div>

              {/* Hospital Title & Coordinates */}
              <h2 title={hospital.name}>{hospital.name}</h2>
              <p className="coordinates">
                <MapPin size={13} />
                <span>{hospital.lat.toFixed(4)}°N, {hospital.lng.toFixed(4)}°E</span>
              </p>

              {/* Primary Bed Capacity Readout */}
              <div className="bed-readout">
                <div>
                  <strong className="digital-counter">{hospital.available_beds}</strong>
                  <span className="bed-sub"> / {hospital.total_beds} beds open</span>
                </div>
                <div className="bed-icon-badge">
                  <BedDouble size={20} />
                </div>
              </div>

              {/* Capacity Progress Bar */}
              <div className="progress-track" role="progressbar" aria-valuenow={Math.round(percentage)} aria-valuemin={0} aria-valuemax={100}>
                <div
                  className={`progress-fill ${style}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>

              <div className="capacity-row">
                <span>AVAILABLE CAPACITY</span>
                <b>{Math.round(percentage)}% free ({hospital.total_beds - hospital.available_beds} occupied)</b>
              </div>

              {/* Specialty Units Breakdown */}
              <div className="specialties-section">
                <div className="specialties-header">
                  <Stethoscope size={12} className="specialties-icon" />
                  <span>SPECIALIZED DEPARTMENTS</span>
                </div>
                <div className="specialties-tags">
                  {Object.entries(specialties).map(([specName, specBeds]) => {
                    const isAvailable = specBeds > 0;
                    return (
                      <span
                        key={specName}
                        className={`spec-tag ${isAvailable ? "spec-open" : "spec-full"}`}
                        title={`${specName}: ${specBeds} units available`}
                      >
                        <span className="spec-name">{specName}:</span>
                        <b className="spec-count">{specBeds}</b>
                        {onSpecialtyChange && (
                          <span className="spec-controls">
                            <button
                              type="button"
                              className="spec-btn"
                              disabled={isUpdating || specBeds <= 0}
                              onClick={(e) => {
                                e.stopPropagation();
                                playTacticalClick();
                                onSpecialtyChange(hospital.id, specName, -1);
                              }}
                              title={`Decrease ${specName} capacity`}
                              aria-label={`Decrease ${specName} capacity`}
                            >
                              -
                            </button>
                            <button
                              type="button"
                              className="spec-btn"
                              disabled={isUpdating}
                              onClick={(e) => {
                                e.stopPropagation();
                                playTacticalClick();
                                onSpecialtyChange(hospital.id, specName, 1);
                              }}
                              title={`Increase ${specName} capacity`}
                              aria-label={`Increase ${specName} capacity`}
                            >
                              +
                            </button>
                          </span>
                        )}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Forecast & Risk Level */}
              <div className="forecast-row">
                <span
                  className={
                    isHighRisk
                      ? "risk-right"
                      : isModerateRisk
                      ? "risk-moderate"
                      : "risk-stable"
                  }
                >
                  {isHighRisk ? (
                    <AlertTriangle size={13} />
                  ) : (
                    <ShieldCheck size={13} />
                  )}
                  {riskLevel}
                </span>
              </div>

              {/* Forecast Timeline Grid (1H, 3H, 6H) */}
              <div className="forecast-grid">
                <div>
                  <small>+1H EST</small>
                  <strong>{forecast.projected_1h ?? hospital.available_beds}</strong>
                </div>
                <div>
                  <small>+3H EST</small>
                  <strong>{forecast.projected_3h ?? hospital.available_beds}</strong>
                </div>
                <div>
                  <small>+6H EST</small>
                  <strong>{forecast.projected_6h ?? hospital.available_beds}</strong>
                </div>
              </div>

              {/* Manual Capacity Stepper */}
              <div className="adjuster">
                <div className="adjuster-label">
                  <span>MANUAL CAPACITY OVERRIDE</span>
                  <small>BOUNDS: 0–{hospital.total_beds}</small>
                </div>
                <div className="adjust-buttons">
                  <button
                    aria-label={`Decrease bed for ${hospital.name}`}
                    disabled={isUpdating || hospital.available_beds === 0}
                    onClick={() => {
                      playTacticalClick();
                      onBedChange(hospital.id, -1);
                    }}
                    title="Decrement available bed capacity"
                  >
                    <Minus size={15} />
                  </button>
                  <button
                    aria-label={`Increase bed for ${hospital.name}`}
                    disabled={isUpdating || hospital.available_beds === hospital.total_beds}
                    onClick={() => {
                      playTacticalClick();
                      onBedChange(hospital.id, 1);
                    }}
                    title="Increment available bed capacity"
                  >
                    <Plus size={15} />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
