from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
from config import settings

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
    db  = get_database()
    col = db[settings.INCIDENTS_COLLECTION]
    incident["created_at"] = datetime.utcnow()
    result = await col.insert_one(incident)
    return str(result.inserted_id)


async def get_recent_incidents(limit: int = 20) -> list:
    db     = get_database()
    col    = db[settings.INCIDENTS_COLLECTION]
    cursor = col.find().sort("created_at", -1).limit(limit)
    docs   = await cursor.to_list(length=limit)
    for doc in docs:
        doc["_id"] = str(doc["_id"])
    return docs


async def get_incidents_by_disaster_type(disaster_type: str) -> list:
    db     = get_database()
    col    = db[settings.INCIDENTS_COLLECTION]
    cursor = col.find({"disaster_type": disaster_type}).sort("created_at", -1)
    docs   = await cursor.to_list(length=100)
    for doc in docs:
        doc["_id"] = str(doc["_id"])
    return docs


async def get_high_risk_incidents(threshold: float = 75.0) -> list:
    db     = get_database()
    col    = db[settings.INCIDENTS_COLLECTION]
    cursor = col.find({"risk_score": {"$gte": threshold}}).sort("risk_score", -1)
    docs   = await cursor.to_list(length=100)
    for doc in docs:
        doc["_id"] = str(doc["_id"])
    return docs


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