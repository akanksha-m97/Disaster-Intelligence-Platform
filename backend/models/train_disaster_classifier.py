import pandas as pd
import numpy as np
import joblib
import os
from sentence_transformers import SentenceTransformer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score

# ── Paths ────────────────────────────────────────────────────────────────────
DATASET_PATH  = "dataset/master_disaster_dataset.csv"
SAVE_DIR      = "saved_models"
os.makedirs(SAVE_DIR, exist_ok=True)

# ── 1. Load Data ─────────────────────────────────────────────────────────────
print("Loading dataset...")
df = pd.read_csv(DATASET_PATH)

X_text = df["Incident_Text"].tolist()
y      = df["Disaster_Type"]

# ── 2. Embed Text ─────────────────────────────────────────────────────────────
print("Generating embeddings (this takes a minute on first run)...")
embedder = SentenceTransformer("all-MiniLM-L6-v2")
X = embedder.encode(X_text, show_progress_bar=True, batch_size=64)

# ── 3. Train / Test Split ─────────────────────────────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# ── 4. Train ──────────────────────────────────────────────────────────────────
print("\nTraining Logistic Regression classifier...")
clf = LogisticRegression(
    max_iter=1000,
    C=1.0,
    solver="lbfgs"
)
clf.fit(X_train, y_train)

# ── 5. Evaluate ───────────────────────────────────────────────────────────────
y_pred = clf.predict(X_test)
print(f"\nAccuracy: {accuracy_score(y_test, y_pred):.4f}")
print("\nClassification Report:")
print(classification_report(y_test, y_pred))

# ── 6. Save ───────────────────────────────────────────────────────────────────
joblib.dump(clf,      os.path.join(SAVE_DIR, "disaster_classifier.pkl"))
embedder.save(        os.path.join(SAVE_DIR, "sentence_transformer"))
print("\nSaved: disaster_classifier.pkl + sentence_transformer/")

# ── 7. Quick Inference Test ───────────────────────────────────────────────────
sample = "Heavy rainfall since morning. Water entered nearby houses. People are trapped near Sector 17."
emb    = embedder.encode([sample])
proba  = clf.predict_proba(emb)[0]
top    = np.argmax(proba)

print(f"\nSample: '{sample}'")
print(f"Predicted: {clf.classes_[top]} ({proba[top]*100:.1f}% confidence)")