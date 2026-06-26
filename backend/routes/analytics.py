from fastapi import APIRouter, HTTPException, Query
from datetime import datetime, timedelta
from database.mongodb import get_database
from config import settings

router = APIRouter()


# ── Full Dashboard Analytics ──────────────────────────────────────────────────
@router.get("/analytics/dashboard")
async def get_dashboard():
    """
    Returns all data needed for the analytics dashboard:
    - Total reports + severity breakdown
    - Disaster type distribution with percentages
    - Reports over time (daily)
    - Top affected areas
    - Recent reports summary
    """
    try:
        db  = get_database()
        col = db[settings.INCIDENTS_COLLECTION]

        total = await col.count_documents({})
        if total == 0:
            return _empty_dashboard()

        # ── Severity Counts ───────────────────────────────────────────────────
        severity_pipeline = [
            {"$group": {"_id": "$severity", "count": {"$sum": 1}}}
        ]
        severity_docs = await col.aggregate(severity_pipeline).to_list(length=10)
        severity_map  = {s["_id"]: s["count"] for s in severity_docs}

        high_count   = severity_map.get("High",   0)
        medium_count = severity_map.get("Medium", 0)
        low_count    = severity_map.get("Low",    0)

        # ── Disaster Type Distribution ────────────────────────────────────────
        type_pipeline = [
            {"$group": {"_id": "$disaster_type", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        type_docs = await col.aggregate(type_pipeline).to_list(length=20)
        type_dist = [
            {
                "disaster_type": d["_id"],
                "count":         d["count"],
                "percentage":    round((d["count"] / total) * 100, 1),
            }
            for d in type_docs
        ]

        # ── Reports Over Time (last 30 days, daily) ───────────────────────────
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        time_pipeline   = [
            {"$match": {"created_at": {"$gte": thirty_days_ago}}},
            {
                "$group": {
                    "_id": {
                        "year":  {"$year":  "$created_at"},
                        "month": {"$month": "$created_at"},
                        "day":   {"$dayOfMonth": "$created_at"},
                    },
                    "count": {"$sum": 1}
                }
            },
            {"$sort": {"_id.year": 1, "_id.month": 1, "_id.day": 1}}
        ]
        time_docs    = await col.aggregate(time_pipeline).to_list(length=31)
        reports_over_time = [
            {
                "date":  f"{d['_id']['year']}-{d['_id']['month']:02d}-{d['_id']['day']:02d}",
                "count": d["count"]
            }
            for d in time_docs
        ]

        # ── Top Affected Areas ────────────────────────────────────────────────
        area_pipeline = [
            {"$unwind": "$location.locations"},
            {"$group": {"_id": "$location.locations", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 5}
        ]
        area_docs = await col.aggregate(area_pipeline).to_list(length=5)
        top_areas = [
            {"area": a["_id"], "count": a["count"]}
            for a in area_docs if a["_id"]
        ]

        # ── Recent Reports Summary (last 10) ──────────────────────────────────
        recent_cursor = col.find(
            {},
            {
                "disaster_type": 1,
                "severity":      1,
                "risk_score":    1,
                "location":      1,
                "created_at":    1,
            }
        ).sort("created_at", -1).limit(10)

        recent_docs = await recent_cursor.to_list(length=10)
        recent_summary = [
            {
                "date":          doc["created_at"].strftime("%d %b %Y") if isinstance(doc.get("created_at"), datetime) else "N/A",
                "disaster_type": doc.get("disaster_type", "Unknown"),
                "location":      doc.get("location", {}).get("locations", ["Unknown"])[0] if doc.get("location", {}).get("locations") else "Unknown",
                "severity":      doc.get("severity", "Unknown"),
                "risk_score":    doc.get("risk_score", 0),
            }
            for doc in recent_docs
        ]

        return {
            "total_reports":      total,
            "severity_breakdown": {
                "high":   high_count,
                "medium": medium_count,
                "low":    low_count,
            },
            "disaster_type_distribution": type_dist,
            "reports_over_time":          reports_over_time,
            "top_affected_areas":         top_areas,
            "recent_summary":             recent_summary,
            "average_risk_score":         await _get_avg_risk(col),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Analytics by Date Range ───────────────────────────────────────────────────
@router.get("/analytics/range")
async def get_analytics_by_range(
    start_date: str = Query(..., description="Start date YYYY-MM-DD"),
    end_date:   str = Query(..., description="End date YYYY-MM-DD"),
):
    """
    Returns analytics filtered by date range.
    Matches the date picker in the dashboard.
    """
    try:
        start = datetime.strptime(start_date, "%Y-%m-%d")
        end   = datetime.strptime(end_date,   "%Y-%m-%d") + timedelta(days=1)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    try:
        db    = get_database()
        col   = db[settings.INCIDENTS_COLLECTION]
        match = {"created_at": {"$gte": start, "$lt": end}}

        total = await col.count_documents(match)

        severity_pipeline = [
            {"$match": match},
            {"$group": {"_id": "$severity", "count": {"$sum": 1}}}
        ]
        severity_docs = await col.aggregate(severity_pipeline).to_list(length=10)
        severity_map  = {s["_id"]: s["count"] for s in severity_docs}

        type_pipeline = [
            {"$match": match},
            {"$group": {"_id": "$disaster_type", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        type_docs = await col.aggregate(type_pipeline).to_list(length=20)
        type_dist = [
            {
                "disaster_type": d["_id"],
                "count":         d["count"],
                "percentage":    round((d["count"] / total) * 100, 1) if total else 0,
            }
            for d in type_docs
        ]

        return {
            "date_range": {"start": start_date, "end": end_date},
            "total_reports": total,
            "severity_breakdown": {
                "high":   severity_map.get("High",   0),
                "medium": severity_map.get("Medium", 0),
                "low":    severity_map.get("Low",    0),
            },
            "disaster_type_distribution": type_dist,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Helpers ───────────────────────────────────────────────────────────────────
async def _get_avg_risk(col) -> float:
    pipeline = [{"$group": {"_id": None, "avg": {"$avg": "$risk_score"}}}]
    result   = await col.aggregate(pipeline).to_list(length=1)
    return round(result[0]["avg"], 1) if result else 0.0


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