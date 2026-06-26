import pandas as pd
import numpy as np
import joblib
import os
from sentence_transformers import SentenceTransformer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import classification_report, accuracy_score

# ── Paths ─────────────────────────────────────────────────────────────────────
DATASET_PATH     = "dataset/master_disaster_dataset.csv"
SAVE_DIR         = "saved_models"
TRANSFORMER_PATH = os.path.join(SAVE_DIR, "sentence_transformer")
os.makedirs(SAVE_DIR, exist_ok=True)

# ── 1. Load Data ──────────────────────────────────────────────────────────────
print("Loading dataset...")
df = pd.read_csv(DATASET_PATH)

# ── 2. Embed Text ─────────────────────────────────────────────────────────────
if os.path.exists(TRANSFORMER_PATH):
    print("Loading saved sentence transformer...")
    embedder = SentenceTransformer(TRANSFORMER_PATH)
else:
    print("Downloading sentence transformer...")
    embedder = SentenceTransformer("all-MiniLM-L6-v2")

print("Generating embeddings...")
X_embed = embedder.encode(
    df["Incident_Text"].tolist(),
    show_progress_bar=True,
    batch_size=64
)

# ── 3. Scale Weather Features ─────────────────────────────────────────────────
# KEY FIX 1: StandardScaler — weather features ka range (0-500) embedding range
# (-1 to 1) se bahut bada hai, jisse model unhe ignore karta tha.
# Scaling se dono same scale par aate hain → accuracy boost.
weather_cols = ["Rainfall_mm", "Humidity_percent", "WindSpeed_kmph", "Temperature_C", "AQI"]
weather_raw  = df[weather_cols].values

weather_scaler = StandardScaler()
X_weather_scaled = weather_scaler.fit_transform(weather_raw)

# KEY FIX 2: Weather features ko 3x upweight karo.
# Severity directly Rainfall/AQI/Humidity se decide hoti hai — text se zyada.
# Weight badhane se model inhe properly use karta hai.
WEATHER_WEIGHT = 3.0
X_weather_weighted = X_weather_scaled * WEATHER_WEIGHT

# Combine embeddings + weighted weather
X = np.hstack((X_embed, X_weather_weighted))

# ── 4. Encode Labels ──────────────────────────────────────────────────────────
le = LabelEncoder()
y_enc = le.fit_transform(df["Severity"])
print(f"Label mapping: {dict(zip(le.classes_, le.transform(le.classes_)))}")

# ── 5. Train / Test Split ─────────────────────────────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(
    X, y_enc, test_size=0.2, random_state=42, stratify=y_enc
)

# ── 6. Train ──────────────────────────────────────────────────────────────────
# KEY FIX 3: solver='saga' — large datasets ke liye best solver.
# max_iter=3000 — convergence guarantee.
# C=0.5 — slight regularization to prevent overfitting.
print("\nTraining Logistic Regression (improved)...")
clf = LogisticRegression(
    solver="saga",
    max_iter=3000,
    C=0.5,
    n_jobs=-1,
    random_state=42
)
clf.fit(X_train, y_train)

# ── 7. Evaluate ───────────────────────────────────────────────────────────────
y_pred = clf.predict(X_test)
print(f"\nAccuracy: {accuracy_score(y_test, y_pred):.4f}")
print("\nClassification Report:")
print(classification_report(y_test, y_pred, target_names=le.classes_))

# ── 8. Save ───────────────────────────────────────────────────────────────────
joblib.dump(clf,            os.path.join(SAVE_DIR, "severity_model.pkl"))
joblib.dump(le,             os.path.join(SAVE_DIR, "severity_label_encoder.pkl"))
joblib.dump(weather_scaler, os.path.join(SAVE_DIR, "severity_weather_scaler.pkl"))
print("\nSaved: severity_model.pkl | severity_label_encoder.pkl | severity_weather_scaler.pkl")

# ── 9. Quick Inference Test ───────────────────────────────────────────────────
sample_text    = "Heavy rainfall since morning. Water entered nearby houses. People are trapped near Sector 17."
sample_weather = np.array([[120.0, 90.0, 45.0, 32.0, 180.0]])   # Rainfall, Humidity, Wind, Temp, AQI

emb             = embedder.encode([sample_text])
weather_s       = weather_scaler.transform(sample_weather) * WEATHER_WEIGHT
sample_input    = np.hstack((emb, weather_s))

pred  = clf.predict(sample_input)[0]
proba = clf.predict_proba(sample_input)[0]

print(f"\nSample  : '{sample_text}'")
print(f"Predicted Severity : {le.inverse_transform([pred])[0]}  ({max(proba)*100:.1f}% confidence)")