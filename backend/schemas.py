"""
Pydantic schemas for data validation, serialization, and GeoJSON formatting.
Ensures seamless compatibility with Mapbox GL and Next.js frontend requirements.
"""

from datetime import datetime
from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field


# ═══════════════════════════════════════════════════════════════
# GeoJSON Specification (RFC 7946) Models for Mapbox GL
# ═══════════════════════════════════════════════════════════════

class GeoJSONPointGeometry(BaseModel):
    """GeoJSON Point geometry object."""
    type: Literal["Point"] = "Point"
    coordinates: List[float] = Field(
        ...,
        description="Coordinates in [longitude, latitude] format.",
        min_length=2,
        max_length=2,
    )


class FireFeatureProperties(BaseModel):
    """Properties payload attached to each GeoJSON fire feature."""
    id: str
    title: str
    category: str
    date: datetime
    source: str
    source_url: Optional[str] = None
    is_active: bool = True
    severity: Literal["low", "moderate", "high", "critical"] = "high"
    extra: Optional[Dict[str, Any]] = None


class FireGeoJSONFeature(BaseModel):
    """Single GeoJSON Feature representing a wildfire point."""
    type: Literal["Feature"] = "Feature"
    id: Optional[str] = None
    geometry: GeoJSONPointGeometry
    properties: FireFeatureProperties


class FireGeoJSONFeatureCollection(BaseModel):
    """GeoJSON FeatureCollection representing all active wildfire events."""
    type: Literal["FeatureCollection"] = "FeatureCollection"
    features: List[FireGeoJSONFeature]
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Telemetry metadata (source, query_time, cached_count, total_count).",
    )


# ═══════════════════════════════════════════════════════════════
# Air Quality Telemetry Schemas
# ═══════════════════════════════════════════════════════════════

class AirQualityStationSchema(BaseModel):
    """Telemetry reading from an individual air quality monitoring station."""
    station_id: str
    station_name: str
    sector: str
    latitude: float
    longitude: float
    aqi: int = Field(..., ge=0, le=500, description="EPA Air Quality Index")
    pm2_5: float = Field(..., description="PM2.5 concentration in µg/m³")
    pm10: float = Field(..., description="PM10 concentration in µg/m³")
    no2: Optional[float] = Field(None, description="NO2 column correlation in ppb")
    ozone: Optional[float] = Field(None, description="Ground-level Ozone in ppm")
    temperature_f: Optional[float] = None
    humidity_pct: Optional[float] = None
    wind_speed_mph: Optional[float] = None
    wind_direction_deg: Optional[int] = None
    dominant_pollutant: str = "PM2.5"
    health_status: str
    recorded_at: datetime


class AirQualitySummarySchema(BaseModel):
    """Aggregated regional telemetry statistics."""
    regional_aqi_avg: float
    peak_aqi: int
    peak_station: str
    dominant_pollutant: str
    active_monitoring_stations: int
    data_provider: str = "EPA AirNow + NASA TEMPO Simulated Fusion"


class AirQualityResponseSchema(BaseModel):
    """Full air quality endpoint payload."""
    sector: str
    summary: AirQualitySummarySchema
    stations: List[AirQualityStationSchema]
    timestamp: datetime


# ═══════════════════════════════════════════════════════════════
# AI Tactical Advisory Schemas
# ═══════════════════════════════════════════════════════════════

class EvacuationRouteSchema(BaseModel):
    """Recommended emergency transit corridor."""
    corridor: str
    direction: str
    status: Literal["CLEAR", "ADVISORY", "CONGESTED", "CLOSED"]
    capacity_rate: str
    eta_clearance_hours: float


class ShelterAssignmentSchema(BaseModel):
    """Emergency shelter location and current capacity."""
    facility_name: str
    address: str
    capacity_total: int
    capacity_available: int
    status: Literal["ACTIVE", "STANDBY", "AT_CAPACITY"]


class AdvisoryResponseSchema(BaseModel):
    """AI-synthesized tactical response advisory payload."""
    timestamp: datetime
    sector: str
    urgency_level: str
    status: str
    headline: str
    raw_advisory_text: str
    evacuation_routes: List[EvacuationRouteSchema]
    shelter_assignments: List[ShelterAssignmentSchema]
    at_risk_population: int
    confidence_score: float
    model_version: str
    active_fires_detected: int
    highest_recorded_aqi: int
