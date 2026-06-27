from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
from config import settings
from utlis.geocoding import geocode_incident_location

# ── Client (initialized at startup) ──────────────────────────────────────────
client: AsyncIOMotorClient = None


def get_database():
    return client[settings.DB_NAME]


# ── Lifecycle ─────────────────────────────────────────────────────────────────
async def connect_db():
    global client
    client = AsyncIOMotorClient(settings.MONGO_URI)
    await client.admin.command("ping")
    print(f"Connected to MongoDB: {settings.DB_NAME}")


async def close_db():
    global client
    if client:
        client.close()
        print("MongoDB connection closed.")


# ── Incidents Collection ──────────────────────────────────────────────────────
async def save_incident(incident: dict) -> str:
    """
    Resolves and stores coordinates for every incident before saving.

    Coordinate resolution order
    ───────────────────────────
    1. NLP-geocoded location  — if the text description contained a real
       place name that was already resolved to lat/lon by geocode_incident_location,
       those values are used as-is.

    2. Browser GPS            — the frontend optionally sends
       ``gps_lat`` and ``gps_lon`` in the incident payload when the user
       granted location permission.  These are used as the fallback when
       geocoding did not produce coordinates.

    3. No coordinates         — if neither source is available the document
       is saved without lat/lon.  The Live Map will skip these markers
       rather than falling back to a hardcoded city centre.

    The internal "gps" source tag is never surfaced to users; the frontend
    normalizer maps it to "Unknown Location" in the UI.
    """
    db  = get_database()
    col = db[settings.INCIDENTS_COLLECTION]

    # Pull optional GPS coords supplied by the browser *before* geocoding
    # so they can serve as a fallback without being overwritten.
    gps_lat = incident.pop("gps_lat", None)
    gps_lon = incident.pop("gps_lon", None)

    # Enrich location object with geocoded lat/lon (NLP path).
    incident["location"] = await geocode_incident_location(
        incident.get("location")
    )

    # Determine the final flat lat/lon stored on the document.
    geocoded_lat = incident["location"].get("lat") if isinstance(incident.get("location"), dict) else None
    geocoded_lon = incident["location"].get("lon") if isinstance(incident.get("location"), dict) else None

    if geocoded_lat is not None and geocoded_lon is not None:
        # NLP geocoding succeeded — use those coordinates.
        incident["lat"] = geocoded_lat
        incident["lon"] = geocoded_lon
    elif gps_lat is not None and gps_lon is not None:
        # Fall back to browser GPS.
        try:
            incident["lat"] = float(gps_lat)
            incident["lon"] = float(gps_lon)
        except (TypeError, ValueError):
            pass  # Malformed GPS values — store without coords.

        # Record that the source was GPS so the location object stays honest,
        # but mark it so the frontend knows not to display it as a place name.
        if isinstance(incident.get("location"), dict):
            incident["location"]["source"] = "gps"
    # else: no coords at all — document saved without lat/lon.

    incident["created_at"] = datetime.utcnow()
    result = await col.insert_one(incident)
    return str(result.inserted_id)


def _serialize_doc(doc: dict) -> dict:
    """
    Normalize a raw MongoDB document for JSON output.

    - Converts ObjectId → str
    - Appends 'Z' to created_at so JavaScript's Date() parses it as UTC
      (without Z, JS treats the string as local time, making IST clocks
      show timestamps ~5.5 hours older than they really are)
    """
    doc["_id"] = str(doc["_id"])
    if "created_at" in doc and isinstance(doc["created_at"], datetime):
        # isoformat() → "2024-06-27T10:30:00.123456"  (no timezone info)
        # + "Z"        → "2024-06-27T10:30:00.123456Z" (JS reads as UTC ✓)
        doc["created_at"] = doc["created_at"].strftime("%Y-%m-%dT%H:%M:%S.") + \
                            f"{doc['created_at'].microsecond // 1000:03d}Z"
    return doc


async def get_recent_incidents(limit: int = 20) -> list:
    db     = get_database()
    col    = db[settings.INCIDENTS_COLLECTION]
    cursor = col.find().sort("created_at", -1).limit(limit)
    docs   = await cursor.to_list(length=limit)
    return [_serialize_doc(doc) for doc in docs]


async def get_incidents_by_disaster_type(disaster_type: str) -> list:
    db     = get_database()
    col    = db[settings.INCIDENTS_COLLECTION]
    cursor = col.find({"disaster_type": disaster_type}).sort("created_at", -1)
    docs   = await cursor.to_list(length=100)
    return [_serialize_doc(doc) for doc in docs]


async def get_high_risk_incidents(threshold: float = 75.0) -> list:
    db     = get_database()
    col    = db[settings.INCIDENTS_COLLECTION]
    cursor = col.find({"risk_score": {"$gte": threshold}}).sort("risk_score", -1)
    docs   = await cursor.to_list(length=100)
    return [_serialize_doc(doc) for doc in docs]


async def get_analytics_summary() -> dict:
    db  = get_database()
    col = db[settings.INCIDENTS_COLLECTION]

    total = await col.count_documents({})

    pipeline_avg = [{"$group": {"_id": None, "avg_risk": {"$avg": "$risk_score"}}}]
    avg_result   = await col.aggregate(pipeline_avg).to_list(length=1)
    avg_risk     = round(avg_result[0]["avg_risk"], 1) if avg_result else 0.0

    pipeline_disaster = [
        {"$group": {"_id": "$disaster_type", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    disaster_dist = await col.aggregate(pipeline_disaster).to_list(length=20)

    pipeline_severity = [{"$group": {"_id": "$severity", "count": {"$sum": 1}}}]
    severity_dist     = await col.aggregate(pipeline_severity).to_list(length=5)

    return {
        "total_incidents":       total,
        "average_risk_score":    avg_risk,
        "disaster_distribution": {d["_id"]: d["count"] for d in disaster_dist},
        "severity_distribution": {s["_id"]: s["count"] for s in severity_dist},
    }