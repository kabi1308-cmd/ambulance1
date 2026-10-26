import React from "react";
import { Route, Clock, Compass, ShieldCheck } from "lucide-react";

export default function RouteInfoCard({
  routeData,
  destinationName,
  isOsrmRoute = true,
  status = "EN ROUTE",
  geodesicKm = null,
  geodesicMins = null,
}) {
  if (!routeData) return null;

  return (
    <div className="route-info-box card-panel">
      <div className="route-header">
        <Route size={15} className="text-cyan" />
        <strong>ROUTING & ROAD TELEMETRY</strong>
        <span className={`routing-engine-badge ${isOsrmRoute ? "osrm" : "fallback"}`}>
          {isOsrmRoute ? "OSRM ROAD NETWORK" : "GEODESIC FALLBACK"}
        </span>
      </div>

      <div className="route-metrics">
        <div className="r-metric">
          <span className="r-label">DESTINATION HUB</span>
          <span className="r-val dest">{destinationName || "Receiving Hospital"}</span>
        </div>

        <div className="r-metric">
          <span className="r-label">OSRM ROAD DISTANCE</span>
          <span className="r-val">{routeData.distanceText}</span>
        </div>

        <div className="r-metric">
          <span className="r-label">ROAD DRIVING ETA</span>
          <span className="r-val highlight">{routeData.durationText}</span>
        </div>

        {geodesicKm !== null && (
          <div className="r-metric">
            <span className="r-label">GEODESIC BASELINE</span>
            <span className="r-val text-muted">{geodesicKm} km ({geodesicMins}m est.)</span>
          </div>
        )}

        <div className="r-metric">
          <span className="r-label">NAVIGATION ENGINE</span>
          <span className="r-val engine-tag">{isOsrmRoute ? "OSRM Public Routing" : "Haversine Straight-Line"}</span>
        </div>

        <div className="r-metric">
          <span className="r-label">DISPATCH STATUS</span>
          <span className="r-val highlight">{status}</span>
        </div>
      </div>

      <div className="traffic-note">
        <Clock size={12} />
        <span>
          {isOsrmRoute
            ? "Live driving path calculated along public road network via OSRM."
            : "ROAD ROUTE UNAVAILABLE: Displaying geodesic straight-line fallback path."}
        </span>
      </div>
    </div>
  );
}
