from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

from models.inference import run_inference
from preprocessing.clean_text import clean_text
from preprocessing.ner import get_primary_location
from preprocessing.feature_engineering import validate_weather
from database.mongodb import save_incident

router = APIRouter()

class WeatherRequest(BaseModel):
    rainfall_mm: float
    humidity_percent: float
    wind_speed_kmph: float
    temperature_c: float
    aqi: Optional[float] = None 


# ── Request Schema ────────────────────────────────────────────────────────────
class IncidentRequest(BaseModel):
    incident_text: str = Field(..., min_length=10)

    weather: WeatherRequest

    latitude: Optional[float] = Field(
        None, description="GPS latitude from user device"
    )
    longitude: Optional[float] = Field(
        None, description="GPS longitude from user device"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "incident_text": "Heavy rainfall since morning. Water entered nearby houses.",
                "weather": {
                    "rainfall_mm": 250,
                    "humidity_percent": 98,
                    "wind_speed_kmph": 90,
                    "temperature_c": 35,
                    "aqi": 320
                },
                "latitude": 28.6139,
                "longitude": 77.2090
            }
        }


# ── Response Schema ───────────────────────────────────────────────────────────
class IncidentResponse(BaseModel):
    incident_id:       str
    disaster_type:     str
    confidence:        float
    severity:          str
    risk_score:        float
    location:          dict
    weather:           dict
    recommendations:   list
    timestamp:         str


# ── Basic Recommendations (Phase 2) ──────────────────────────────────────────
# Full recommendation_engine.py plugged in Phase 3
RECOMMENDATIONS = {
    "Flood": [
        "Move to higher ground immediately.",
        "Avoid walking or driving through floodwaters.",
        "Disconnect electricity at the main switch.",
        "Contact emergency services: 112.",
        "Prepare an emergency kit with essentials.",
    ],
    "Earthquake": [
        "Drop, cover, and hold on.",
        "Stay away from windows and heavy furniture.",
        "Do not use elevators.",
        "Check for gas leaks after shaking stops.",
        "Move to open ground away from buildings.",
    ],
    "Wildfire": [
        "Evacuate immediately if instructed.",
        "Close all windows and doors.",
        "Cover vents to prevent ember entry.",
        "Wear N95 mask to avoid smoke inhalation.",
        "Follow designated evacuation routes only.",
    ],
    "Cyclone": [
        "Move to a sturdy shelter immediately.",
        "Stay away from coastal areas.",
        "Secure loose outdoor objects.",
        "Keep emergency supplies ready.",
        "Monitor official weather updates.",
    ],
    "Landslide": [
        "Evacuate the area immediately.",
        "Avoid river valleys and low-lying areas.",
        "Watch for flooding which can follow landslides.",
        "Do not return until authorities declare it safe.",
        "Contact local disaster management: 1078.",
    ],
    "Tsunami": [
        "Move inland and to higher ground immediately.",
        "Do not wait for official warning if you feel earthquake near coast.",
        "Stay away from the beach.",
        "Keep moving until you reach high ground.",
        "Listen to emergency broadcasts.",
    ],
    "Chemical Leak": [
        "Evacuate the area upwind of the leak.",
        "Cover nose and mouth with wet cloth.",
        "Do not touch any spilled chemicals.",
        "Call emergency services: 112.",
        "Remove and bag contaminated clothing.",
    ],
    "Building Collapse": [
        "Call emergency services: 112 immediately.",
        "Do not enter the collapsed structure.",
        "Listen for sounds of trapped survivors.",
        "Keep the area clear for rescue teams.",
        "Provide first aid only if trained.",
    ],
}

DEFAULT_RECOMMENDATIONS = [
    "Stay calm and assess the situation.",
    "Contact emergency services: 112.",
    "Follow instructions from local authorities.",
    "Keep family members informed of your location.",
]


def get_recommendations(disaster_type: str) -> list:
    return RECOMMENDATIONS.get(disaster_type, DEFAULT_RECOMMENDATIONS)


# ── Predict Endpoint ──────────────────────────────────────────────────────────
@router.post("/predict", response_model=IncidentResponse)
async def predict_incident(request: IncidentRequest):
    """
    Main prediction endpoint.

    Takes incident text + optional GPS coordinates.
    Returns disaster type, severity, risk score, and recommendations.
    """

    # ── 1. Clean Text ─────────────────────────────────────────────────────────
    cleaned_text = clean_text(request.incident_text)
    if not cleaned_text:
        raise HTTPException(status_code=400, detail="Incident text could not be processed.")

    # ── 2. Extract Location ───────────────────────────────────────────────────
    gps = None
    if request.latitude and request.longitude:
        gps = {"lat": request.latitude, "lon": request.longitude}

    location_result = get_primary_location(request.incident_text, gps_fallback=gps)

    # ── 3. Build weather dict (Phase 2: neutral defaults, Phase 3: live API) ──
    weather = validate_weather(request.weather.model_dump())  # Use provided weather data

    # ── 4. Run Inference ──────────────────────────────────────────────────────
    try:
        result = run_inference(cleaned_text, weather)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model inference failed: {str(e)}")

    # ── 5. Get Recommendations ────────────────────────────────────────────────
    recommendations = get_recommendations(result["disaster_type"])

    # ── 6. Build Full Document ────────────────────────────────────────────────
    timestamp = datetime.utcnow().isoformat()

    incident_doc = {
        "incident_text":   request.incident_text,
        "cleaned_text":    cleaned_text,
        "disaster_type":   result["disaster_type"],
        "confidence":      result["confidence"],
        "severity":        result["severity"],
        "risk_score":      result["risk_score"],
        "location":        location_result,
        "weather":         weather,
        "recommendations": recommendations,
        "timestamp":       timestamp,
    }

    # ── 7. Save to MongoDB ────────────────────────────────────────────────────
    incident_id = await save_incident(incident_doc)

    return IncidentResponse(
        incident_id=incident_id,
        disaster_type=result["disaster_type"],
        confidence=result["confidence"],
        severity=result["severity"],
        risk_score=result["risk_score"],
        location=location_result,
        weather=weather,
        recommendations=recommendations,
        timestamp=timestamp,
    )