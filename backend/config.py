from urllib.parse import quote_plus
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── App ───────────────────────────────────────────────────────────────────
    APP_NAME: str = "Disaster Intelligence Platform"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # ── MongoDB ───────────────────────────────────────────────────────────────
    MONGO_USERNAME: str
    MONGO_PASSWORD: str
    MONGO_CLUSTER: str = "cluster0.4rxlvbl.mongodb.net"
    MONGO_APP_NAME: str = "Cluster0"
    DB_NAME: str = "Disaster-Intelligence-Platform"

    @property
    def MONGO_URI(self) -> str:
        username = quote_plus(self.MONGO_USERNAME)
        password = quote_plus(self.MONGO_PASSWORD)

        return (
            f"mongodb+srv://{username}:{password}"
            f"@{self.MONGO_CLUSTER}/?appName={self.MONGO_APP_NAME}"
        )

    # ── Collections ───────────────────────────────────────────────────────────
    INCIDENTS_COLLECTION: str = "incidents"
    ANALYTICS_COLLECTION: str = "analytics"

    # ── Model Paths ───────────────────────────────────────────────────────────
    SAVED_MODELS_DIR: str = "saved_models"
    DISASTER_CLASSIFIER: str = "saved_models/disaster_classifier.pkl"
    SEVERITY_MODEL: str = "saved_models/severity_model.pkl"
    SEVERITY_LABEL_ENCODER: str = "saved_models/severity_label_encoder.pkl"
    RISK_MODEL: str = "saved_models/risk_model.pkl"
    RISK_LE_DISASTER: str = "saved_models/risk_le_disaster.pkl"
    RISK_LE_SEVERITY: str = "saved_models/risk_le_severity.pkl"
    SENTENCE_TRANSFORMER: str = "saved_models/sentence_transformer"

    # ── CORS ──────────────────────────────────────────────────────────────────
    ALLOWED_ORIGINS: list = ["http://localhost:5173", "http://localhost:3000"]

    class Config:
        env_file = ".env"


settings = Settings()