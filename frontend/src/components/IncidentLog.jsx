import React, { useState, useEffect } from "react";
import {
  History,
  RotateCcw,
  Search,
  Filter,
  ShieldAlert,
  Clock,
  MapPin,
  CheckCircle2,
  Ambulance,
  Stethoscope,
  ChevronRight,
  Radio,
} from "lucide-react";
import { fetchIncidents, updateIncidentStatus } from "../api";
import { playTacticalClick } from "../utils/audioAlerts";
import { formatApiError } from "../utils/errorFormatter";

const STATUS_OPTIONS = ["ALL", "DISPATCHED", "EN_ROUTE", "ARRIVED", "RESOLVED"];

export default function IncidentLog() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  const loadIncidents = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const data = await fetchIncidents(50);
      setIncidents(Array.isArray(data) ? data : []);
      setError("");
    } catch (err) {
      setError(formatApiError(err, "Failed to load incident history."));
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    loadIncidents();
  }, []);

  const handleStatusChange = async (incidentId, nextStatus) => {
    playTacticalClick();
    setUpdatingId(incidentId);
    try {
      await updateIncidentStatus(incidentId, nextStatus);
      setIncidents((prev) =>
        prev.map((inc) => (inc.id === incidentId ? { ...inc, status: nextStatus } : inc))
      );
    } catch (err) {
      setError(formatApiError(err, "Failed to update incident status."));
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = incidents.filter((inc) => {
    const matchesStatus = statusFilter === "ALL" || inc.status === statusFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      inc.id?.toLowerCase().includes(q) ||
      inc.allocated_hospital_name?.toLowerCase().includes(q) ||
      inc.symptoms?.toLowerCase().includes(q) ||
      inc.specialty_required?.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const getSeverityBadge = (level) => {
    const sev = Number(level) || 3;
    if (sev >= 5) return { label: `CRITICAL L${sev}`, cls: "sev-critical" };
    if (sev >= 4) return { label: `HIGH L${sev}`, cls: "sev-high" };
    if (sev >= 3) return { label: `MODERATE L${sev}`, cls: "sev-moderate" };
    return { label: `LOW L${sev}`, cls: "sev-low" };
  };

  return (
    <section className="view incidents-view" aria-label="Incident History Log">
      <div className="section-heading">
        <div>
          <p className="eyebrow">MISSION AUDIT / 04</p>
          <h1>Active Dispatch Incident Log</h1>
          <p className="muted">
            Auditable operational timeline of emergency resource allocations across Tamil Nadu.
            Every dispatch event is permanently logged with clinical telemetry, triage score, and assigned receiving center.
          </p>
        </div>
        <div className="network-chip">
          <span className="signal-dot" />
          <span>AUDIT LOG // {incidents.length} RECORDS</span>
        </div>
      </div>

      {error && (
        <div className="global-error" onClick={() => setError("")}>
          {error} <span>×</span>
        </div>
      )}

      {/* Control Bar: Filter Pills & Search */}
      <div className="incident-toolbar card-panel">
        <div className="incident-filters">
          <Filter size={14} className="filter-icon" />
          <span className="filter-label">STATUS:</span>
          {STATUS_OPTIONS.map((st) => (
            <button
              key={st}
              type="button"
              className={`filter-btn ${statusFilter === st ? "active" : ""}`}
              onClick={() => {
                playTacticalClick();
                setStatusFilter(st);
              }}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="incident-actions">
          <div className="search-box">
            <Search size={14} />
            <input
              type="text"
              placeholder="Search symptoms, hospital, ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>

          <button
            type="button"
            className="refresh-btn"
            onClick={() => {
              playTacticalClick();
              loadIncidents(true);
            }}
            disabled={refreshing}
            title="Refresh Incident Log from Database"
          >
            <RotateCcw size={14} className={refreshing ? "spin" : ""} />
            <span>{refreshing ? "SYNCING..." : "REFRESH"}</span>
          </button>
        </div>
      </div>

      {/* Content Grid */}
      {loading ? (
        <div className="empty-state-panel">
          <div className="loader" />
          <span>QUERYING INCIDENT PERSISTENCE LOG...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state-panel">
          <History size={32} className="empty-icon text-cyan" />
          <h3>NO INCIDENTS MATCHING CRITERIA</h3>
          <p>
            {incidents.length === 0
              ? "No emergency dispatches have been recorded yet. Trigger an emergency dispatch via Field SOS Console or AI Dispatch to populate the operational log."
              : "No records match the selected status or query."}
          </p>
        </div>
      ) : (
        <div className="incidents-list">
          {filtered.map((inc) => {
            const sev = getSeverityBadge(inc.severity);
            const isUpdating = updatingId === inc.id;
            return (
              <article key={inc.id} className="incident-card card-panel">
                <div className="inc-card-header">
                  <div className="inc-id-row">
                    <span className="inc-id-tag">{inc.id}</span>
                    <span className="inc-unit">
                      <Ambulance size={13} /> {inc.ambulance_id || "AMB-07"}
                    </span>
                    <span className={`inc-sev-badge ${sev.cls}`}>{sev.label}</span>
                  </div>

                  <div className="inc-status-control">
                    <span className={`inc-status-badge ${inc.status.toLowerCase()}`}>
                      <Radio size={11} className={inc.status === "DISPATCHED" ? "spin" : ""} />
                      {inc.status}
                    </span>
                    {inc.status !== "RESOLVED" && (
                      <div className="inc-next-actions">
                        {inc.status === "DISPATCHED" && (
                          <button
                            type="button"
                            className="status-step-btn"
                            disabled={isUpdating}
                            onClick={() => handleStatusChange(inc.id, "EN_ROUTE")}
                            title="Mark unit En Route"
                          >
                            Mark En Route
                          </button>
                        )}
                        {inc.status === "EN_ROUTE" && (
                          <button
                            type="button"
                            className="status-step-btn"
                            disabled={isUpdating}
                            onClick={() => handleStatusChange(inc.id, "ARRIVED")}
                            title="Mark unit Arrived at ER"
                          >
                            Mark Arrived
                          </button>
                        )}
                        {inc.status === "ARRIVED" && (
                          <button
                            type="button"
                            className="status-step-btn resolve"
                            disabled={isUpdating}
                            onClick={() => handleStatusChange(inc.id, "RESOLVED")}
                            title="Mark incident Resolved"
                          >
                            Resolve
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="inc-card-body">
                  <div className="inc-detail-column">
                    <div className="inc-field">
                      <span className="inc-label">PATIENT PRESENTATION / SYMPTOMS:</span>
                      <strong className="inc-value symptoms-text">
                        {inc.symptoms || "Unspecified acute emergency"}
                      </strong>
                    </div>

                    {inc.vitals && Object.keys(inc.vitals).length > 0 && (
                      <div className="inc-vitals-strip">
                        {inc.vitals.pulse && (
                          <span className="v-pill">PULSE: <b>{inc.vitals.pulse} bpm</b></span>
                        )}
                        {inc.vitals.systolic && (
                          <span className="v-pill">BP: <b>{inc.vitals.systolic} mmHg</b></span>
                        )}
                        {inc.vitals.spo2 && (
                          <span className="v-pill">SpO2: <b>{inc.vitals.spo2}%</b></span>
                        )}
                        {inc.vitals.temp && (
                          <span className="v-pill">TEMP: <b>{inc.vitals.temp}°C</b></span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="inc-allocation-column">
                    <div className="inc-field">
                      <span className="inc-label">ASSIGNED RECEIVING FACILITY:</span>
                      <strong className="inc-value hosp-name">
                        {inc.allocated_hospital_name}
                      </strong>
                    </div>

                    <div className="inc-metrics-row">
                      <div className="inc-metric">
                        <span className="m-label">SPECIALTY</span>
                        <span className={`m-val ${inc.specialty_matched ? "match" : "general"}`}>
                          {inc.specialty_required} {inc.specialty_matched ? "✓ RESERVED" : "(GEN)"}
                        </span>
                      </div>
                      <div className="inc-metric">
                        <span className="m-label">GEODESIC DIST</span>
                        <span className="m-val">{inc.distance_km} km</span>
                      </div>
                      <div className="inc-metric">
                        <span className="m-label">EST. ETA</span>
                        <span className="m-val cyan">{inc.eta_mins} mins</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="inc-card-footer">
                  <div className="inc-time">
                    <Clock size={12} />
                    <span>
                      {new Date(inc.timestamp).toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                        hour12: false,
                      })}
                    </span>
                  </div>
                  <div className="inc-coords">
                    <MapPin size={12} />
                    <span>
                      ORIGIN: {Number(inc.ambulance_lat).toFixed(4)}°N,{" "}
                      {Number(inc.ambulance_lng).toFixed(4)}°E
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
