from fastapi import APIRouter, HTTPException, Query
from datetime import datetime, timedelta
from typing import Optional
from database.mongodb import get_database
from config import settings

router = APIRouter()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _parse_dates(start_date: str, end_date: str):
    """Parse YYYY-MM-DD strings into datetime objects."""
    try:
        start = datetime.strptime(start_date, "%Y-%m-%d")
        end   = datetime.strptime(end_date,   "%Y-%m-%d") + timedelta(days=1)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")
    return start, end


def _base_match(start: datetime, end: datetime,
                disaster_type: Optional[str] = None,
                severity:      Optional[str] = None,
                location:      Optional[str] = None) -> dict:
    """Build a MongoDB $match stage from filter params."""
    match: dict = {"created_at": {"$gte": start, "$lt": end}}
    if disaster_type:
        match["disaster_type"] = disaster_type
    if severity:
        match["severity"] = severity
    if location:
        # Case-insensitive substring match on location.locations array
        match["location.locations"] = {"$regex": location, "$options": "i"}
    return match


def _empty_dashboard() -> dict:
    return {
        "total_reports":              0,
        "severity_breakdown":         {"high": 0, "medium": 0, "low": 0},
        "disaster_type_distribution": [],
        "reports_over_time":          [],
        "top_affected_areas":         [],
        "recent_summary":             [],
        "average_risk_score":         0.0,
    }


async def _get_avg_risk(col, match: dict) -> float:
    pipeline = [
        {"$match": match},
        {"$group": {"_id": None, "avg": {"$avg": "$risk_score"}}},
    ]
    result = await col.aggregate(pipeline).to_list(length=1)
    return round(result[0]["avg"], 1) if result else 0.0


# ── Reports-over-time grouping helpers ───────────────────────────────────────

def _time_group_stage(grouping: str) -> dict:
    """
    Returns the $group stage _id expression for daily / weekly / monthly.
    """
    if grouping == "monthly":
        return {
            "year":  {"$year":  "$created_at"},
            "month": {"$month": "$created_at"},
        }
    elif grouping == "weekly":
        # ISO week number
        return {
            "year": {"$isoWeekYear": "$created_at"},
            "week": {"$isoWeek":     "$created_at"},
        }
    else:  # daily (default)
        return {
            "year":  {"$year":        "$created_at"},
            "month": {"$month":       "$created_at"},
            "day":   {"$dayOfMonth":  "$created_at"},
        }


def _format_time_label(doc: dict, grouping: str) -> str:
    g = doc["_id"]
    if grouping == "monthly":
        return f"{g['year']}-{g['month']:02d}"
    elif grouping == "weekly":
        return f"{g['year']}-W{g['week']:02d}"
    else:
        return f"{g['year']}-{g['month']:02d}-{g['day']:02d}"


# ── Full Dashboard Analytics ──────────────────────────────────────────────────

@router.get("/analytics/dashboard")
async def get_dashboard(
    start_date:    str           = Query(default=None,    description="Start date YYYY-MM-DD"),
    end_date:      str           = Query(default=None,    description="End date YYYY-MM-DD"),
    time_grouping: str           = Query(default="daily", description="daily | weekly | monthly"),
    disaster_type: Optional[str] = Query(default=None),
    severity:      Optional[str] = Query(default=None),
    location:      Optional[str] = Query(default=None),
):
    """
    Single endpoint that drives the entire Analytics dashboard.

    Returns:
    - Summary card counts
    - Severity breakdown
    - Disaster type distribution with percentages
    - Reports over time (daily / weekly / monthly)
    - Top 5 affected areas
    - 10 most recent reports
    - Average risk score
    """
    # Default: last 30 days
    if not end_date:
        end_date   = datetime.utcnow().strftime("%Y-%m-%d")
    if not start_date:
        start_date = (datetime.utcnow() - timedelta(days=30)).strftime("%Y-%m-%d")

    start, end = _parse_dates(start_date, end_date)

    try:
        db    = get_database()
        col   = db[settings.INCIDENTS_COLLECTION]
        match = _base_match(start, end, disaster_type, severity, location)

        total = await col.count_documents(match)
        if total == 0:
            return _empty_dashboard()

        # ── 1. Severity Breakdown ─────────────────────────────────────────────
        severity_docs = await col.aggregate([
            {"$match": match},
            {"$group": {"_id": "$severity", "count": {"$sum": 1}}},
        ]).to_list(length=10)
        severity_map  = {s["_id"]: s["count"] for s in severity_docs}

        # ── 2. Disaster Type Distribution ─────────────────────────────────────
        type_docs = await col.aggregate([
            {"$match": match},
            {"$group": {"_id": "$disaster_type", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
        ]).to_list(length=20)
        type_dist = [
            {
                "disaster_type": d["_id"] or "Unknown",
                "count":         d["count"],
                "percentage":    round((d["count"] / total) * 100, 1),
            }
            for d in type_docs
        ]

        # ── 3. Reports Over Time ──────────────────────────────────────────────
        group_id  = _time_group_stage(time_grouping)
        time_docs = await col.aggregate([
            {"$match": match},
            {"$group": {"_id": group_id, "count": {"$sum": 1}}},
            {"$sort":  {"_id.year": 1, "_id.month": 1,
                         "_id.day":  1, "_id.week":  1}},
        ]).to_list(length=366)
        reports_over_time = [
            {"date": _format_time_label(d, time_grouping), "count": d["count"]}
            for d in time_docs
        ]

        # ── 4. Top Affected Areas ─────────────────────────────────────────────
        area_docs = await col.aggregate([
            {"$match": match},
            {"$unwind": "$location.locations"},
            {"$group": {"_id": "$location.locations", "count": {"$sum": 1}}},
            {"$sort":  {"count": -1}},
            {"$limit": 5},
        ]).to_list(length=5)
        top_areas = [
            {"area": a["_id"], "count": a["count"]}
            for a in area_docs if a["_id"]
        ]

        # Fallback: if location.locations isn't populated, try flat location field
        if not top_areas:
            area_docs2 = await col.aggregate([
                {"$match": match},
                {"$group": {"_id": "$location", "count": {"$sum": 1}}},
                {"$sort":  {"count": -1}},
                {"$limit": 5},
            ]).to_list(length=5)
            top_areas = [
                {"area": a["_id"] if isinstance(a["_id"], str) else str(a["_id"]), "count": a["count"]}
                for a in area_docs2 if a["_id"]
            ]

        # ── 5. Recent Reports Summary ─────────────────────────────────────────
        recent_docs = await col.find(
            match,
            {
                "disaster_type": 1, "severity": 1, "risk_score": 1,
                "location": 1, "created_at": 1,
            }
        ).sort("created_at", -1).limit(10).to_list(length=10)

        recent_summary = []
        for doc in recent_docs:
            loc = doc.get("location", {})
            if isinstance(loc, dict):
                locs = loc.get("locations", [])
                area = locs[0] if locs else loc.get("name", "Unknown")
            else:
                area = str(loc) if loc else "Unknown"

            recent_summary.append({
                "date":          doc["created_at"].strftime("%d %b %Y")
                                 if isinstance(doc.get("created_at"), datetime) else "N/A",
                "disaster_type": doc.get("disaster_type", "Unknown"),
                "location":      area,
                "severity":      doc.get("severity", "Unknown"),
                "risk_score":    round(doc.get("risk_score", 0), 1),
            })

        return {
            "total_reports":              total,
            "severity_breakdown": {
                "high":   severity_map.get("High",   0),
                "medium": severity_map.get("Medium", 0),
                "low":    severity_map.get("Low",    0),
            },
            "disaster_type_distribution": type_dist,
            "reports_over_time":          reports_over_time,
            "top_affected_areas":         top_areas,
            "recent_summary":             recent_summary,
            "average_risk_score":         await _get_avg_risk(col, match),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Analytics by Date Range (legacy / simple) ─────────────────────────────────

@router.get("/analytics/range")
async def get_analytics_by_range(
    start_date:    str           = Query(..., description="Start date YYYY-MM-DD"),
    end_date:      str           = Query(..., description="End date YYYY-MM-DD"),
    disaster_type: Optional[str] = Query(default=None),
    severity:      Optional[str] = Query(default=None),
    location:      Optional[str] = Query(default=None),
):
    """
    Lightweight filtered summary — used by external consumers.
    Redirects heavy logic to /analytics/dashboard.
    """
    start, end = _parse_dates(start_date, end_date)
    try:
        db    = get_database()
        col   = db[settings.INCIDENTS_COLLECTION]
        match = _base_match(start, end, disaster_type, severity, location)
        total = await col.count_documents(match)

        severity_docs = await col.aggregate([
            {"$match": match},
            {"$group": {"_id": "$severity", "count": {"$sum": 1}}},
        ]).to_list(length=10)
        severity_map = {s["_id"]: s["count"] for s in severity_docs}

        type_docs = await col.aggregate([
            {"$match": match},
            {"$group": {"_id": "$disaster_type", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
        ]).to_list(length=20)
        type_dist = [
            {
                "disaster_type": d["_id"] or "Unknown",
                "count":         d["count"],
                "percentage":    round((d["count"] / total) * 100, 1) if total else 0,
            }
            for d in type_docs
        ]

        return {
            "date_range":                 {"start": start_date, "end": end_date},
            "total_reports":              total,
            "severity_breakdown": {
                "high":   severity_map.get("High",   0),
                "medium": severity_map.get("Medium", 0),
                "low":    severity_map.get("Low",    0),
            },
            "disaster_type_distribution": type_dist,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── CSV Export Endpoint ───────────────────────────────────────────────────────

@router.get("/analytics/export")
async def export_analytics(
    start_date:    str           = Query(default=None),
    end_date:      str           = Query(default=None),
    disaster_type: Optional[str] = Query(default=None),
    severity:      Optional[str] = Query(default=None),
    location:      Optional[str] = Query(default=None),
    limit:         int           = Query(default=10000, le=50000),
):
    """
    Returns all incident records matching the current filters
    for CSV export. Columns:
    date, disaster_type, location, severity, risk_score,
    confidence, status, lat, lon, description
    """
    if not end_date:
        end_date   = datetime.utcnow().strftime("%Y-%m-%d")
    if not start_date:
        start_date = (datetime.utcnow() - timedelta(days=30)).strftime("%Y-%m-%d")

    start, end = _parse_dates(start_date, end_date)

    try:
        db    = get_database()
        col   = db[settings.INCIDENTS_COLLECTION]
        match = _base_match(start, end, disaster_type, severity, location)

        docs = await col.find(
            match,
            {
                "disaster_type": 1, "severity": 1, "risk_score": 1,
                "confidence": 1, "status": 1, "lat": 1, "lon": 1,
                "description": 1, "location": 1, "created_at": 1,
            }
        ).sort("created_at", -1).limit(limit).to_list(length=limit)

        rows = []
        for doc in docs:
            loc = doc.get("location", {})
            if isinstance(loc, dict):
                locs = loc.get("locations", [])
                area = locs[0] if locs else loc.get("name", "Unknown")
            else:
                area = str(loc) if loc else "Unknown"

            rows.append({
                "date":          doc["created_at"].strftime("%d %b %Y")
                                 if isinstance(doc.get("created_at"), datetime) else "N/A",
                "disaster_type": doc.get("disaster_type", ""),
                "location":      area,
                "severity":      doc.get("severity", ""),
                "risk_score":    round(doc.get("risk_score",  0), 1),
                "confidence":    round(doc.get("confidence",  0), 1),
                "status":        doc.get("status", ""),
                "lat":           doc.get("lat", ""),
                "lon":           doc.get("lon", ""),
                "description":   doc.get("description", ""),
            })

        return rows

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))