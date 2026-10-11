from __future__ import annotations

import json
from copy import deepcopy
from typing import Any

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from geopy.distance import geodesic

from ai.forecasting import forecast_bed_availability
from ai.nlp_dispatch import extract_dispatch_intent
from ai.triage_engine import triage_score

app = FastAPI(title="Crisis-Grid Emergency Resource Allocator", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DEFAULT_HOSPITALS: list[dict[str, Any]] = [
    {"id": "hosp-1", "name": "Chennai City Care Hospital", "lat": 13.0827, "lng": 80.2707, "total_beds": 20, "available_beds": 5, "specialties": {"ICU": 4, "Cath Lab": 2, "Burn Unit": 1, "Neuro ICU": 2, "Trauma": 3}},
    {"id": "hosp-2", "name": "Coimbatore Emergency Center", "lat": 11.0168, "lng": 76.9558, "total_beds": 15, "available_beds": 2, "specialties": {"ICU": 3, "Cath Lab": 2, "Burn Unit": 1, "Neuro ICU": 1, "Trauma": 3}},
    {"id": "hosp-3", "name": "Madurai Apex Trauma Institute", "lat": 9.9252, "lng": 78.1198, "total_beds": 10, "available_beds": 0, "specialties": {"ICU": 3, "Cath Lab": 1, "Burn Unit": 2, "Neuro ICU": 1, "Trauma": 5}},
    {"id": "hosp-4", "name": "Trichy Community Hospital", "lat": 10.7905, "lng": 78.7047, "total_beds": 25, "available_beds": 8, "specialties": {"ICU": 5, "Cath Lab": 3, "Burn Unit": 1, "Neuro ICU": 2, "Trauma": 3}},
]
hospitals = deepcopy(DEFAULT_HOSPITALS)


class PatientRequest(BaseModel):
    ambulance_lat: float = Field(..., ge=-90, le=90)
    ambulance_lng: float = Field(..., ge=-180, le=180)
    symptoms: str = ""
    severity: int = Field(default=3, ge=1, le=5)
    vitals: dict[str, Any] = Field(default_factory=dict)


class BedDelta(BaseModel):
    delta: int = Field(..., ge=-1, le=1)


class DispatchText(BaseModel):
    text: str


connected_clients: list[WebSocket] = []


def snapshot() -> list[dict[str, Any]]:
    enriched = []
    for hospital in hospitals:
        hospital_copy = deepcopy(hospital)
        hospital_copy["forecast"] = forecast_bed_availability(hospital)
        enriched.append(hospital_copy)
    return enriched


async def broadcast_updates():
    payload = json.dumps({"type": "update", "hospitals": snapshot()})
    for client in list(connected_clients):
        try:
            await client.send_text(payload)
        except Exception:
            connected_clients.remove(client)


def score_hospital(hospital: dict[str, Any], patient: PatientRequest, triage: dict[str, Any]) -> tuple[float, float, float, float]:
    distance_km = geodesic((patient.ambulance_lat, patient.ambulance_lng), (hospital["lat"], hospital["lng"])).km
    estimated_time_mins = (distance_km / 30.0) * 60.0
    specialty = triage["specialty_required"]
    specialty_capacity = hospital.get("specialties", {}).get(specialty, 0)
    availability_boost = 1.0 + (hospital["available_beds"] / max(hospital["total_beds"], 1))
    capacity_penalty = 0.0 if hospital["available_beds"] > 0 else 100.0
    specialty_penalty = 0.0 if specialty_capacity > 0 else 30.0
    severity_weight = 6.0 - triage["severity"]
    score = (estimated_time_mins * 0.45) + (capacity_penalty * 0.2) + (specialty_penalty * 0.75) + (10.0 / max(hospital["available_beds"], 1)) * severity_weight + (distance_km * 0.15) / availability_boost
    return score, distance_km, estimated_time_mins, specialty_capacity


@app.get("/api/hospitals")
def get_hospitals() -> list[dict[str, Any]]:
    return snapshot()


@app.post("/api/allocate")
async def allocate(patient: PatientRequest) -> dict[str, Any]:
    triage = triage_score({
        "symptoms": patient.symptoms,
        "severity": patient.severity,
        "vitals": patient.vitals,
    })
    eligible = [hospital for hospital in hospitals if hospital["available_beds"] > 0]
    if not eligible:
        raise HTTPException(status_code=400, detail="CRITICAL EMERGENCY: No available ICU beds within service radius.")

    scored: list[tuple[float, float, float, dict[str, Any]]] = []
    for hospital in eligible:
        score, distance_km, estimated_time_mins, specialty_capacity = score_hospital(hospital, patient, triage)
        if triage["specialty_required"] in hospital.get("specialties", {}) and hospital["specialties"][triage["specialty_required"]] > 0:
            score -= 25.0
        if hospital["available_beds"] <= 1:
            score += 10.0
        scored.append((score, distance_km, estimated_time_mins, hospital))

    _, distance_km, estimated_time_mins, selected = min(scored, key=lambda item: item[0])
    if selected["available_beds"] <= 0:
        raise HTTPException(status_code=400, detail="CRITICAL EMERGENCY: No available ICU beds within service radius.")

    selected["available_beds"] -= 1
    
    # Broadcast updated hospital state across WebSocket connections
    await broadcast_updates()

    req_spec = triage["specialty_required"]
    spec_avail = selected.get("specialties", {}).get(req_spec, 0)
    specialty_match = spec_avail > 0
    
    reason = (
        f"Optimal receiving facility selected based on patient severity level {triage['severity']} ({triage['triage_label']}), "
        f"proximity ({round(distance_km, 1)} km geodesic distance), bed capacity ({selected['available_beds']} beds open), "
        f"and {'specialty match (' + req_spec + ' unit available)' if specialty_match else 'general emergency/ICU capacity'}."
    )

    return {
        "allocated_hospital": deepcopy(selected),
        "distance_km": round(distance_km, 2),
        "estimated_time_mins": round(estimated_time_mins, 1),
        "allocation_score": round(min(scored, key=lambda item: item[0])[0], 2),
        "triage": triage,
        "specialty_match": specialty_match,
        "allocation_reason": reason,
        "updated_hospitals": snapshot(),
    }


@app.post("/api/hospitals/{hospital_id}/beds")
async def update_beds(hospital_id: str, change: BedDelta) -> dict[str, Any]:
    hospital = next((item for item in hospitals if item["id"] == hospital_id), None)
    if hospital is None:
        raise HTTPException(status_code=404, detail="Hospital not found.")
    hospital["available_beds"] = max(0, min(hospital["total_beds"], hospital["available_beds"] + change.delta))
    
    await broadcast_updates()
    return {"hospital": deepcopy(hospital), "updated_hospitals": snapshot()}


@app.post("/api/reset")
async def reset_hospitals() -> list[dict[str, Any]]:
    hospitals.clear()
    hospitals.extend(deepcopy(DEFAULT_HOSPITALS))
    await broadcast_updates()
    return snapshot()


@app.post("/api/dispatch/parse")
async def parse_dispatch(data: DispatchText) -> dict[str, Any]:
    extracted = extract_dispatch_intent(data.text)
    triage = triage_score({"symptoms": data.text, "severity": extracted["urgency"], "vitals": {}})
    allocation_payload = {
        "ambulance_lat": extracted["lat"],
        "ambulance_lng": extracted["lng"],
        "symptoms": data.text,
        "severity": extracted["urgency"],
        "vitals": {"spo2": 92, "pulse": 120},
    }
    result = await allocate(PatientRequest(**allocation_payload))
    return {"extracted": extracted, "triage": triage, "dispatch": result}


@app.websocket("/ws")
async def dispatch_ws(websocket: WebSocket):
    await websocket.accept()
    connected_clients.append(websocket)
    try:
        while True:
            payload = await websocket.receive_text()
            data = json.loads(payload)
            await websocket.send_json({
                "type": "stream",
                "ambulance": data,
                "eta": 12.5,
                "status": "en route",
                "hospitals": snapshot(),
            })
    except WebSocketDisconnect:
        connected_clients.remove(websocket)