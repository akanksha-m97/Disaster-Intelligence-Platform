import pandas as pd
import numpy as np
from preprocessing.clean_text import clean_text


# ── Weather Feature Validation & Defaults ─────────────────────────────────────
WEATHER_DEFAULTS = {
    "rainfall_mm":      0.0,
    "humidity_percent": 50.0,
    "wind_speed_kmph":  0.0,
    "temperature_c":    25.0,
    "aqi":              100.0,
}

WEATHER_BOUNDS = {
    "rainfall_mm":      (0,    500),
    "humidity_percent": (0,    100),
    "wind_speed_kmph":  (0,    300),
    "temperature_c":    (-50,  60),
    "aqi":              (0,    500),
}


def validate_weather(weather: dict) -> dict:
    """
    Fill missing weather keys with defaults and clamp values to valid bounds.

    Args:
        weather: Raw weather dict from API

    Returns:
        Cleaned weather dict
    """
    cleaned = {}
    for key, default in WEATHER_DEFAULTS.items():
        val = weather.get(key, default)
        try:
            val = float(val)
        except (TypeError, ValueError):
            val = default

        low, high = WEATHER_BOUNDS[key]
        cleaned[key] = max(low, min(high, val))  # clamp

    return cleaned


# ── Risk Model Input Builder ───────────────────────────────────────────────────
def build_risk_input(disaster_type: str, severity: str, weather: dict,
                     le_disaster, le_severity) -> pd.DataFrame:
    """
    Builds the feature row that Model 3 (risk regressor) expects.

    Args:
        disaster_type: Predicted disaster type string  (e.g. "Flood")
        severity:      Predicted severity string       (e.g. "High")
        weather:       Validated weather dict
        le_disaster:   Fitted LabelEncoder for disaster types
        le_severity:   Fitted LabelEncoder for severity

    Returns:
        Single-row DataFrame ready for risk_model.predict()
    """
    weather = validate_weather(weather)

    try:
        d_enc = le_disaster.transform([disaster_type])[0]
    except ValueError:
        d_enc = 0  # fallback for unseen label

    try:
        s_enc = le_severity.transform([severity])[0]
    except ValueError:
        s_enc = 0

    return pd.DataFrame([{
        "Disaster_Type_enc":  d_enc,
        "Severity_enc":       s_enc,
        "Rainfall_mm":        weather["rainfall_mm"],
        "Humidity_percent":   weather["humidity_percent"],
        "WindSpeed_kmph":     weather["wind_speed_kmph"],
        "Temperature_C":      weather["temperature_c"],
        "AQI":                weather["aqi"],
    }])


# ── Full Preprocessing Pipeline ───────────────────────────────────────────────
def preprocess_incident(incident_text: str) -> str:
    """
    Cleans raw incident text before passing to SentenceTransformer.

    Args:
        incident_text: Raw user input

    Returns:
        Cleaned text string
    """
    return clean_text(incident_text)


# ── Test ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    from sklearn.preprocessing import LabelEncoder

    # Mock label encoders (in real usage these are loaded from saved_models/)
    le_d = LabelEncoder()
    le_d.fit(["Building Collapse", "Chemical Leak", "Cyclone",
              "Earthquake", "Flood", "Landslide", "Tsunami", "Wildfire"])

    le_s = LabelEncoder()
    le_s.fit(["High", "Low", "Medium"])

    raw_weather = {
        "rainfall_mm":      120.0,
        "humidity_percent": 92.0,
        "wind_speed_kmph":  45.0,
        "temperature_c":    31.5,
        "aqi":              175.0
    }

    print("── Feature Engineering Test ──────────────────────────")

    # Text preprocessing
    raw_text = "Heavy rainfall since morning!! Water entered nearby houses. People TRAPPED near Sector 17."
    cleaned  = preprocess_incident(raw_text)
    print(f"\nRaw text    : {raw_text}")
    print(f"Cleaned text: {cleaned}")

    # Weather validation
    validated = validate_weather(raw_weather)
    print(f"\nRaw weather      : {raw_weather}")
    print(f"Validated weather: {validated}")

    # Risk model input
    risk_input = build_risk_input("Flood", "High", raw_weather, le_d, le_s)
    print(f"\nRisk model input:\n{risk_input.to_string(index=False)}")
    print("──────────────────────────────────────────────────────")