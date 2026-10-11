import { Minus, Plus, MapPin, BedDouble, AlertTriangle } from "lucide-react";

function capacityState(available) {
  if (available === 0) return ["CRITICAL CAPACITY", "critical"];
  if (available <= 3) return ["LIMITED", "limited"];
  return ["AVAILABLE", "available"];
}

export default function HospitalAdmin({ hospitals, onBedChange, updating }) {
  return (
    <section className="view admin-view">
      <div className="section-heading">
        <div>
          <p className="eyebrow">RESOURCE CONTROL / 01</p>
          <h1>Hospital Capacity</h1>
          <p className="muted">
            Monitor and manually tune receiving capacity across the network.
          </p>
        </div>
        <div className="network-chip">
          <span className="signal-dot" /> 4 FACILITIES ONLINE
        </div>
      </div>
      <div className="hospital-grid">
        {hospitals.map((hospital, index) => {
          const [label, style] = capacityState(hospital.available_beds);
          const percentage =
            (hospital.available_beds / hospital.total_beds) * 100;
          const forecast = hospital.forecast || {};
          const riskLevel = forecast.risk_level || "Stable Capacity";
          const shouldWarn = riskLevel.includes("High Risk");
          return (
            <article
              className="hospital-card"
              key={hospital.id}
              style={{ "--delay": `${index * 70}ms` }}
            >
              <div className="card-top">
                <span className="facility-id">
                  {hospital.id.toUpperCase()} / RECEIVING UNIT
                </span>
                <span className={`capacity-badge ${style}`}>{label}</span>
              </div>
              <h2>{hospital.name}</h2>
              <p className="coordinates">
                <MapPin size={14} /> {hospital.lat.toFixed(5)} /{" "}
                {hospital.lng.toFixed(5)}
              </p>
              <div className="bed-readout">
                <div>
                  <strong>{hospital.available_beds}</strong>
                  <span> / {hospital.total_beds} beds open</span>
                </div>
                <BedDouble size={21} />
              </div>
              <div className="progress-track">
                <div
                  className={`progress-fill ${style}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <div className="capacity-row">
                <span>CAPACITY UTILIZATION</span>
                <b>{Math.round(percentage)}% free</b>
              </div>
              <div className="forecast-row">
                <span className={shouldWarn ? "risk-right" : "risk-stable"}>
                  {shouldWarn ? <AlertTriangle size={13} /> : null}
                  {riskLevel}
                </span>
              </div>
              <div className="forecast-grid">
                <div>
                  <small>1H</small>
                  <strong>{forecast.projected_1h ?? hospital.available_beds}</strong>
                </div>
                <div>
                  <small>3H</small>
                  <strong>{forecast.projected_3h ?? hospital.available_beds}</strong>
                </div>
                <div>
                  <small>6H</small>
                  <strong>{forecast.projected_6h ?? hospital.available_beds}</strong>
                </div>
              </div>
              <div className="adjuster">
                <span>MANUAL ADJUSTMENT</span>
                <div className="adjust-buttons">
                  <button
                    aria-label={`Remove bed from ${hospital.name}`}
                    disabled={
                      updating === hospital.id || hospital.available_beds === 0
                    }
                    onClick={() => onBedChange(hospital.id, -1)}
                  >
                    <Minus size={16} />
                  </button>
                  <button
                    aria-label={`Add bed to ${hospital.name}`}
                    disabled={
                      updating === hospital.id ||
                      hospital.available_beds === hospital.total_beds
                    }
                    onClick={() => onBedChange(hospital.id, 1)}
                  >
                    <Plus size={16} />
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
