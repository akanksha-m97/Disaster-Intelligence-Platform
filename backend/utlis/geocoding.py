"""
utils/geocoding.py

Converts free-text location names (e.g. "Sector 17, Kurukshetra") into
lat/lon coordinates using the free OpenStreetMap Nominatim API.

Designed to be called once, at incident-save time, so the result can be
cached permanently on the MongoDB document. Do NOT call this on every
read (e.g. inside GET /reports) — Nominatim's usage policy caps free
requests at ~1 req/sec and expects a real User-Agent.
"""

import httpx
import asyncio
import logging

logger = logging.getLogger(__name__)

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"

# Required by Nominatim's usage policy — replace with your real app/contact.
HEADERS = {
    "User-Agent": "JalRakshakAI/1.0 (contact: your-email@example.com)"
}

# Used to bias results toward India and to keep a sane fallback if
# geocoding fails entirely (better than stacking every pin on one spot).
DEFAULT_LAT = 29.9695
DEFAULT_LON = 76.8783

# Simple in-memory cache so repeated place names within the same process
# don't re-hit the API (e.g. many reports from "Sector 17, Kurukshetra").
_geocode_cache: dict[str, tuple[float, float]] = {}


async def geocode_location(place_name: str) -> dict:
    """
    Resolve a place name string to {"lat": float, "lon": float}.
    Falls back to DEFAULT_LAT/DEFAULT_LON (with a small flag) if the
    lookup fails or the place name is empty/unresolvable.
    """
    if not place_name or not place_name.strip():
        return {"lat": DEFAULT_LAT, "lon": DEFAULT_LON, "geocoded": False}

    cache_key = place_name.strip().lower()
    if cache_key in _geocode_cache:
        lat, lon = _geocode_cache[cache_key]
        return {"lat": lat, "lon": lon, "geocoded": True}

    params = {
        "q": place_name,
        "format": "json",
        "limit": 1,
        "countrycodes": "in",  # bias to India; remove/adjust if needed
    }

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                NOMINATIM_URL, params=params, headers=HEADERS
            )
            resp.raise_for_status()
            results = resp.json()

        if results:
            lat = float(results[0]["lat"])
            lon = float(results[0]["lon"])
            _geocode_cache[cache_key] = (lat, lon)
            return {"lat": lat, "lon": lon, "geocoded": True}

        logger.warning(f"Geocoding returned no results for: {place_name}")
        return {"lat": DEFAULT_LAT, "lon": DEFAULT_LON, "geocoded": False}

    except Exception as e:
        logger.error(f"Geocoding failed for '{place_name}': {e}")
        return {"lat": DEFAULT_LAT, "lon": DEFAULT_LON, "geocoded": False}


async def geocode_incident_location(location_field: dict) -> dict:
    """
    Takes the incident's existing `location` dict (e.g.
    {"source": "text", "locations": ["Sector 17, Kurukshetra"]})
    and returns it enriched with lat/lon.

    Safe to call even if `location_field` is missing/malformed.
    """
    location_field = location_field or {}
    place_names = location_field.get("locations") or []
    primary_place = place_names[0] if place_names else ""

    coords = await geocode_location(primary_place)

    return {
        **location_field,
        "lat": coords["lat"],
        "lon": coords["lon"],
        "geocoded": coords["geocoded"],
    }


# ── Rate-limit-friendly batch helper (optional, for backfilling old docs) ───
async def geocode_with_delay(place_name: str, delay: float = 1.0) -> dict:
    """
    Same as geocode_location but waits `delay` seconds first.
    Use this in a backfill script that loops over many existing documents,
    so you don't hammer Nominatim's free tier (max ~1 req/sec).
    """
    await asyncio.sleep(delay)
    return await geocode_location(place_name)