import asyncio
import httpx
from typing import Optional


# ── Open-Meteo API ────────────────────────────────────────────────────────────
# Free, no API key required. Takes lat/lon, returns live weather.
OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"
AQI_URL        = "https://air-quality-api.open-meteo.com/v1/air-quality"


# ── Fetch Live Weather ────────────────────────────────────────────────────────
async def fetch_weather(lat: float, lon: float) -> dict:
    """
    Fetch live weather data from Open-Meteo using lat/lon.

    Args:
        lat: Latitude  (from user GPS or NER-extracted location geocoded)
        lon: Longitude (from user GPS or NER-extracted location geocoded)

    Returns:
        Dict with keys matching Model 3 feature names:
        rainfall_mm, humidity_percent, wind_speed_kmph, temperature_c, aqi
    """
    params = {
        "latitude":                  lat,
        "longitude":                 lon,
        "current":                   [
            "temperature_2m",
            "relative_humidity_2m",
            "rain",
            "wind_speed_10m",
        ],
        "wind_speed_unit":           "kmh",
        "timezone":                  "auto",
        "forecast_days":             1,
    }

    aqi_params = {
        "latitude":  lat,
        "longitude": lon,
        "current":   ["us_aqi"],
        "timezone":  "auto",
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        # Fetch weather and AQI in parallel
        weather_resp, aqi_resp = await asyncio.gather(
            client.get(OPEN_METEO_URL, params=params),
            client.get(AQI_URL,        params=aqi_params),
        )

    weather_resp.raise_for_status()
    aqi_resp.raise_for_status()

    weather_data = weather_resp.json()
    aqi_data     = aqi_resp.json()

    current = weather_data.get("current", {})
    aqi_cur = aqi_data.get("current", {})

    return {
        "temperature_c":    current.get("temperature_2m",      25.0),
        "humidity_percent": current.get("relative_humidity_2m", 50.0),
        "rainfall_mm":      current.get("rain",                  0.0),
        "wind_speed_kmph":  current.get("wind_speed_10m",        0.0),
        "aqi":              aqi_cur.get("us_aqi",               100.0),
    }


# ── Geocode Location Name → lat/lon ──────────────────────────────────────────
async def geocode_location(location_name: str) -> Optional[dict]:
    """
    Convert a location name (from NER) to lat/lon using Open-Meteo Geocoding API.
    Falls back to None if location not found.

    Args:
        location_name: e.g. "Noida", "Sector 17", "Delhi"

    Returns:
        Dict with 'lat', 'lon', 'name' or None
    """
    url    = "https://geocoding-api.open-meteo.com/v1/search"
    params = {
        "name":     location_name,
        "count":    1,
        "language": "en",
        "format":   "json",
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url, params=params)

    resp.raise_for_status()
    data    = resp.json()
    results = data.get("results", [])

    if not results:
        return None

    top = results[0]
    return {
        "lat":  top["latitude"],
        "lon":  top["longitude"],
        "name": top.get("name", location_name),
    }


# ── Resolve lat/lon from NER locations or GPS ─────────────────────────────────
async def resolve_weather(ner_locations: list, gps: dict) -> dict:
    """
    Tries NER locations first (geocode each), falls back to GPS.

    Args:
        ner_locations: List of location strings from ner.py
        gps:           Dict with 'lat' and 'lon' from user device

    Returns:
        Weather dict ready for Model 3
    """
    # Try NER locations first
    for loc in ner_locations:
        coords = await geocode_location(loc)
        if coords:
            weather = await fetch_weather(coords["lat"], coords["lon"])
            weather["resolved_location"] = coords["name"]
            weather["source"]            = "ner"
            return weather

    # Fall back to GPS
    if gps and "lat" in gps and "lon" in gps:
        weather = await fetch_weather(gps["lat"], gps["lon"])
        weather["resolved_location"] = f"{gps['lat']}, {gps['lon']}"
        weather["source"]            = "gps"
        return weather

    # Last resort: return neutral defaults (no location available)
    return {
        "temperature_c":    25.0,
        "humidity_percent": 50.0,
        "rainfall_mm":       0.0,
        "wind_speed_kmph":   0.0,
        "aqi":             100.0,
        "resolved_location": "unknown",
        "source":            "default",
    }


# ── Test ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import asyncio

    async def test():
        print("── Weather API Test ──────────────────────────────────")

        # Test 1: Direct lat/lon (Delhi)
        print("\nTest 1: Direct lat/lon → Delhi")
        weather = await fetch_weather(28.6139, 77.2090)
        for k, v in weather.items():
            print(f"  {k}: {v}")

        # Test 2: Geocode location name
        print("\nTest 2: Geocode 'Noida'")
        coords = await geocode_location("Noida")
        print(f"  Resolved: {coords}")

        # Test 3: Full resolve pipeline
        print("\nTest 3: resolve_weather with NER locations + GPS fallback")
        result = await resolve_weather(
            ner_locations=["Sector 17", "Noida"],
            gps={"lat": 28.6139, "lon": 77.2090}
        )
        for k, v in result.items():
            print(f"  {k}: {v}")

        print("──────────────────────────────────────────────────────")

    asyncio.run(test())