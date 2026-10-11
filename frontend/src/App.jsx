import { useEffect, useState } from "react";
import {
  fetchHospitals,
  parseDispatchText,
  resetHospitals,
  updateHospitalBeds,
} from "./api";
import Navbar from "./components/Navbar";
import HospitalAdmin from "./components/HospitalAdmin";
import AmbulanceSOS from "./components/AmbulanceSOS";
import CommandCenterMap from "./components/CommandCenterMap";
import TelemetryPanel from "./components/TelemetryPanel";
import AIChatAssistant from "./components/AIChatAssistant";
import { formatApiError } from "./utils/errorFormatter";

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

  useEffect(() => {
    fetchHospitals()
      .then(setHospitals)
      .catch((err) => setError(formatApiError(err, "Unable to connect to the command server.")))
      .finally(() => setLoading(false));

    const wsUrl = (import.meta.env.VITE_API_URL || "http://localhost:8000")
      .replace(/^http/, "ws")
      .replace(/\/api$/, "");

    let socket;
    try {
      socket = new WebSocket(`${wsUrl}/ws`);
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
    } catch (e) {
      // ignore connection error
    }

    return () => {
      if (socket) socket.close();
    };
  }, []);

  const changeBeds = async (id, delta) => {
    setUpdating(id);
    try {
      const response = await updateHospitalBeds(id, delta);
      setHospitals(response.updated_hospitals);
    } catch (err) {
      setError(formatApiError(err, "Bed update failed."));
    } finally {
      setUpdating(null);
    }
  };

  const reset = async () => {
    setResetting(true);
    try {
      setHospitals(await resetHospitals());
      setLastAllocation(null);
    } catch (err) {
      setError(formatApiError(err, "Reset failed."));
    } finally {
      setResetting(false);
    }
  };

  const allocate = (response, coords) => {
    setHospitals(response.updated_hospitals);
    setLastAllocation(response);
    setAmbulanceCoords(coords);
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
      />
      {error && (
        <button className="global-error" onClick={() => setError("")}>
          {String(error)} <span>×</span>
        </button>
      )}
      {loading ? (
        <main className="loading-screen">
          <div className="loader" />
          <span>CONNECTING TO RESOURCE GRID</span>
        </main>
      ) : (
        <main>
          {activeTab === "admin" && (
            <>
              <HospitalAdmin
                hospitals={hospitals}
                onBedChange={changeBeds}
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
        </main>
      )}
    </div>
  );
}
