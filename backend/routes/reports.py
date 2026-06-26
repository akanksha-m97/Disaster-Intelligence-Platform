from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from database.mongodb import (
    get_recent_incidents,
    get_incidents_by_disaster_type,
    get_high_risk_incidents,
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