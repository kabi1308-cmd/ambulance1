from __future__ import annotations

import re
from typing import Any


def extract_dispatch_intent(raw_text: str) -> dict[str, Any]:
    text = (raw_text or "").strip()
    if not text:
        return {"lat": 13.0827, "lng": 80.2707, "urgency": 3, "specialty": "ICU", "confidence": 0.0}

    lowered = text.lower()
    urgency = 3

    if any(word in lowered for word in ["cardiac arrest", "severe chest pain", "stroke", "unresponsive", "shock"]):
        urgency = 5
    elif any(word in lowered for word in ["chest pain", "breathing difficulty", "seizure", "burn", "bleeding"]):
        urgency = 4
    elif any(word in lowered for word in ["pain", "injury", "dizziness"]):
        urgency = 3
    elif any(word in lowered for word in ["minor", "stable", "cold"]):
        urgency = 2

    specialty = "ICU"
    if any(word in lowered for word in ["heart", "chest pain", "cardiac", "stemi"]):
        specialty = "Cath Lab"
    elif any(word in lowered for word in ["burn", "fire", "scald"]):
        specialty = "Burn Unit"
    elif any(word in lowered for word in ["stroke", "head", "brain", "neurolog"]):
        specialty = "Neuro ICU"
    elif any(word in lowered for word in ["accident", "fracture", "bleeding", "trauma"]):
        specialty = "Trauma"

    lat_match = re.search(r"(?:lat(?:itude)?)\s*[:=]?\s*(-?\d+(?:\.\d+)?)", text, re.I)
    lng_match = re.search(r"(?:lng|lon(?:gitude)?)\s*[:=]?\s*(-?\d+(?:\.\d+)?)", text, re.I)

    lat, lng = None, None
    if lat_match and lng_match and lat_match.group(1) is not None and lng_match.group(1) is not None:
        try:
            cand_lat = float(lat_match.group(1))
            cand_lng = float(lng_match.group(1))
            if -90.0 <= cand_lat <= 90.0 and -180.0 <= cand_lng <= 180.0:
                lat, lng = cand_lat, cand_lng
        except (ValueError, TypeError):
            lat, lng = None, None

    # Fall back to city keyword mapping or default coordinates if coordinates missing/invalid
    if lat is None or lng is None:
        lat, lng = 13.0827, 80.2707
        location_keywords = {
            "guindy": (13.0094, 80.2183),
            "chennai": (13.0827, 80.2707),
            "coimbatore": (11.0168, 76.9558),
            "madurai": (9.9252, 78.1198),
            "trichy": (10.7905, 78.7047),
        }
        for key, coords in location_keywords.items():
            if key in lowered:
                lat, lng = coords
                break

    return {
        "lat": lat,
        "lng": lng,
        "urgency": urgency,
        "specialty": specialty,
        "confidence": 0.87,
        "raw_text": text,
    }