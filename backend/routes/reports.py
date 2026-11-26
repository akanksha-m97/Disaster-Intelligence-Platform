from fastapi import APIRouter, HTTPException, Query, Body
from typing import Optional
from datetime import datetime
from database.mongodb import (
    get_recent_incidents,
    get_incidents_by_disaster_type,
    get_high_risk_incidents,
    save_incident,
    save_notification,
)

router = APIRouter()


# ── Get Recent Incidents ──────────────────────────────────────────────────────
@router.get("/reports")
async def get_reports(limit: int = Query(20, ge=1, le=100)):
    """
    Fetch most recent incident reports.
    """
    try:
        incidents = await get_recent_incidents(limit=limit)
        return {
            "total":     len(incidents),
            "incidents": incidents,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Get Reports by Disaster Type ──────────────────────────────────────────────
@router.get("/reports/type/{disaster_type}")
async def get_reports_by_type(disaster_type: str):
    """
    Fetch incidents filtered by disaster type.
    e.g. /reports/type/Flood
    """
    valid_types = [
        "Flood", "Earthquake", "Wildfire", "Cyclone",
        "Landslide", "Tsunami", "Chemical Leak", "Building Collapse"
    ]
    if disaster_type not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid disaster type. Valid types: {valid_types}"
        )
    try:
        incidents = await get_incidents_by_disaster_type(disaster_type)
        return {
            "disaster_type": disaster_type,
            "total":         len(incidents),
            "incidents":     incidents,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Get High Risk Incidents ───────────────────────────────────────────────────
@router.get("/reports/high-risk")
async def get_high_risk(threshold: float = Query(75.0, ge=0, le=100)):
    """
    Fetch incidents with risk score above threshold.
    Default threshold: 75
    """
    try:
        incidents = await get_high_risk_incidents(threshold=threshold)
        return {
            "threshold": threshold,
            "total":     len(incidents),
            "incidents": incidents,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Submit Report ─────────────────────────────────────────────────────────────
@router.post("/reports", status_code=201)
async def submit_report(payload: dict = Body(...)):
    """
    Submit a disaster incident report directly.
    """
    try:
        incident_doc = {
            "incident_text": payload.get("description") or payload.get("incident_text") or "Disaster report submitted",
            "disaster_type": (payload.get("disaster_type") or payload.get("hazard_type") or "Hazard").capitalize(),
            "severity": (payload.get("severity") or "Medium").capitalize(),
            "risk_score": float(payload.get("risk_score") or 50.0),
            "location": payload.get("location") or {"name": payload.get("location_name", "Unknown Location")},
            "created_at": datetime.utcnow(),
        }
        if "lat" in payload:
            incident_doc["lat"] = payload["lat"]
        if "lon" in payload:
            incident_doc["lon"] = payload["lon"]

        incident_id = await save_incident(incident_doc)

        loc_str = payload.get("location_name") or "Reported Area"
        disaster_type = incident_doc["disaster_type"]
        severity = incident_doc["severity"]

        # Automatically generate notifications
        await save_notification({
            "title": f"New Report: {disaster_type}",
            "description": f"Incident submitted for {loc_str}: {incident_doc['incident_text'][:100]}",
            "disaster_type": disaster_type,
            "location": loc_str,
            "severity": severity,
            "source_type": "report",
            "source_id": incident_id,
            "read": False,
            "created_at": datetime.utcnow(),
        })

        if severity in ["Critical", "High"] or incident_doc["risk_score"] >= 70:
            await save_notification({
                "title": f"CRITICAL ALERT: {disaster_type} Warning",
                "description": f"Critical incident detected in {loc_str}. Immediate response initiated.",
                "disaster_type": disaster_type,
                "location": loc_str,
                "severity": "Critical" if severity == "Critical" else "High",
                "source_type": "alert",
                "source_id": incident_id,
                "read": False,
                "created_at": datetime.utcnow(),
            })

        return {
            "success": True,
            "incident_id": incident_id,
            "message": "Report submitted and processed successfully.",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
