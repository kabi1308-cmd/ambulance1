import L from "leaflet";

/**
 * Creates a Leaflet divIcon for a Hospital marker.
 * Supports Available (Green), Low (Amber), Full (Red), and Selected (Cyan pulse).
 */
export const createHospitalIcon = (color, beds, isSelected = false) => {
  const selectedClass = isSelected ? "selected-hospital-pin" : "";
  return L.divIcon({
    className: `custom-marker hospital-marker ${selectedClass}`,
    html: `
      <div class="marker-pin-wrap">
        ${isSelected ? '<div class="selected-pulse-ring"></div>' : ""}
        <div class="marker-pin" style="--marker-color:${color}">
          <span>${beds}</span>
        </div>
      </div>
    `,
    iconSize: [42, 52],
    iconAnchor: [21, 48],
    popupAnchor: [0, -44],
  });
};

/**
 * Creates a Leaflet divIcon for the Ambulance marker.
 */
export const createAmbulanceIcon = (heading = 0) => {
  return L.divIcon({
    className: "custom-marker ambulance-marker",
    html: `
      <div class="ambulance-radar" style="transform: rotate(${heading}deg)">
        <div class="ambulance-core">+</div>
      </div>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
    popupAnchor: [0, -20],
  });
};
