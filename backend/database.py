from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

DB_PATH = Path(__file__).resolve().parent / "crisis_grid.db"


def get_connection(db_path: Path | str | None = None) -> sqlite3.Connection:
    target = str(db_path or DB_PATH)
    conn = sqlite3.connect(target, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    return conn


def init_db(default_hospitals: list[dict[str, Any]], db_path: Path | str | None = None) -> None:
    conn = get_connection(db_path)
    with conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS hospitals (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                lat REAL NOT NULL,
                lng REAL NOT NULL,
                total_beds INTEGER NOT NULL,
                available_beds INTEGER NOT NULL,
                specialties_json TEXT NOT NULL
            );
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS incidents (
                id TEXT PRIMARY KEY,
                timestamp TEXT NOT NULL,
                ambulance_id TEXT NOT NULL,
                ambulance_lat REAL NOT NULL,
                ambulance_lng REAL NOT NULL,
                symptoms TEXT NOT NULL,
                severity INTEGER NOT NULL,
                vitals_json TEXT NOT NULL,
                allocated_hospital_id TEXT NOT NULL,
                allocated_hospital_name TEXT NOT NULL,
                specialty_required TEXT NOT NULL,
                specialty_matched INTEGER NOT NULL,
                eta_mins REAL NOT NULL,
                distance_km REAL NOT NULL,
                status TEXT NOT NULL DEFAULT 'DISPATCHED'
            );
        """)

        # If hospitals table is empty, seed with defaults
        cursor = conn.execute("SELECT COUNT(*) AS cnt FROM hospitals")
        if cursor.fetchone()["cnt"] == 0:
            for hosp in default_hospitals:
                conn.execute(
                    """
                    INSERT INTO hospitals (id, name, lat, lng, total_beds, available_beds, specialties_json)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        hosp["id"],
                        hosp["name"],
                        hosp["lat"],
                        hosp["lng"],
                        hosp["total_beds"],
                        hosp["available_beds"],
                        json.dumps(hosp.get("specialties", {})),
                    ),
                )


def load_hospitals(db_path: Path | str | None = None) -> list[dict[str, Any]]:
    conn = get_connection(db_path)
    with conn:
        cursor = conn.execute(
            "SELECT id, name, lat, lng, total_beds, available_beds, specialties_json FROM hospitals ORDER BY id"
        )
        rows = cursor.fetchall()
        result = []
        for row in rows:
            result.append({
                "id": row["id"],
                "name": row["name"],
                "lat": row["lat"],
                "lng": row["lng"],
                "total_beds": row["total_beds"],
                "available_beds": row["available_beds"],
                "specialties": json.loads(row["specialties_json"]),
            })
        return result


def save_hospital(hospital: dict[str, Any], db_path: Path | str | None = None) -> None:
    conn = get_connection(db_path)
    with conn:
        conn.execute(
            """
            UPDATE hospitals
            SET available_beds = ?, specialties_json = ?
            WHERE id = ?
            """,
            (
                hospital["available_beds"],
                json.dumps(hospital.get("specialties", {})),
                hospital["id"],
            ),
        )


def reset_hospitals_db(default_hospitals: list[dict[str, Any]], db_path: Path | str | None = None) -> None:
    conn = get_connection(db_path)
    with conn:
        conn.execute("DELETE FROM hospitals")
        for hosp in default_hospitals:
            conn.execute(
                """
                INSERT INTO hospitals (id, name, lat, lng, total_beds, available_beds, specialties_json)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    hosp["id"],
                    hosp["name"],
                    hosp["lat"],
                    hosp["lng"],
                    hosp["total_beds"],
                    hosp["available_beds"],
                    json.dumps(hosp.get("specialties", {})),
                ),
            )


def log_incident(incident: dict[str, Any], db_path: Path | str | None = None) -> dict[str, Any]:
    conn = get_connection(db_path)
    inc_id = incident.get("id") or f"INC-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
    timestamp = incident.get("timestamp") or datetime.now(timezone.utc).isoformat()
    record = {
        "id": inc_id,
        "timestamp": timestamp,
        "ambulance_id": incident.get("ambulance_id", "AMB-07"),
        "ambulance_lat": incident.get("ambulance_lat", 13.0827),
        "ambulance_lng": incident.get("ambulance_lng", 80.2707),
        "symptoms": incident.get("symptoms", ""),
        "severity": incident.get("severity", 3),
        "vitals_json": json.dumps(incident.get("vitals", {})),
        "allocated_hospital_id": incident.get("allocated_hospital_id", ""),
        "allocated_hospital_name": incident.get("allocated_hospital_name", ""),
        "specialty_required": incident.get("specialty_required", "General"),
        "specialty_matched": 1 if incident.get("specialty_matched") else 0,
        "eta_mins": float(incident.get("eta_mins", 0.0)),
        "distance_km": float(incident.get("distance_km", 0.0)),
        "status": incident.get("status", "DISPATCHED"),
    }
    with conn:
        conn.execute(
            """
            INSERT OR REPLACE INTO incidents (
                id, timestamp, ambulance_id, ambulance_lat, ambulance_lng, symptoms,
                severity, vitals_json, allocated_hospital_id, allocated_hospital_name,
                specialty_required, specialty_matched, eta_mins, distance_km, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                record["id"],
                record["timestamp"],
                record["ambulance_id"],
                record["ambulance_lat"],
                record["ambulance_lng"],
                record["symptoms"],
                record["severity"],
                record["vitals_json"],
                record["allocated_hospital_id"],
                record["allocated_hospital_name"],
                record["specialty_required"],
                record["specialty_matched"],
                record["eta_mins"],
                record["distance_km"],
                record["status"],
            ),
        )
    return {
        **record,
        "vitals": incident.get("vitals", {}),
        "specialty_matched": bool(record["specialty_matched"]),
    }


def get_incidents(limit: int = 50, db_path: Path | str | None = None) -> list[dict[str, Any]]:
    conn = get_connection(db_path)
    with conn:
        cursor = conn.execute(
            """
            SELECT id, timestamp, ambulance_id, ambulance_lat, ambulance_lng, symptoms,
                   severity, vitals_json, allocated_hospital_id, allocated_hospital_name,
                   specialty_required, specialty_matched, eta_mins, distance_km, status
            FROM incidents
            ORDER BY timestamp DESC
            LIMIT ?
            """,
            (limit,),
        )
        rows = cursor.fetchall()
        incidents = []
        for r in rows:
            incidents.append({
                "id": r["id"],
                "timestamp": r["timestamp"],
                "ambulance_id": r["ambulance_id"],
                "ambulance_lat": r["ambulance_lat"],
                "ambulance_lng": r["ambulance_lng"],
                "symptoms": r["symptoms"],
                "severity": r["severity"],
                "vitals": json.loads(r["vitals_json"]),
                "allocated_hospital_id": r["allocated_hospital_id"],
                "allocated_hospital_name": r["allocated_hospital_name"],
                "specialty_required": r["specialty_required"],
                "specialty_matched": bool(r["specialty_matched"]),
                "eta_mins": r["eta_mins"],
                "distance_km": r["distance_km"],
                "status": r["status"],
            })
        return incidents


def update_incident_status(incident_id: str, status: str, db_path: Path | str | None = None) -> bool:
    conn = get_connection(db_path)
    with conn:
        cursor = conn.execute(
            "UPDATE incidents SET status = ? WHERE id = ?",
            (status, incident_id),
        )
        return cursor.rowcount > 0
