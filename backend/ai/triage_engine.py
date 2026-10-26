from __future__ import annotations

import re
from typing import Any

SPECIALTY_RULES = {
    "ICU": ["cardiac arrest", "stroke", "respiratory failure", "severe chest pain", "shock", "multi trauma"],
    "Cath Lab": ["acute chest pain", "heart attack", "stemi", "cardiac event", "coronary"],
    "Burn Unit": ["burn", "fire injury", "chemical burn", "scald"],
    "Neuro ICU": ["stroke", "seizure", "head trauma", "neurological deficit"],
    "Trauma": ["accident", "fracture", "bleeding", "multi trauma", "vehicle crash"],
}

SPECIALTY_ORDER = ["Neuro ICU", "Cath Lab", "Burn Unit", "Trauma", "ICU"]


def normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", (value or "")).strip().lower()


def estimate_severity(symptoms: str | None, vitals: dict[str, Any] | None, severity: int | None) -> int:
    score = int(severity or 1)
    text = normalize_text(symptoms or "")
    vital_map = (vitals or {})

    if text:
        if any(k in text for k in ["cardiac arrest", "respiratory failure", "stroke", "shock", "massive bleed"]):
            score = max(score, 5)
        elif any(k in text for k in ["acute chest pain", "severe pain", "difficulty breathing", "seizure"]):
            score = max(score, 4)
        elif any(k in text for k in ["burn", "fracture", "head injury", "dizziness"]):
            score = max(score, 3)

    pulse = vital_map.get("pulse")
    systolic = vital_map.get("systolic")
    oxygen = vital_map.get("spo2")
    temperature = vital_map.get("temperature")

    if isinstance(pulse, (int, float)) and pulse > 130:
        score = max(score, 4)
    if isinstance(systolic, (int, float)) and systolic < 90:
        score = max(score, 5)
    if isinstance(oxygen, (int, float)) and oxygen < 90:
        score = max(score, 5)
    if isinstance(temperature, (int, float)) and temperature > 39.5:
        score = max(score, 4)

    return max(1, min(5, score))


def infer_specialty(symptoms: str | None, severity: int | None) -> str:
    text = normalize_text(symptoms or "")
    if not text:
        return "ICU" if (severity or 1) >= 4 else "Trauma"

    for specialty in SPECIALTY_ORDER:
        keyword_list = SPECIALTY_RULES.get(specialty, [])
        if any(keyword in text for keyword in keyword_list):
            return specialty
    return "Trauma" if (severity or 1) >= 3 else "ICU"


def triage_score(patient: dict[str, Any]) -> dict[str, Any]:
    symptoms = patient.get("symptoms", "")
    vitals = patient.get("vitals", {}) or {}
    severity = estimate_severity(symptoms, vitals, patient.get("severity"))
    specialty = infer_specialty(symptoms, severity)
    return {
        "severity": severity,
        "specialty_required": specialty,
        "triage_label": {
            1: "Minor",
            2: "Low",
            3: "Moderate",
            4: "High",
            5: "Critical",
        }[severity],
    }
