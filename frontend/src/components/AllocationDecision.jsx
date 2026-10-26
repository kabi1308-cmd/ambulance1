import React from "react";
import { ShieldCheck, MapPin, AlertCircle, HeartPulse, CheckCircle2 } from "lucide-react";

export default function AllocationDecision({ allocation }) {
  if (!allocation) return null;

  const {
    allocated_hospital,
    distance_km,
    estimated_time_mins,
    triage,
    specialty_match,
    allocation_reason,
  } = allocation;

  const severityLevel = triage?.severity || 3;
  const triageLabel = triage?.triage_label || "Moderate";
  const specialtyRequired = triage?.specialty_required || "ICU";

  return (
    <div className="allocation-card card-panel">
      <div className="card-top">
        <div className="section-label">
          <ShieldCheck size={16} className="text-cyan" />
          <span>ALLOCATION DECISION RATIONALE</span>
        </div>
        <span className={`severity-badge severity-${severityLevel}`}>
          SEVERITY {severityLevel} // {triageLabel.toUpperCase()}
        </span>
      </div>

      <div className="allocation-header">
        <h2>{allocated_hospital?.name}</h2>
        <p className="coordinates">
          <MapPin size={13} />
          <span>
            {allocated_hospital?.lat?.toFixed(5)}°N, {allocated_hospital?.lng?.toFixed(5)}°E
          </span>
        </p>
      </div>

      <div className="decision-grid">
        <div className="decision-item">
          <span className="label">OPEN ICU BEDS</span>
          <strong className="value">{allocated_hospital?.available_beds} beds</strong>
        </div>

        <div className="decision-item">
          <span className="label">GEODESIC DISTANCE</span>
          <strong className="value">{distance_km} km</strong>
        </div>

        <div className="decision-item">
          <span className="label">BASELINE 30 KM/H ETA</span>
          <strong className="value highlight">{estimated_time_mins} min</strong>
        </div>

        <div className="decision-item">
          <span className="label">SPECIALTY UNIT RESERVED</span>
          <div className={`specialty-pill ${specialty_match ? "matched" : "unmatched"}`}>
            {specialty_match ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
            <span>{specialtyRequired} ({specialty_match ? "RESERVED" : "GENERAL ICU"})</span>
          </div>
        </div>
      </div>

      <div className="decision-reason-box">
        <span className="reason-title">ALGORITHMIC SELECTION RATIONALE</span>
        <p className="reason-text">
          {allocation_reason ||
            `Optimal receiving facility calculated based on severity score (${severityLevel}), proximity (${distance_km} km), bed capacity (${allocated_hospital?.available_beds} beds open), and specialty compatibility.`}
        </p>
      </div>
    </div>
  );
}
