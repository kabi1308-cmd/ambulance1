import axios from "axios";

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api`,
  timeout: 8000,
});

export const fetchHospitals = async () => (await api.get("/hospitals")).data;
export const updateHospitalBeds = async (id, delta) =>
  (await api.post(`/hospitals/${id}/beds`, { delta })).data;
export const triggerSOS = async (
  lat,
  lng,
  symptoms = "",
  severity = 3,
  vitals = {}
) =>
  (
    await api.post("/allocate", {
      ambulance_lat: Number(lat),
      ambulance_lng: Number(lng),
      symptoms: String(symptoms || "").trim(),
      severity: Number(severity) || 3,
      vitals: vitals || {},
    })
  ).data;
export const resetHospitals = async () => (await api.post("/reset")).data;
export const parseDispatchText = async (text) =>
  (await api.post("/dispatch/parse", { text })).data;
