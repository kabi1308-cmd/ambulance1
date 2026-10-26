import { useEffect, useState } from "react";
import {
  fetchHospitals,
  parseDispatchText,
  resetHospitals,
  updateHospitalBeds,
  updateSpecialtyBeds,
} from "./api";
import Navbar from "./components/Navbar";
import HospitalAdmin from "./components/HospitalAdmin";
import AmbulanceSOS from "./components/AmbulanceSOS";
import CommandCenterMap from "./components/CommandCenterMap";
import TelemetryPanel from "./components/TelemetryPanel";
import AIChatAssistant from "./components/AIChatAssistant";
import IncidentLog from "./components/IncidentLog";
import { formatApiError } from "./utils/errorFormatter";

import CommandCenterHUD from "./components/CommandCenterHUD";

export default function App() {
  const [activeTab, setActiveTab] = useState("admin");
  const [hospitals, setHospitals] = useState([]);
  const [lastAllocation, setLastAllocation] = useState(null);
  const [ambulanceCoords, setAmbulanceCoords] = useState({
    lat: 13.06,
    lng: 80.25,
  });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState("");
  const [wsStatus, setWsStatus] = useState("connecting");

  useEffect(() => {
    fetchHospitals()
      .then((data) => {
        if (Array.isArray(data)) {
          setHospitals(data);
        }
      })
      .catch((err) => setError(formatApiError(err, "Unable to connect to the command server.")))
      .finally(() => setLoading(false));

    const wsUrl = (import.meta.env.VITE_API_URL || "http://localhost:8000")
      .replace(/^http/, "ws")
      .replace(/\/api$/, "");

    let socket = null;
    let reconnectTimer = null;
    let isUnmounted = false;
    let reconnectDelay = 1000;
    const maxDelay = 15000;

    function connect() {
      if (isUnmounted) return;
      setWsStatus((prev) => (prev === "connected" ? "reconnecting" : "connecting"));

      try {
        socket = new WebSocket(`${wsUrl}/ws`);

        socket.onopen = () => {
          if (isUnmounted) {
            socket.close();
            return;
          }
          setWsStatus("connected");
          reconnectDelay = 1000;
        };

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "update" && Array.isArray(data.hospitals)) {
              setHospitals(data.hospitals);
            }
          } catch (e) {
            // ignore parse error
          }
        };

        socket.onerror = () => {
          // Socket will fire onclose immediately
        };

        socket.onclose = () => {
          if (isUnmounted) return;
          setWsStatus("disconnected");
          reconnectTimer = setTimeout(() => {
            reconnectDelay = Math.min(reconnectDelay * 1.5, maxDelay);
            connect();
          }, reconnectDelay);
        };
      } catch (err) {
        if (isUnmounted) return;
        setWsStatus("disconnected");
        reconnectTimer = setTimeout(() => {
          reconnectDelay = Math.min(reconnectDelay * 1.5, maxDelay);
          connect();
        }, reconnectDelay);
      }
    }

    connect();

    return () => {
      isUnmounted = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (socket) {
        socket.onclose = null;
        socket.close();
      }
    };
  }, []);

  const changeBeds = async (id, delta) => {
    setUpdating(id);
    try {
      const response = await updateHospitalBeds(id, delta);
      if (response && Array.isArray(response.updated_hospitals)) {
        setHospitals(response.updated_hospitals);
      }
    } catch (err) {
      setError(formatApiError(err, "Bed update failed."));
    } finally {
      setUpdating(null);
    }
  };

  const changeSpecialtyBeds = async (id, specialty, delta) => {
    setUpdating(id);
    try {
      const response = await updateSpecialtyBeds(id, specialty, delta);
      if (response && Array.isArray(response.updated_hospitals)) {
        setHospitals(response.updated_hospitals);
      }
    } catch (err) {
      setError(formatApiError(err, "Specialty bed update failed."));
    } finally {
      setUpdating(null);
    }
  };

  const reset = async () => {
    setResetting(true);
    try {
      const data = await resetHospitals();
      if (Array.isArray(data)) {
        setHospitals(data);
      } else if (data && Array.isArray(data.updated_hospitals)) {
        setHospitals(data.updated_hospitals);
      }
      setLastAllocation(null);
    } catch (err) {
      setError(formatApiError(err, "Reset failed."));
    } finally {
      setResetting(false);
    }
  };

  const allocate = (response, coords) => {
    if (response && Array.isArray(response.updated_hospitals)) {
      setHospitals(response.updated_hospitals);
    }
    setLastAllocation(response);
    if (coords && typeof coords.lat === "number" && typeof coords.lng === "number") {
      setAmbulanceCoords(coords);
    }
  };

  const handleParsedDispatch = async (response, coords) => {
    allocate(response, coords);
  };

  return (
    <div className="app-shell">
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        hospitals={hospitals}
        onReset={reset}
        resetting={resetting}
        wsStatus={wsStatus}
      />
      {error && (
        <button className="global-error" onClick={() => setError("")} aria-label="Dismiss error notification">
          {String(error)} <span>×</span>
        </button>
      )}
      {loading ? (
        <main className="loading-screen">
          <div className="loader" />
          <span>CONNECTING TO RESOURCE GRID // TELEMETRY SYNC</span>
        </main>
      ) : (
        <main className="main-content">
          <CommandCenterHUD
            hospitals={hospitals}
            lastAllocation={lastAllocation}
            wsStatus={wsStatus}
            onNavigateToMap={() => setActiveTab("map")}
          />

          {activeTab === "admin" && (
            <>
              <HospitalAdmin
                hospitals={hospitals}
                onBedChange={changeBeds}
                onSpecialtyChange={changeSpecialtyBeds}
                updating={updating}
              />
              <TelemetryPanel hospitals={hospitals} />
            </>
          )}
          {activeTab === "sos" && (
            <AmbulanceSOS
              ambulanceCoords={ambulanceCoords}
              onCoordsChange={setAmbulanceCoords}
              onAllocation={allocate}
              onViewMap={() => setActiveTab("map")}
            />
          )}
          {activeTab === "chat" && (
            <AIChatAssistant
              onParsedDispatch={handleParsedDispatch}
              onViewMap={() => setActiveTab("map")}
            />
          )}
          {activeTab === "map" && (
            <CommandCenterMap
              hospitals={hospitals}
              ambulanceCoords={ambulanceCoords}
              lastAllocation={lastAllocation}
              onCoordsChange={setAmbulanceCoords}
            />
          )}
          {activeTab === "incidents" && <IncidentLog />}
        </main>
      )}
    </div>
  );
}
