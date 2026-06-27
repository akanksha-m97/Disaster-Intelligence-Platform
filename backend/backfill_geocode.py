"""
backfill_geocode.py

One-time script: geocodes any EXISTING incident documents that don't yet
have lat/lon (i.e. everything saved before geocoding was added to
save_incident()). Run this once after deploying the geocoding update.

Save this file directly in backend/ (next to App.py).

Usage (run from inside the backend/ folder):
    python backfill_geocode.py

Respects Nominatim's free-tier rate limit (~1 req/sec) via geocode_with_delay.
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from config import settings
from utlis.geocoding import geocode_with_delay


async def backfill():
    client = AsyncIOMotorClient(settings.MONGO_URI)
    db     = client[settings.DB_NAME]
    col    = db[settings.INCIDENTS_COLLECTION]

    # Find docs missing lat/lon on their location field.
    cursor = col.find({
        "$or": [
            {"location.lat": {"$exists": False}},
            {"location.lon": {"$exists": False}},
        ]
    })
    docs = await cursor.to_list(length=None)
    print(f"Found {len(docs)} incidents missing coordinates.")

    updated, skipped = 0, 0

    for doc in docs:
        location_field = doc.get("location") or {}
        place_names = location_field.get("locations") or []
        primary_place = place_names[0] if place_names else ""

        if not primary_place:
            skipped += 1
            continue

        coords = await geocode_with_delay(primary_place, delay=1.0)

        await col.update_one(
            {"_id": doc["_id"]},
            {"$set": {
                "location.lat": coords["lat"],
                "location.lon": coords["lon"],
                "location.geocoded": coords["geocoded"],
            }}
        )
        updated += 1
        print(f"  [{updated}] {primary_place} -> ({coords['lat']}, {coords['lon']})")

    print(f"\nDone. Updated: {updated}, Skipped (no place name): {skipped}")
    client.close()


if __name__ == "__main__":
    asyncio.run(backfill())