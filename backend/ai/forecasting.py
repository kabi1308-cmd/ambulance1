from __future__ import annotations

from typing import Any


def forecast_bed_availability(hospital: dict[str, Any], discharge_velocity: float = 1.2, incoming_trend: float = 1.0) -> dict[str, Any]:
    available = float(hospital.get("available_beds", 0))
    total = float(hospital.get("total_beds", 1))
    utilization = (total - available) / total if total else 0.0

    raw_1h = available + discharge_velocity - incoming_trend
    raw_3h = available + (discharge_velocity * 2.5) - (incoming_trend * 1.8)
    raw_6h = available + (discharge_velocity * 5.0) - (incoming_trend * 2.8)

    def status_for(value: float) -> str:
        if value <= 1:
            return "High Risk of Capacity Strain"
        if value <= 4:
            return "Moderate Pressure"
        return "Stable Capacity"

    trend_1h = status_for(raw_1h)
    trend_3h = status_for(raw_3h)
    trend_6h = status_for(raw_6h)

    overall_risk = "High Risk of Capacity Strain" if utilization > 0.75 or raw_1h <= 2 else "Stable Capacity"

    # Rounded to non-negative whole numbers (integers) for UI display
    return {
        "current_utilization": round(utilization * 100, 1),
        "projected_1h": max(0, int(round(raw_1h))),
        "projected_3h": max(0, int(round(raw_3h))),
        "projected_6h": max(0, int(round(raw_6h))),
        "trend_1h": trend_1h,
        "trend_3h": trend_3h,
        "trend_6h": trend_6h,
        "risk_level": overall_risk,
    }