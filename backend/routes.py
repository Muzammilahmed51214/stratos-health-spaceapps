"""
API routes for StratosHealth Backend.
Defines endpoints for NASA EONET GeoJSON fire feeds, EPA AirNow air quality metrics,
and AI-generated tactical evacuation advisories.
"""

from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from schemas import (
    FireGeoJSONFeatureCollection,
    AirQualityResponseSchema,
    AdvisoryResponseSchema,
)
import services

router = APIRouter(prefix="/api/v1")


@router.get(
    "/telemetry/fires",
    response_model=FireGeoJSONFeatureCollection,
    summary="Get Active Wildfires GeoJSON",
    description=(
        "Fetches active wildfire events from NASA EONET v3 with local SQLite caching. "
        "Returns an RFC 7946 GeoJSON FeatureCollection optimized for direct Mapbox GL rendering."
    ),
    tags=["Telemetry"],
)
async def get_wildfires(
    force_refresh: bool = Query(
        False,
        description="Bypass local SQLite cache and force an immediate query to NASA EONET API.",
    ),
    db: Session = Depends(get_db),
):
    """
    Returns a GeoJSON FeatureCollection of active wildfires.
    Each feature has point coordinates [longitude, latitude] and emergency properties.
    """
    try:
        geojson_data = await services.fetch_and_cache_fires(
            db=db,
            force_refresh=force_refresh,
        )
        return geojson_data
    except Exception as ex:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process wildfire telemetry: {str(ex)}",
        )


@router.get(
    "/telemetry/air-quality",
    response_model=AirQualityResponseSchema,
    summary="Get Regional Air Quality Metrics",
    description=(
        "Simulates EPA AirNow telemetry and TEMPO satellite ground-level correlation "
        "for Oregon and the Pacific Northwest, reporting PM2.5, PM10, AQI, and wind fields."
    ),
    tags=["Telemetry"],
)
def get_air_quality(
    db: Session = Depends(get_db),
):
    """
    Returns regional PM2.5 and PM10 metrics, station breakdown, and EPA health risk statuses.
    """
    try:
        air_quality_data = services.get_pacific_nw_air_quality(db=db)
        return air_quality_data
    except Exception as ex:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve air quality telemetry: {str(ex)}",
        )


@router.get(
    "/advisory",
    response_model=AdvisoryResponseSchema,
    summary="Get AI Tactical Response Advisory",
    description=(
        "Simulates passing combined wildfire telemetry, ground air quality sensor readings, "
        "and TEMPO NO2 plume dispersion to an LLM to generate actionable evacuation routes."
    ),
    tags=["Advisory"],
)
async def get_tactical_advisory(
    sector: str = Query(
        "Pacific NW - Sector 7B",
        description="Target geographic operational sector for emergency routing.",
    ),
    db: Session = Depends(get_db),
):
    """
    Returns AI-generated evacuation advisory string, route clearances, and shelter assignments.
    """
    try:
        advisory_data = await services.generate_tactical_advisory(db=db, sector=sector)
        return advisory_data
    except Exception as ex:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate tactical advisory: {str(ex)}",
        )


@router.get(
    "/health",
    summary="Backend Health Check",
    description="Validates API routing and SQLite database connectivity.",
    tags=["System"],
)
def health_check(
    db: Session = Depends(get_db),
):
    """Simple health probe for monitoring and deployment pipelines."""
    try:
        from models import FireEvent
        fire_count = db.query(FireEvent).count()
        return {
            "status": "online",
            "service": "StratosHealth Backend API",
            "version": "1.0.0",
            "database": "sqlite",
            "cached_fires_in_db": fire_count,
        }
    except Exception as ex:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database probe failed: {str(ex)}",
        )
