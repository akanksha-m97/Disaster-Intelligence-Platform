from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from config import settings
from database.mongodb import connect_db, close_db
from models.inference import load_models
from routes import predict, reports, analytics


# ── Lifespan (startup + shutdown) ─────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print(f"Starting {settings.APP_NAME}...")
    await connect_db()
    load_models()
    print("All models loaded. API is ready.")
    yield
    # Shutdown
    await close_db()
    print("API shutdown complete.")


# ── App Init ──────────────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-Powered Disaster Intelligence Platform",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ────────────────────────────────────────────────────────────────────
app.include_router(predict.router,   prefix="/api/v1", tags=["Prediction"])
app.include_router(reports.router,   prefix="/api/v1", tags=["Reports"])
app.include_router(analytics.router, prefix="/api/v1", tags=["Analytics"])


# ── Health Check ──────────────────────────────────────────────────────────────
@app.get("/")
async def root():
    return {
        "app":     settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status":  "running",
    }


@app.get("/health")
async def health():
    return {"status": "ok"}