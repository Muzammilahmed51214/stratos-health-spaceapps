"""
Main entrypoint for StratosHealth FastAPI application.
Configures Google Gemini AI Reasoning Engine, CORS middleware for Next.js (localhost:3000),
database table initialization on startup, and REST API routing.
"""

import os
import logging
from pathlib import Path
from contextlib import asynccontextmanager
from dotenv import load_dotenv

# This forces Python to read your .env file
load_dotenv()

# Also ensure .env in the backend directory is explicitly loaded even if launched from another directory
backend_env = Path(__file__).resolve().parent / ".env"
if backend_env.exists():
    load_dotenv(dotenv_path=backend_env, override=True)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

import google.generativeai as genai

api_key = os.getenv("GEMINI_API_KEY", "").strip()
GEMINI_API_KEY = api_key
if not api_key or api_key == "your_gemini_api_key_here":
    print("[CRITICAL ERROR] GEMINI_API_KEY is missing! Using fallback incident commander.")
else:
    try:
        genai.configure(api_key=api_key)
        print("[SUCCESS] Google Gemini SDK successfully initialized.")
    except Exception as e:
        print(f"[WARNING] Could not initialize Google Gemini SDK: {e}")

from database import engine, Base, SessionLocal
import models
import routes
import services

logger = logging.getLogger("stratos.main")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan context manager.
    Initializes database schema and warms cache on startup.
    """
    logger.info("Initializing SQLite database tables...")
    Base.metadata.create_all(bind=engine)

    # Warm cache with initial wildfire and air quality telemetry
    db = SessionLocal()
    try:
        logger.info("Pre-warming telemetry cache...")
        await services.fetch_and_cache_fires(db=db, force_refresh=False)
        services.get_pacific_nw_air_quality(db=db)
    except Exception as ex:
        logger.warning(f"Cache pre-warm note: {ex}")
    finally:
        db.close()

    logger.info("StratosHealth Backend API is ready to accept connections.")
    yield
    logger.info("Shutting down StratosHealth Backend API...")


app = FastAPI(
    title="StratosHealth API",
    description=(
        "Live Emergency Response Air Quality & Wildfire Telemetry Command Center Backend. "
        "Powered by NASA EONET, EPA AirNow, and Google Gemini AI Tactical Reasoning."
    ),
    version="1.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ═══════════════════════════════════════════════════════════════
# CORS Configuration
# ═══════════════════════════════════════════════════════════════
# Allows seamless communication with Next.js frontend running on localhost:3000
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "*",  # Allow all for hackathon flexibility
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API endpoints
app.include_router(routes.router)


@app.get("/", tags=["Root"])
def root():
    """Root endpoint providing navigation and AI reasoning status."""
    has_gemini = bool(GEMINI_API_KEY) and GEMINI_API_KEY != "your_gemini_api_key_here"
    return JSONResponse(
        content={
            "project": "StratosHealth Command Center Backend",
            "challenge": "NASA Space Apps Challenge",
            "status": "online",
            "ai_engine": "Google Gemini 1.5 Flash (Live)" if has_gemini else "Deterministic Incident Commander (Fallback)",
            "documentation": "/docs",
            "endpoints": {
                "wildfires_geojson": "/api/v1/telemetry/fires",
                "air_quality_telemetry": "/api/v1/telemetry/air-quality",
                "tactical_advisory": "/api/v1/advisory",
                "health_check": "/api/v1/health",
            },
        }
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
