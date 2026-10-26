import { useState, useEffect } from "react";
import {
  Activity,
  Database,
  RotateCcw,
  Radio,
  Shield,
  Volume2,
  VolumeX,
  Clock,
  Layers,
  MapPin,
  Bot,
  Flame,
  History,
} from "lucide-react";
import { toggleAudio, isAudioEnabled, playTacticalClick } from "../utils/audioAlerts";

const tabs = [
  { id: "admin", label: "Hospital Capacity", icon: Layers, badge: null },
  { id: "sos", label: "Field SOS Console", icon: Flame, badge: "SOS" },
  { id: "chat", label: "AI Dispatch", icon: Bot, badge: "NLP" },
  { id: "map", label: "Command Center Map", icon: MapPin, badge: null },
  { id: "incidents", label: "Incident Log", icon: History, badge: "LOG" },
];

export default function Navbar({
  activeTab,
  onTabChange,
  hospitals = [],
  onReset,
  resetting = false,
  wsStatus = "connected",
}) {
  const [timeStr, setTimeStr] = useState("");
  const [utcStr, setUtcStr] = useState("");
  const [soundOn, setSoundOn] = useState(isAudioEnabled());

  // Live ticking tactical mission clock
  useEffect(() => {
    function updateClock() {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString("en-GB", { hour12: false }));
      setUtcStr(now.toTimeString().slice(9, 17) || "IST");
    }
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  const safeHospitals = Array.isArray(hospitals) ? hospitals : [];
  const beds = safeHospitals.reduce(
    (total, hospital) => total + (hospital?.available_beds || 0),
    0
  );
  const totalBeds = safeHospitals.reduce(
    (total, hospital) => total + (hospital?.total_beds || 0),
    0
  );

  const isConnected = wsStatus === "connected";
  const isReconnecting = wsStatus === "reconnecting" || wsStatus === "connecting";

  const handleSoundToggle = () => {
    const nextState = toggleAudio();
    setSoundOn(nextState);
    if (nextState) {
      playTacticalClick();
    }
  };

  const handleTabClick = (tabId) => {
    if (soundOn) playTacticalClick();
    onTabChange(tabId);
  };

  return (
    <header className="topbar" role="banner">
      {/* Brand & System Callout */}
      <div className="brand">
        <div className="brand-mark" aria-hidden="true">
          <Shield size={20} />
          <span className="brand-pulse-dot" />
        </div>
        <div className="brand-text">
          <div className="brand-title">
            <strong>CRISIS-GRID</strong>
            <span className="version-tag">v2.0 HUD</span>
          </div>
          <span className="brand-sub">// EMERGENCY RESOURCE ALLOCATOR</span>
        </div>
      </div>

      {/* Live Mission Clock */}
      <div className="mission-clock" title="Mission Operational Time (Local / UTC)">
        <Clock size={13} className="clock-icon" />
        <span className="clock-time">{timeStr || "--:--:--"}</span>
        <span className="clock-zone">{utcStr}</span>
      </div>

      {/* Primary Navigation Tabs */}
      <nav className="tab-nav" aria-label="Command Center Navigation">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              className={`tab ${isActive ? "active" : ""}`}
              onClick={() => handleTabClick(tab.id)}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon size={14} className="tab-icon" />
              <span>{tab.label}</span>
              {tab.badge && <span className="tab-badge">{tab.badge}</span>}
            </button>
          );
        })}
      </nav>

      {/* Tactical Status & Audio Controls */}
      <div className="header-actions">
        {/* Sound Toggle */}
        <button
          type="button"
          className={`sound-toggle ${soundOn ? "active" : ""}`}
          onClick={handleSoundToggle}
          title={soundOn ? "Tactical Audio: ON (Click to Mute)" : "Tactical Audio: MUTED (Click to Enable)"}
          aria-label={soundOn ? "Mute tactical audio" : "Enable tactical audio"}
        >
          {soundOn ? <Volume2 size={15} /> : <VolumeX size={15} />}
          <span className="sound-text">{soundOn ? "AUDIO: ON" : "MUTED"}</span>
        </button>

        {/* Global Bed Counter */}
        <div className="stat bed-stat" title="Total Available Regional Beds">
          <Database size={14} />
          <div className="stat-values">
            <b>{beds}</b>
            <small>/{totalBeds}</small>
          </div>
          <span className="stat-label">BEDS OPEN</span>
        </div>

        {/* WebSocket Telemetry Status */}
        <div
          className={`stat status-indicator-pill ${
            isConnected ? "active" : isReconnecting ? "syncing" : "offline"
          }`}
          title={`WebSocket Telemetry Stream: ${
            isConnected ? "Active Broadcast" : isReconnecting ? "Reconnecting" : "Disconnected"
          }`}
        >
          <Radio
            size={13}
            className={isConnected ? "live-icon" : isReconnecting ? "spin" : ""}
          />
          <span className="status-text">
            {isConnected ? "LIVE" : isReconnecting ? "SYNC" : "OFFLINE"}
          </span>
        </div>

        {/* Reset Action */}
        <button
          className="reset-button"
          onClick={() => {
            if (soundOn) playTacticalClick();
            onReset();
          }}
          disabled={resetting}
          title="Reset in-memory hospital bed capacities to baseline"
        >
          <RotateCcw size={14} className={resetting ? "spin" : ""} />
          <span>{resetting ? "SYNCING..." : "RESET GRID"}</span>
        </button>
      </div>
    </header>
  );
}

