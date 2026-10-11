import axios from "axios";

/**
 * Fetch road route between origin and destination using the public OSRM service.
 * OSRM API expects coordinates in [longitude, latitude] format.
 *
 * @param {{lat: number, lng: number}} origin
 * @param {{lat: number, lng: number}} destination
 * @returns {Promise<{
 *   success: boolean,
 *   coordinates: Array<[number, number]>, // Leaflet format: [lat, lng]
 *   distanceKm: number,
 *   durationMins: number,
 *   distanceText: string,
 *   durationText: string,
 *   isOsrmRoute: boolean
 * }>}
 */
export async function fetchOsrmRoute(origin, destination) {
  try {
    // OSRM URL format: /route/v1/driving/{lng1},{lat1};{lng2},{lat2}?overview=full&geometries=geojson
    const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;

    const response = await axios.get(url, { timeout: 8000 });

    if (
      response.data &&
      response.data.code === "Ok" &&
      response.data.routes &&
      response.data.routes.length > 0
    ) {
      const route = response.data.routes[0];
      const geojsonCoords = route.geometry.coordinates; // Array of [lng, lat]

      // Convert GeoJSON [lng, lat] -> Leaflet [lat, lng]
      const leafletCoords = geojsonCoords.map(([lng, lat]) => [lat, lng]);

      const distanceMeters = route.distance;
      const durationSeconds = route.duration;

      const distanceKm = Number((distanceMeters / 1000).toFixed(1));
      const durationMins = Math.ceil(durationSeconds / 60);

      return {
        success: true,
        coordinates: leafletCoords,
        distanceKm: distanceKm,
        durationMins: durationMins,
        distanceText: `${distanceKm} km`,
        durationText: `${durationMins} min`,
        isOsrmRoute: true,
      };
    } else {
      throw new Error("Invalid response status from OSRM");
    }
  } catch (error) {
    console.warn(
      "OSRM Road Routing Service unavailable or failed. Using geodesic fallback:",
      error.message || error
    );
    return fallbackGeodesicRoute(origin, destination);
  }
}

/**
 * Fallback route generator if OSRM service is unavailable or fails.
 */
export function fallbackGeodesicRoute(origin, destination) {
  const steps = 30;
  const coordinates = [];
  for (let i = 0; i <= steps; i++) {
    const ratio = i / steps;
    coordinates.push([
      origin.lat + (destination.lat - origin.lat) * ratio,
      origin.lng + (destination.lng - origin.lng) * ratio,
    ]);
  }

  const distKm = Number(
    calculateHaversineDistance(
      origin.lat,
      origin.lng,
      destination.lat,
      destination.lng
    ).toFixed(1)
  );
  const durMins = Math.ceil((distKm / 30) * 60); // standard 30 km/h baseline

  return {
    success: false,
    coordinates: coordinates,
    distanceKm: distKm,
    durationMins: durMins,
    distanceText: `${distKm} km`,
    durationText: `${durMins} min`,
    isOsrmRoute: false,
  };
}

function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
