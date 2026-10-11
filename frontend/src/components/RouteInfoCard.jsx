import React from "react";
import { Route, Clock } from "lucide-react";

export default function RouteInfoCard({ routeData, destinationName, isOsrmRoute, status = "EN ROUTE" }) {
  if (!routeData) return null;

  return (
    <div className="route-info-box card-panel">
      <div className="route-header">
        <Route size={15} className="text-cyan" />
        <strong>ROUTE STATUS</strong>
        <span className={`routing-engine-badge ${isOsrmRoute ? "osrm" : "fallback"}`}>
          {isOsrmRoute ? "OSRM ROAD ROUTE" : "GEODESIC FALLBACK"}
        </span>
      </div>

      <div className="route-metrics">
        <div className="r-metric">
          <span className="r-label">DESTINATION</span>
          <span className="r-val dest">{destinationName || "Receiving Hospital"}</span>
        </div>

        <div className="r-metric">
          <span className="r-label">DISTANCE</span>
          <span className="r-val">{routeData.distanceText}</span>
        </div>

        <div className="r-metric">
          <span className="r-label">ETA</span>
          <span className="r-val highlight">{routeData.durationText}</span>
        </div>

        <div className="r-metric">
          <span className="r-label">ROUTING</span>
          <span className="r-val highlight">{isOsrmRoute ? "OSRM ROAD ROUTE" : "GEODESIC FALLBACK"}</span>
        </div>

        <div className="r-metric">
          <span className="r-label">STATUS</span>
          <span className="r-val highlight">{status}</span>
        </div>
      </div>

      <div className="traffic-note">
        <Clock size={12} />
        <span>
          {isOsrmRoute
            ? "Real road routing provided by Open Source Routing Machine (OSRM)."
            : "ROAD ROUTE UNAVAILABLE. Operating with geodesic fallback visualization."}
        </span>
      </div>
    </div>
  );
}
