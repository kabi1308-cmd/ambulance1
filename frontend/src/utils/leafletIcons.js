import L from "leaflet";

/**
 * Creates an aerospace tactical Leaflet divIcon for a Hospital receiving facility.
 * Supports Available (Emerald), Low (Amber), Full (Crimson), and Selected (Cyan radar pulse).
 */
export const createHospitalIcon = (color, beds, isSelected = false) => {
  const selectedClass = isSelected ? "selected-hospital-pin" : "";
  const statusLabel = beds === 0 ? "FULL" : `${beds} BEDS`;
  
  return L.divIcon({
    className: `custom-marker hospital-marker ${selectedClass}`,
    html: `
      <div class="marker-pin-wrap">
        ${isSelected ? '<div class="selected-pulse-ring"></div><div class="target-bracket-reticle"></div>' : ""}
        <div class="marker-pin" style="--marker-color:${color}">
          <div class="pin-header">
            <svg class="med-cross" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6z"/>
            </svg>
          </div>
          <span class="pin-count">${beds}</span>
        </div>
        <div class="pin-callout" style="border-color:${color}; color:${color}">
          ${statusLabel}
        </div>
      </div>
    `,
    iconSize: [44, 56],
    iconAnchor: [22, 50],
    popupAnchor: [0, -48],
  });
};

/**
 * Creates an aerospace tactical Leaflet divIcon for the Ambulance unit.
 * Features directional heading arrow, pulsing radar rings, and unit callsign.
 */
export const createAmbulanceIcon = (heading = 0) => {
  return L.divIcon({
    className: "custom-marker ambulance-marker",
    html: `
      <div class="ambulance-wrap">
        <div class="ambulance-radar" style="transform: rotate(${heading}deg)">
          <div class="radar-sweep-cone"></div>
          <div class="ambulance-core">
            <svg class="heading-arrow" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="12,2 22,22 12,17 2,22"/>
            </svg>
          </div>
        </div>
        <div class="ambulance-callsign">AMB-07</div>
      </div>
    `,
    iconSize: [52, 52],
    iconAnchor: [26, 26],
    popupAnchor: [0, -24],
  });
};

