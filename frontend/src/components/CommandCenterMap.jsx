import React, { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import {
  Navigation,
  Crosshair,
  Maximize2,
  AlertTriangle,
  Info,
  LocateFixed,
} from "lucide-react";

import { createHospitalIcon, createAmbulanceIcon } from "../utils/leafletIcons";
import { fetchOsrmRoute } from "../utils/osrm";

import AmbulanceTracker from "./AmbulanceTracker";
import AllocationDecision from "./AllocationDecision";
import DispatchTimeline from "./DispatchTimeline";
import RouteInfoCard from "./RouteInfoCard";

/**
 * Controller sub-component inside MapContainer to dynamically handle
 * centering and fitting bounds on the Leaflet map instance.
 */
function MapController({ centerCommand, boundsCommand }) {
  const map = useMap();

  useEffect(() => {
    if (centerCommand && centerCommand.lat && centerCommand.lng) {
      map.panTo([centerCommand.lat, centerCommand.lng]);
      if (centerCommand.zoom) map.setZoom(centerCommand.zoom);
    }
  }, [centerCommand, map]);

  useEffect(() => {
    if (boundsCommand && boundsCommand.length > 0) {
      try {
        const bounds = L.latLngBounds(boundsCommand);
        map.fitBounds(bounds, { padding: [50, 50] });
      } catch (e) {
        console.warn("Failed to fit route bounds:", e);
      }
    }
  }, [boundsCommand, map]);

  return null;
}

export default function CommandCenterMap({
  hospitals,
  ambulanceCoords,
  lastAllocation,
  onCoordsChange,
}) {
  // Route & Simulation State
  const [routeCoords, setRouteCoords] = useState([]); // Array of [lat, lng]
  const [routeInfo, setRouteInfo] = useState(null);
  const [heading, setHeading] = useState(0);

  // Simulation Controls & Progress
  const [animIndex, setAnimIndex] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simSpeed, setSimSpeed] = useState(1);
  const [dispatchStatus, setDispatchStatus] = useState("STANDBY");
  const [currentAmbulancePos, setCurrentAmbulancePos] = useState(ambulanceCoords);

  // Map Navigation Signals
  const [centerCommand, setCenterCommand] = useState(null);
  const [boundsCommand, setBoundsCommand] = useState(null);

  // GPS / Location State
  const [geoLocating, setGeoLocating] = useState(false);
  const [geoError, setGeoError] = useState("");

  // Sync ambulance position if external props change while not actively simulating
  useEffect(() => {
    if (!isSimulating) {
      setCurrentAmbulancePos(ambulanceCoords);
    }
  }, [ambulanceCoords, isSimulating]);

  // Request OSRM Road Route when an Emergency Allocation occurs
  useEffect(() => {
    if (!lastAllocation) {
      setRouteCoords([]);
      setRouteInfo(null);
      setDispatchStatus("STANDBY");
      setIsSimulating(false);
      return;
    }

    const destHosp = lastAllocation.allocated_hospital;
    if (!destHosp) return;

    const origin = { lat: ambulanceCoords.lat, lng: ambulanceCoords.lng };
    const destination = { lat: destHosp.lat, lng: destHosp.lng };

    setDispatchStatus("EN ROUTE");
    setAnimIndex(0);

    let isMounted = true;

    fetchOsrmRoute(origin, destination).then((res) => {
      if (!isMounted) return;

      setRouteCoords(res.coordinates);
      setRouteInfo(res);
      setBoundsCommand(res.coordinates);
      setIsSimulating(true);
    });

    return () => {
      isMounted = false;
    };
  }, [lastAllocation]);

  // Simulation Timer (Moves Ambulance along OSRM Route points)
  useEffect(() => {
    if (!isSimulating || routeCoords.length <= 1) return;

    const intervalMs = Math.max(80, 700 / simSpeed);
    const timer = setInterval(() => {
      setAnimIndex((prev) => {
        const next = prev + 1;
        if (next >= routeCoords.length) {
          setIsSimulating(false);
          setDispatchStatus("ARRIVED");
          clearInterval(timer);
          return routeCoords.length - 1;
        }

        const currPt = routeCoords[next];
        const prevPt = routeCoords[next - 1];

        // Calculate heading angle for ambulance rotation
        if (currPt && prevPt) {
          const dLng = (currPt[1] - prevPt[1]) * (Math.PI / 180);
          const lat1 = prevPt[0] * (Math.PI / 180);
          const lat2 = currPt[0] * (Math.PI / 180);
          const y = Math.sin(dLng) * Math.cos(lat2);
          const x =
            Math.cos(lat1) * Math.sin(lat2) -
            Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
          const brng = (Math.atan2(y, x) * (180 / Math.PI) + 360) % 360;
          setHeading(brng);
        }

        setCurrentAmbulancePos({ lat: currPt[0], lng: currPt[1] });
        return next;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isSimulating, routeCoords, simSpeed]);

  // Compute Remaining Metrics during Simulation
  const totalPoints = routeCoords.length;
  const progressPercent =
    totalPoints > 1 ? (animIndex / (totalPoints - 1)) * 100 : 0;
  const remainingFraction =
    totalPoints > 1 ? (totalPoints - 1 - animIndex) / (totalPoints - 1) : 0;

  const remainingDistanceKm = routeInfo
    ? routeInfo.distanceKm * remainingFraction
    : null;
  const remainingDurationMins = routeInfo
    ? routeInfo.durationMins * remainingFraction
    : null;

  // Handler: Simulation Controls
  const toggleSimulation = () => {
    if (dispatchStatus === "ARRIVED") {
      setAnimIndex(0);
      setDispatchStatus("EN ROUTE");
      if (routeCoords.length > 0) {
        setCurrentAmbulancePos({
          lat: routeCoords[0][0],
          lng: routeCoords[0][1],
        });
      }
      setIsSimulating(true);
    } else {
      setIsSimulating(!isSimulating);
    }
  };

  const resetSimulation = () => {
    setAnimIndex(0);
    if (routeCoords.length > 0) {
      setCurrentAmbulancePos({
        lat: routeCoords[0][0],
        lng: routeCoords[0][1],
      });
    }
    setDispatchStatus("EN ROUTE");
    setIsSimulating(false);
  };

  // Map Controls
  const recenterAmbulance = () => {
    if (currentAmbulancePos) {
      setCenterCommand({
        lat: currentAmbulancePos.lat,
        lng: currentAmbulancePos.lng,
        zoom: 13,
        id: Date.now(),
      });
    }
  };

  const fitRoute = () => {
    if (routeCoords.length > 0) {
      setBoundsCommand([...routeCoords]);
    }
  };

  const handleUseCurrentLocation = () => {
    setGeoError("");
    if (!navigator.geolocation) {
      setGeoError("Browser geolocation is not supported on this browser.");
      return;
    }
    setGeoLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: Number(pos.coords.latitude.toFixed(4)),
          lng: Number(pos.coords.longitude.toFixed(4)),
        };
        onCoordsChange(coords);
        setCurrentAmbulancePos(coords);
        setCenterCommand({ ...coords, zoom: 13, id: Date.now() });
        setGeoLocating(false);
      },
      (err) => {
        setGeoLocating(false);
        setGeoError(
          "Location access denied or unavailable. Manual coordinates active."
        );
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const mapCenter = [currentAmbulancePos.lat || 11.1271, currentAmbulancePos.lng || 78.6569];

  return (
    <section className="view map-view google-command-center">
      {/* View Section Heading */}
      <div className="section-heading map-heading">
        <div>
          <p className="eyebrow">GEOSPATIAL DISPATCH COMMAND / REACT-LEAFLET ENGINE</p>
          <h1>Emergency Routing Command Center</h1>
        </div>
        <div className={`map-status ${lastAllocation ? "dispatching" : ""}`}>
          <span className="signal-dot" />{" "}
          {lastAllocation ? `ACTIVE DISPATCH / ${dispatchStatus}` : "AWAITING EMERGENCY SIGNAL"}
        </div>
      </div>

      {geoError && (
        <div className="geo-error-banner">
          <Info size={14} /> {geoError}
        </div>
      )}

      {/* Main Map & Command Controls Shell */}
      <div className="map-shell google-map-shell">
        <MapContainer
          center={mapCenter}
          zoom={8}
          scrollWheelZoom={true}
          className="leaflet-map"
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapController
            centerCommand={centerCommand}
            boundsCommand={boundsCommand}
          />

          {/* Render Hospital Markers */}
          {hospitals.map((h) => {
            const isSelected =
              lastAllocation?.allocated_hospital?.id === h.id;

            let color = "#34d399"; // Available
            if (h.available_beds === 0) color = "#fb7185"; // Full
            else if (h.available_beds <= 3) color = "#f59e0b"; // Low beds

            if (isSelected) color = "#22d3ee"; // Selected hospital highlight

            const icon = createHospitalIcon(color, h.available_beds, isSelected);

            return (
              <Marker
                key={h.id}
                position={[h.lat, h.lng]}
                icon={icon}
                zIndexOffset={isSelected ? 500 : 100}
              >
                <Popup>
                  <div style={{ color: "#07111f", padding: "4px", fontFamily: "sans-serif" }}>
                    <strong style={{ fontSize: "13px" }}>{h.name}</strong>
                    <br />
                    <span style={{ fontSize: "12px" }}>
                      Available Beds: <b>{h.available_beds}</b> / {h.total_beds}
                    </span>
                    <br />
                    <span style={{ fontSize: "11px", color: "#555" }}>
                      Lat: {h.lat} | Lng: {h.lng}
                    </span>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Render Ambulance Marker */}
          {currentAmbulancePos && currentAmbulancePos.lat && (
            <Marker
              position={[currentAmbulancePos.lat, currentAmbulancePos.lng]}
              icon={createAmbulanceIcon(heading)}
              zIndexOffset={1000}
            >
              <Popup>
                <div style={{ color: "#07111f", padding: "4px", fontFamily: "sans-serif" }}>
                  <strong>Ambulance AMB-07</strong>
                  <br />
                  <span>
                    Lat: {currentAmbulancePos.lat.toFixed(5)} | Lng: {currentAmbulancePos.lng.toFixed(5)}
                  </span>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Render OSRM Road Route Line */}
          {routeCoords.length > 0 && (
            <Polyline
              positions={routeCoords}
              pathOptions={{
                color: routeInfo?.isOsrmRoute ? "#06b6d4" : "#f59e0b",
                weight: 5,
                opacity: 0.9,
                dashArray: routeInfo?.isOsrmRoute ? null : "8, 8",
              }}
            />
          )}
        </MapContainer>

        {/* Map Command Action Toolbar */}
        <div className="map-toolbar">
          <button
            onClick={recenterAmbulance}
            className="toolbar-btn"
            title="Recenter Ambulance"
          >
            <Crosshair size={14} /> Recenter Unit
          </button>
          {routeCoords.length > 0 && (
            <button onClick={fitRoute} className="toolbar-btn" title="Fit Route Bounds">
              <Maximize2 size={14} /> Fit Route
            </button>
          )}
          <button
            onClick={handleUseCurrentLocation}
            className="toolbar-btn locate-btn"
            disabled={geoLocating}
            title="Use Browser GPS Location"
          >
            <LocateFixed size={14} />{" "}
            {geoLocating ? "Acquiring GPS..." : "Use Current Location"}
          </button>
        </div>

        {/* Legend Indicator */}
        <div className="map-legend">
          <span>
            <i className="legend-dot green" /> Available (&gt;3 beds)
          </span>
          <span>
            <i className="legend-dot amber" /> Low (1-3 beds)
          </span>
          <span>
            <i className="legend-dot red" /> Full (0 beds)
          </span>
          <span>
            <i className="legend-dot blue" /> Ambulance Unit
          </span>
        </div>
      </div>

      {/* Real-time Dispatch Cards Layout */}
      {lastAllocation && (
        <div className="dispatch-dashboard-grid">
          {/* Ambulance Tracker Panel */}
          <AmbulanceTracker
            status={dispatchStatus}
            currentCoords={currentAmbulancePos}
            destinationName={lastAllocation.allocated_hospital?.name}
            remainingDistanceKm={remainingDistanceKm}
            remainingDurationMins={remainingDurationMins}
            progressPercent={progressPercent}
            isSimulating={isSimulating}
            onToggleSimulation={toggleSimulation}
            onResetSimulation={resetSimulation}
            simulationSpeed={simSpeed}
            onChangeSpeed={setSimSpeed}
          />

          {/* OSRM Road Route Info Card */}
          <RouteInfoCard
            routeData={routeInfo}
            destinationName={lastAllocation.allocated_hospital?.name}
            isOsrmRoute={routeInfo?.isOsrmRoute}
            status={dispatchStatus}
          />

          {/* Allocation Decision Rationale Card */}
          <AllocationDecision allocation={lastAllocation} />

          {/* Dispatch Timeline Progress Card */}
          <DispatchTimeline status={dispatchStatus} allocation={lastAllocation} />
        </div>
      )}
    </section>
  );
}
