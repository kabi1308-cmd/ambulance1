import { Activity, Database, RotateCcw, Radio, Shield } from "lucide-react";

const tabs = [
  ["admin", "Hospital Admin"],
  ["sos", "Ambulance SOS"],
  ["chat", "AI Dispatch"],
  ["map", "Command Center Map"],
];

export default function Navbar({
  activeTab,
  onTabChange,
  hospitals,
  onReset,
  resetting,
}) {
  const beds = hospitals.reduce(
    (total, hospital) => total + hospital.available_beds,
    0,
  );
  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark">
          <Shield size={19} />
        </div>
        <div>
          <strong>CRISIS-GRID</strong>
          <span>// Emergency Dispatch System</span>
        </div>
      </div>
      <div className="status-strip">
        <div className="stat">
          <Database size={15} />
          <b>{beds}</b>
          <span>available beds</span>
        </div>
        <div className="stat active">
          <Activity size={15} />
          <b>ACTIVE</b>
          <span>system status</span>
        </div>
      </div>
      <nav className="tab-nav" aria-label="Main navigation">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            className={activeTab === id ? "tab active" : "tab"}
            onClick={() => onTabChange(id)}
          >
            {label}
          </button>
        ))}
      </nav>
      <button className="reset-button" onClick={onReset} disabled={resetting}>
        <RotateCcw size={15} /> {resetting ? "Resetting" : "Reset Data"}
      </button>
      <div className="live-indicator">
        <Radio size={14} /> LIVE FEED
      </div>
    </header>
  );
}
