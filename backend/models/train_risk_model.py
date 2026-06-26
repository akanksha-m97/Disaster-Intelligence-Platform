import pandas as pd
import numpy as np
import joblib
import os
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import mean_absolute_error, r2_score

# ── Paths ────────────────────────────────────────────────────────────────────
DATASET_PATH = "dataset/master_disaster_dataset.csv"
SAVE_DIR     = "saved_models"
os.makedirs(SAVE_DIR, exist_ok=True)

# ── 1. Load Data ─────────────────────────────────────────────────────────────
print("Loading dataset...")
df = pd.read_csv(DATASET_PATH)

# ── 2. Encode Categorical Columns ─────────────────────────────────────────────
le_disaster = LabelEncoder()
le_severity = LabelEncoder()

df["Disaster_Type_enc"] = le_disaster.fit_transform(df["Disaster_Type"])
df["Severity_enc"]      = le_severity.fit_transform(df["Severity"])

print(f"Disaster types: {dict(zip(le_disaster.classes_, le_disaster.transform(le_disaster.classes_)))}")
print(f"Severity types: {dict(zip(le_severity.classes_, le_severity.transform(le_severity.classes_)))}")

# ── 3. Features & Target ──────────────────────────────────────────────────────
# Note: No text used here — only disaster type, severity, and weather features
FEATURES = [
    "Disaster_Type_enc",
    "Severity_enc",
    "Rainfall_mm",
    "Humidity_percent",
    "WindSpeed_kmph",
    "Temperature_C",
    "AQI"
]

X = df[FEATURES]
y = df["RiskScore"]

print(f"\nFeatures: {FEATURES}")
print(f"Target range: {y.min():.1f} – {y.max():.1f}, mean: {y.mean():.1f}")

# ── 4. Train / Test Split ─────────────────────────────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# ── 5. Train ──────────────────────────────────────────────────────────────────
print("\nTraining Gradient Boosting Regressor...")
reg = GradientBoostingRegressor(
    n_estimators=300,
    max_depth=5,
    learning_rate=0.05,
    random_state=42
)
reg.fit(X_train, y_train)

# ── 6. Evaluate ───────────────────────────────────────────────────────────────
preds = reg.predict(X_test)
mae   = mean_absolute_error(y_test, preds)
r2    = r2_score(y_test, preds)

print(f"\nMAE : {mae:.2f}  (average error in risk score points)")
print(f"R²  : {r2:.4f}  (1.0 = perfect)")

# Feature importance
print("\nFeature Importances:")
for feat, imp in sorted(zip(FEATURES, reg.feature_importances_), key=lambda x: -x[1]):
    print(f"  {feat:<25} {imp:.4f}")

# ── 7. Save ───────────────────────────────────────────────────────────────────
joblib.dump(reg,        os.path.join(SAVE_DIR, "risk_model.pkl"))
joblib.dump(le_disaster, os.path.join(SAVE_DIR, "risk_le_disaster.pkl"))
joblib.dump(le_severity, os.path.join(SAVE_DIR, "risk_le_severity.pkl"))
print("\nSaved: risk_model.pkl + risk_le_disaster.pkl + risk_le_severity.pkl")

# ── 8. Quick Inference Test ───────────────────────────────────────────────────
# Simulating what inference.py will pass in after Models 1 & 2 run
sample = {
    "Disaster_Type": "Flood",
    "Severity":      "High",
    "Rainfall_mm":   120.0,
    "Humidity_percent": 90.0,
    "WindSpeed_kmph": 45.0,
    "Temperature_C":  32.0,
    "AQI":           180.0
}

disaster_enc = le_disaster.transform([sample["Disaster_Type"]])[0]
severity_enc = le_severity.transform([sample["Severity"]])[0]

input_row = pd.DataFrame([{
    "Disaster_Type_enc": disaster_enc,
    "Severity_enc":      severity_enc,
    "Rainfall_mm":       sample["Rainfall_mm"],
    "Humidity_percent":  sample["Humidity_percent"],
    "WindSpeed_kmph":    sample["WindSpeed_kmph"],
    "Temperature_C":     sample["Temperature_C"],
    "AQI":               sample["AQI"]
}])

risk_score = reg.predict(input_row)[0]
print(f"\nSample input : {sample}")
print(f"Predicted Risk Score: {risk_score:.1f} / 100")