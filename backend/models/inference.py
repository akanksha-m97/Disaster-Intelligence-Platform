import numpy as np
import pandas as pd
import joblib
import os
from sentence_transformers import SentenceTransformer

# ── Paths ────────────────────────────────────────────────────────────────────
SAVE_DIR = "saved_models"

# ── Load All Models Once (at startup) ────────────────────────────────────────
embedder = None
disaster_clf = None
severity_clf = None
severity_le = None
severity_weather_scaler = None
risk_reg = None
risk_le_disaster = None
risk_le_severity = None

WEATHER_WEIGHT = 3.0

def load_models():
    global embedder
    global disaster_clf
    global severity_clf
    global severity_le
    global severity_weather_scaler
    global risk_reg
    global risk_le_disaster
    global risk_le_severity

    print("Loading models...")

    embedder = SentenceTransformer(os.path.join(SAVE_DIR, "sentence_transformer"))
    disaster_clf = joblib.load(os.path.join(SAVE_DIR, "disaster_classifier.pkl"))
    severity_clf = joblib.load(os.path.join(SAVE_DIR, "severity_model.pkl"))
    severity_le = joblib.load(os.path.join(SAVE_DIR, "severity_label_encoder.pkl"))
    severity_weather_scaler = joblib.load(
        os.path.join(SAVE_DIR, "severity_weather_scaler.pkl")
    )
    risk_reg = joblib.load(os.path.join(SAVE_DIR, "risk_model.pkl"))
    risk_le_disaster = joblib.load(os.path.join(SAVE_DIR, "risk_le_disaster.pkl"))
    risk_le_severity = joblib.load(os.path.join(SAVE_DIR, "risk_le_severity.pkl"))

    print("All models loaded successfully.")

# ── Main Inference Function ───────────────────────────────────────────────────
def run_inference(incident_text: str, weather: dict) -> dict:
    """
    Full prediction pipeline for a single incident report.

    Args:
        incident_text: Raw text from user (e.g. "Heavy rainfall near Sector 17")
        weather: Dict with keys:
                 rainfall_mm, humidity_percent, wind_speed_kmph,
                 temperature_c, aqi

    Returns:
        dict with disaster_type, confidence, severity, risk_score
    """

   # ── Step 1: Embed Text ────────────────────────────────────────────────────
    embedding = embedder.encode([incident_text])

    weather_features = np.array([[
        weather.get("rainfall_mm", 0),
        weather.get("humidity_percent", 0),
        weather.get("wind_speed_kmph", 0),
        weather.get("temperature_c", 0),
        weather.get("aqi", 0)
    ]])

    # Scale weather exactly like during training
    weather_scaled = severity_weather_scaler.transform(weather_features)
    weather_scaled = weather_scaled * WEATHER_WEIGHT
    
    # ── Step 2: Model 1 — Disaster Type ──────────────────────────────────────
    disaster_proba  = disaster_clf.predict_proba(embedding)[0]
    disaster_idx    = np.argmax(disaster_proba)
    disaster_type   = disaster_clf.classes_[disaster_idx]
    confidence      = float(round(disaster_proba[disaster_idx] * 100, 1))

    # ── Step 3: Model 2 — Severity ────────────────────────────────────────────
    severity_input = np.hstack((embedding, weather_scaled))
    severity_enc    = severity_clf.predict(severity_input)[0]
    severity        = severity_le.inverse_transform([severity_enc])[0]

    # ── Step 4: Model 3 — Risk Score ─────────────────────────────────────────
    d_enc = risk_le_disaster.transform([disaster_type])[0]
    s_enc = risk_le_severity.transform([severity])[0]

    input_row = pd.DataFrame([{
        "Disaster_Type_enc":  d_enc,
        "Severity_enc":       s_enc,
        "Rainfall_mm":        weather.get("rainfall_mm", 0),
        "Humidity_percent":   weather.get("humidity_percent", 0),
        "WindSpeed_kmph":     weather.get("wind_speed_kmph", 0),
        "Temperature_C":      weather.get("temperature_c", 0),
        "AQI":                weather.get("aqi", 0),
    }])

    risk_score = float(round(risk_reg.predict(input_row)[0], 1))
    risk_score = max(0.0, min(100.0, risk_score))  # clamp to 0–100

    return {
        "disaster_type": disaster_type,
        "confidence":    confidence,
        "severity":      severity,
        "risk_score":    risk_score
    }


# ── Test ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    load_models() 
    sample_text = "Heavy rainfall since morning. Water entered nearby houses. People are trapped near Sector 17."

    sample_weather = {
    "rainfall_mm": 250.0,
    "humidity_percent": 98.0,
    "wind_speed_kmph": 90.0,
    "temperature_c": 35.0,
    "aqi": 320.0

    }

    result = run_inference(sample_text, sample_weather)

    print("\n── Inference Result ──────────────────────────────")
    print(f"  Disaster Type : {result['disaster_type']} ({result['confidence']}% confidence)")
    print(f"  Severity      : {result['severity']}")
    print(f"  Risk Score    : {result['risk_score']} / 100")
    print("──────────────────────────────────────────────────")