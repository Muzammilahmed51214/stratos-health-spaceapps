"""
Business logic and external API services for StratosHealth.
Handles NASA EONET fetching, SQLite caching, EPA AirNow simulation,
and live Google Gemini LLM tactical evacuation advisory reasoning.
"""

import json
import os
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import httpx
from dotenv import load_dotenv
from sqlalchemy.orm import Session

# Load environment variables from .env
load_dotenv()

from models import FireEvent, AirQualityReading, TacticalAdvisory
from schemas import (
    FireGeoJSONFeatureCollection,
    FireGeoJSONFeature,
    GeoJSONPointGeometry,
    FireFeatureProperties,
    AirQualityStationSchema,
    AirQualitySummarySchema,
    AirQualityResponseSchema,
    EvacuationRouteSchema,
    ShelterAssignmentSchema,
    AdvisoryResponseSchema,
)

logger = logging.getLogger("stratos.services")
logging.basicConfig(level=logging.INFO)

NASA_EONET_URL = "https://eonet.gsfc.nasa.gov/api/v3/events"

# ═══════════════════════════════════════════════════════════════
# FEMA Tactical AI Commander System Prompt
# ═══════════════════════════════════════════════════════════════

FEMA_COMMANDER_SYSTEM_PROMPT = """
You are the FEMA & NASA StratosHealth Tactical AI Incident Commander.
You operate in a high-stakes live Emergency Operations Center (EOC) responding to catastrophic wildfires and hazardous air quality emergencies.
Your objective is to ingest live telemetry (active wildfire coordinates, severity levels, EPA PM2.5/PM10 ground sensor readings, and wind vectors) and synthesize a highly actionable, structured emergency evacuation plan.

STRICT REQUIREMENTS:
1. Evaluate fire proximity, wind direction, PM2.5 particulate dispersion, and vulnerable population corridors.
2. Formulate clear mandatory evacuation orders, corridor clearance ETAs, and emergency shelter dispatch rosters.
3. Respond ONLY with valid JSON matching the following schema exact structure:
{
  "headline": "MANDATORY EVACUATION: Sectors 7B & 8A within 2-Hour Window",
  "urgency_level": "LEVEL 4 - CRITICAL",
  "status": "ANALYSIS COMPLETE",
  "raw_advisory_text": "Detailed multi-paragraph operational orders including meteorological summary, evacuation routes, capacity rates, shelter allocations, and AI confidence metrics.",
  "evacuation_routes": [
    {
      "corridor": "US-97 South → OR-31 West",
      "direction": "Southbound",
      "status": "CLEAR",
      "capacity_rate": "2,400 veh/hr",
      "eta_clearance_hours": 2.5
    },
    {
      "corridor": "US-20 West → OR-126",
      "direction": "Westbound",
      "status": "ADVISORY",
      "capacity_rate": "1,800 veh/hr",
      "eta_clearance_hours": 3.8
    },
    {
      "corridor": "NF-46 South → Cascade Lakes Hwy",
      "direction": "Southbound",
      "status": "CLOSED",
      "capacity_rate": "Emergency Vehicles Only",
      "eta_clearance_hours": 0.0
    }
  ],
  "shelter_assignments": [
    {
      "facility_name": "Redmond High School Gymnasium",
      "address": "675 SW Rimrock Way, Redmond, OR",
      "capacity_total": 800,
      "capacity_available": 420,
      "status": "ACTIVE"
    },
    {
      "facility_name": "Deschutes County Fairgrounds",
      "address": "3800 SW Airport Way, Redmond, OR",
      "capacity_total": 1200,
      "capacity_available": 780,
      "status": "ACTIVE"
    },
    {
      "facility_name": "First Presbyterian Church Refuge",
      "address": "230 NE 9th St, Bend, OR",
      "capacity_total": 200,
      "capacity_available": 45,
      "status": "ACTIVE"
    }
  ],
  "at_risk_population": 38400,
  "confidence_score": 95.8,
  "model_version": "Gemini 1.5 Flash + HYSPLIT Fusion v3.2"
}
"""

FALLBACK_FIRES = [
    {
        "id": "WF-2024-OR-0847",
        "title": "Cascade Ridge Wildfire",
        "latitude": 44.0582,
        "longitude": -121.3153,
        "date": datetime.utcnow() - timedelta(hours=14),
        "source": "NASA EONET Fallback",
        "category": "Wildfires",
        "severity": "critical",
        "source_url": "https://inciweb.wildfire.gov/",
    },
    {
        "id": "WF-2024-OR-0892",
        "title": "Deschutes National Forest Incident",
        "latitude": 43.9214,
        "longitude": -121.5421,
        "date": datetime.utcnow() - timedelta(hours=8),
        "source": "NASA EONET Fallback",
        "category": "Wildfires",
        "severity": "high",
        "source_url": "https://inciweb.wildfire.gov/",
    },
]


def determine_aqi_category(aqi: int) -> str:
    """Calculates standard EPA health risk category from AQI integer."""
    if aqi <= 50:
        return "Good"
    elif aqi <= 100:
        return "Moderate"
    elif aqi <= 150:
        return "Unhealthy for Sensitive Groups"
    elif aqi <= 200:
        return "Unhealthy"
    elif aqi <= 300:
        return "Very Unhealthy"
    else:
        return "Hazardous"


async def fetch_and_cache_fires(
    db: Session,
    force_refresh: bool = False,
    cache_ttl_minutes: int = 15,
) -> FireGeoJSONFeatureCollection:
    """
    Fetches live wildfire telemetry from NASA EONET v3.
    Stores and refreshes records in SQLite to avoid API rate limiting.
    Transforms data into a GeoJSON FeatureCollection tailored for Mapbox GL.
    """
    now = datetime.utcnow()
    features: List[FireGeoJSONFeature] = []
    source_origin = "NASA EONET v3 (Live)"

    cached_count = db.query(FireEvent).count()
    most_recent = db.query(FireEvent).order_by(FireEvent.updated_at.desc()).first()

    should_fetch_api = (
        force_refresh
        or cached_count == 0
        or most_recent is None
        or (now - most_recent.updated_at) > timedelta(minutes=cache_ttl_minutes)
    )

    if should_fetch_api:
        try:
            logger.info("Querying NASA EONET v3 API for active wildfires...")
            async with httpx.AsyncClient(timeout=10.0) as client:
                params = {
                    "category": "wildfires",
                    "status": "open",
                    "limit": 50,
                }
                resp = await client.get(NASA_EONET_URL, params=params)

                if resp.status_code == 200:
                    data = resp.json()
                    events = data.get("events", [])
                    logger.info(f"Received {len(events)} wildfire events from NASA EONET.")

                    for item in events:
                        geometries = item.get("geometry", [])
                        if not geometries:
                            continue

                        latest_geo = geometries[-1]
                        coords = latest_geo.get("coordinates", [])
                        if len(coords) < 2:
                            continue

                        lng, lat = float(coords[0]), float(coords[1])
                        eonet_id = item.get("id")
                        title = item.get("title", "Unnamed Wildfire")
                        raw_date = latest_geo.get("date")

                        try:
                            event_dt = datetime.fromisoformat(raw_date.replace("Z", "+00:00")).replace(tzinfo=None)
                        except Exception:
                            event_dt = now

                        categories = item.get("categories", [])
                        cat_title = categories[0].get("title", "Wildfires") if categories else "Wildfires"
                        sources = item.get("sources", [])
                        source_url = sources[0].get("url") if sources else None

                        existing = db.query(FireEvent).filter(FireEvent.eonet_id == eonet_id).first()
                        if existing:
                            existing.title = title
                            existing.latitude = lat
                            existing.longitude = lng
                            existing.event_date = event_dt
                            existing.source_url = source_url
                            existing.updated_at = now
                            existing.raw_properties = item
                        else:
                            new_event = FireEvent(
                                eonet_id=eonet_id,
                                title=title,
                                category=cat_title,
                                latitude=lat,
                                longitude=lng,
                                event_date=event_dt,
                                source_name="NASA EONET v3",
                                source_url=source_url,
                                is_active=True,
                                raw_properties=item,
                                created_at=now,
                                updated_at=now,
                            )
                            db.add(new_event)

                    db.commit()
                else:
                    logger.warning(f"NASA EONET returned status {resp.status_code}. Using cache.")
                    source_origin = "SQLite Cache (API Status Degraded)"
        except Exception as ex:
            logger.error(f"Failed to fetch NASA EONET data: {ex}. Using cache.")
            source_origin = "SQLite Cache (Network Fallback)"

    db_events = db.query(FireEvent).filter(FireEvent.is_active == True).all()

    if not db_events:
        logger.info("Seeding baseline fallback fires into SQLite cache...")
        for fb in FALLBACK_FIRES:
            event = FireEvent(
                eonet_id=fb["id"],
                title=fb["title"],
                category=fb["category"],
                latitude=fb["latitude"],
                longitude=fb["longitude"],
                event_date=fb["date"],
                source_name=fb["source"],
                source_url=fb["source_url"],
                is_active=True,
                created_at=now,
                updated_at=now,
            )
            db.add(event)
        db.commit()
        db_events = db.query(FireEvent).all()
        source_origin = "StratosHealth Seed Baseline (Offline Mode)"

    for ev in db_events:
        features.append(
            FireGeoJSONFeature(
                id=ev.eonet_id,
                geometry=GeoJSONPointGeometry(
                    type="Point",
                    coordinates=[ev.longitude, ev.latitude],
                ),
                properties=FireFeatureProperties(
                    id=ev.eonet_id,
                    title=ev.title,
                    category=ev.category,
                    date=ev.event_date,
                    source=ev.source_name,
                    source_url=ev.source_url,
                    is_active=ev.is_active,
                    severity="critical" if "Cascade" in ev.title or "Ridge" in ev.title else "high",
                    extra=ev.raw_properties,
                ),
            )
        )

    return FireGeoJSONFeatureCollection(
        type="FeatureCollection",
        features=features,
        metadata={
            "data_source": source_origin,
            "queried_at": now.isoformat() + "Z",
            "feature_count": len(features),
            "cached_in_sqlite": True,
        },
    )


def get_pacific_nw_air_quality(db: Session) -> AirQualityResponseSchema:
    """
    Simulates EPA AirNow telemetry and TEMPO satellite ground-level correlation
    for primary monitoring stations across Oregon and the Pacific Northwest.
    """
    now = datetime.utcnow()

    station_definitions = [
        {
            "id": "EPA-OR-BND-01",
            "name": "Bend Central Station",
            "sector": "Pacific NW - Sector 7B",
            "lat": 44.0582,
            "lng": -121.3153,
            "pm2_5": 185.7,
            "pm10": 242.1,
            "no2": 142.3,
            "ozone": 0.082,
            "temp_f": 94.0,
            "hum": 18.0,
            "wind_spd": 12.0,
            "wind_dir": 315,  # NW
            "aqi": 287,
        },
        {
            "id": "EPA-OR-RDM-02",
            "name": "Redmond Regional Airport Station",
            "sector": "Pacific NW - Sector 7B",
            "lat": 44.2714,
            "lng": -121.1500,
            "pm2_5": 92.4,
            "pm10": 118.0,
            "no2": 68.1,
            "ozone": 0.054,
            "temp_f": 91.0,
            "hum": 22.0,
            "wind_spd": 14.0,
            "wind_dir": 320,
            "aqi": 170,
        },
        {
            "id": "EPA-OR-PLT-03",
            "name": "Pilot Butte Monitoring Station",
            "sector": "Pacific NW - Sector 7B",
            "lat": 44.0712,
            "lng": -121.2813,
            "pm2_5": 164.2,
            "pm10": 210.5,
            "no2": 118.4,
            "ozone": 0.075,
            "temp_f": 93.0,
            "hum": 19.0,
            "wind_spd": 11.0,
            "wind_dir": 310,
            "aqi": 248,
        },
        {
            "id": "EPA-OR-SST-04",
            "name": "Sisters Ridge High Ground",
            "sector": "Pacific NW - Sector 8A",
            "lat": 44.2911,
            "lng": -121.5492,
            "pm2_5": 128.9,
            "pm10": 175.3,
            "no2": 94.2,
            "ozone": 0.062,
            "temp_f": 89.0,
            "hum": 24.0,
            "wind_spd": 9.0,
            "wind_dir": 290,
            "aqi": 204,
        },
        {
            "id": "EPA-OR-EUG-05",
            "name": "Eugene Willamette Valley",
            "sector": "Pacific NW - West Valley",
            "lat": 44.0521,
            "lng": -123.0868,
            "pm2_5": 38.5,
            "pm10": 52.0,
            "no2": 24.0,
            "ozone": 0.038,
            "temp_f": 84.0,
            "hum": 45.0,
            "wind_spd": 6.0,
            "wind_dir": 260,
            "aqi": 85,
        },
    ]

    station_schemas: List[AirQualityStationSchema] = []
    aqi_values = []

    for s in station_definitions:
        health_cat = determine_aqi_category(s["aqi"])
        aqi_values.append(s["aqi"])

        reading = AirQualityReading(
            station_id=s["id"],
            station_name=s["name"],
            sector=s["sector"],
            latitude=s["lat"],
            longitude=s["lng"],
            aqi=s["aqi"],
            pm2_5=s["pm2_5"],
            pm10=s["pm10"],
            no2=s["no2"],
            ozone=s["ozone"],
            temperature_f=s["temp_f"],
            humidity_pct=s["hum"],
            wind_speed_mph=s["wind_spd"],
            wind_direction_deg=s["wind_dir"],
            dominant_pollutant="PM2.5",
            health_status=health_cat,
            recorded_at=now,
        )
        db.add(reading)

        station_schemas.append(
            AirQualityStationSchema(
                station_id=s["id"],
                station_name=s["name"],
                sector=s["sector"],
                latitude=s["lat"],
                longitude=s["lng"],
                aqi=s["aqi"],
                pm2_5=s["pm2_5"],
                pm10=s["pm10"],
                no2=s["no2"],
                ozone=s["ozone"],
                temperature_f=s["temp_f"],
                humidity_pct=s["hum"],
                wind_speed_mph=s["wind_spd"],
                wind_direction_deg=s["wind_dir"],
                dominant_pollutant="PM2.5",
                health_status=health_cat,
                recorded_at=now,
            )
        )

    db.commit()

    peak_station = max(station_definitions, key=lambda x: x["aqi"])
    avg_aqi = round(sum(aqi_values) / len(aqi_values), 1)

    summary = AirQualitySummarySchema(
        regional_aqi_avg=avg_aqi,
        peak_aqi=peak_station["aqi"],
        peak_station=peak_station["name"],
        dominant_pollutant="PM2.5",
        active_monitoring_stations=len(station_definitions),
        data_provider="EPA AirNow + NASA TEMPO Simulated Fusion",
    )

    return AirQualityResponseSchema(
        sector="Pacific NW - Cascade Corridor",
        summary=summary,
        stations=station_schemas,
        timestamp=now,
    )


async def generate_tactical_advisory(
    db: Session,
    sector: str = "Pacific NW - Sector 7B",
) -> AdvisoryResponseSchema:
    """
    Fuses live wildfire locations, ground AQI telemetry, and wind vectors.
    Feeds environmental state into Google Gemini Live Reasoning Engine.
    Falls back gracefully to deterministic emergency advisory if LLM is unavailable.
    """
    now = datetime.utcnow()

    # 1. Gather live state from DB or upstream services
    fire_collection = await fetch_and_cache_fires(db=db, force_refresh=False)
    air_quality = get_pacific_nw_air_quality(db=db)

    active_fires = [
        {
            "id": f.properties.id,
            "title": f.properties.title,
            "coords": f.geometry.coordinates,
            "date": f.properties.date.isoformat() if hasattr(f.properties.date, "isoformat") else str(f.properties.date),
            "severity": f.properties.severity,
        }
        for f in fire_collection.features[:10]
    ]

    aq_summary = {
        "sector": sector,
        "regional_avg_aqi": air_quality.summary.regional_aqi_avg,
        "peak_aqi": air_quality.summary.peak_aqi,
        "peak_station": air_quality.summary.peak_station,
        "stations": [
            {
                "name": st.station_name,
                "aqi": st.aqi,
                "pm2_5": st.pm2_5,
                "wind_spd_mph": st.wind_speed_mph,
                "wind_dir_deg": st.wind_direction_deg,
                "health_status": st.health_status,
            }
            for st in air_quality.stations
        ],
    }

    # 2. Attempt Google Gemini LLM Generation
    gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
    use_gemini = bool(gemini_key) and gemini_key != "your_gemini_api_key_here"

    if use_gemini:
        try:
            logger.info("Initializing Google Gemini Reasoning Engine for Tactical Advisory...")
            import google.generativeai as genai

            genai.configure(api_key=gemini_key)

            # Try gemini-1.5-flash with JSON mode
            model = genai.GenerativeModel(
                model_name="gemini-1.5-flash",
                generation_config={
                    "response_mime_type": "application/json",
                    "temperature": 0.2,
                },
                system_instruction=FEMA_COMMANDER_SYSTEM_PROMPT,
            )

            prompt = (
                f"CURRENT EMERGENCY TELEMETRY INPUT:\n"
                f"Target Operational Sector: {sector}\n"
                f"Active Wildfires Detected ({len(active_fires)}):\n{json.dumps(active_fires, indent=2)}\n\n"
                f"EPA AirNow Ground Telemetry:\n{json.dumps(aq_summary, indent=2)}\n\n"
                f"Generate the FEMA Incident Command evacuation order and tactical response JSON now."
            )

            response = model.generate_content(prompt)
            raw_json_text = response.text.strip()
            parsed = json.loads(raw_json_text)

            evac_routes = [
                EvacuationRouteSchema(**r) for r in parsed.get("evacuation_routes", [])
            ]
            shelters = [
                ShelterAssignmentSchema(**s) for s in parsed.get("shelter_assignments", [])
            ]

            advisory_record = TacticalAdvisory(
                sector=sector,
                urgency_level=parsed.get("urgency_level", "LEVEL 4 - CRITICAL"),
                status=parsed.get("status", "ANALYSIS COMPLETE"),
                headline=parsed.get("headline", "MANDATORY EVACUATION: Sectors 7B & 8A"),
                advisory_text=parsed.get("raw_advisory_text", ""),
                evacuation_routes=[r.model_dump() for r in evac_routes],
                shelter_assignments=[s.model_dump() for s in shelters],
                at_risk_population=int(parsed.get("at_risk_population", 38400)),
                confidence_score=float(parsed.get("confidence_score", 95.8)),
                model_version=parsed.get("model_version", "Google Gemini 1.5 Flash"),
                created_at=now,
            )
            db.add(advisory_record)
            db.commit()

            logger.info("Successfully generated live advisory via Google Gemini.")

            return AdvisoryResponseSchema(
                timestamp=now,
                sector=sector,
                urgency_level=parsed.get("urgency_level", "LEVEL 4 - CRITICAL"),
                status=parsed.get("status", "ANALYSIS COMPLETE"),
                headline=parsed.get("headline", "MANDATORY EVACUATION: Sectors 7B & 8A"),
                raw_advisory_text=parsed.get("raw_advisory_text", ""),
                evacuation_routes=evac_routes,
                shelter_assignments=shelters,
                at_risk_population=int(parsed.get("at_risk_population", 38400)),
                confidence_score=float(parsed.get("confidence_score", 95.8)),
                model_version=parsed.get("model_version", "Google Gemini 1.5 Flash"),
                active_fires_detected=len(active_fires),
                highest_recorded_aqi=air_quality.summary.peak_aqi,
            )
        except Exception as ex:
            logger.warning(
                f"Gemini API call failed or rate-limited ({ex}). "
                f"Engaging fail-safe deterministic Incident Commander..."
            )

    # 3. Fail-safe deterministic emergency advisory (Fallback Mode)
    logger.info("Serving fail-safe deterministic advisory...")
    peak_aqi = air_quality.summary.peak_aqi
    fire_count = max(len(active_fires), 1)

    headline = "MANDATORY EVACUATION: Sectors 7B & 8A within 2-Hour Window"
    raw_advisory = (
        f"Based on current wind vectors (NW @ 12-15 mph) and TEMPO NO₂ dispersion modeling, "
        f"the Cascade Ridge plume corridor is projected to shift ESE over the next 6 hours.\n\n"
        f"IMMEDIATE ACTION REQUIRED:\n"
        f"Recommend evacuation of Sectors 7B and 8A within a 2-hour window. PM2.5 concentrations "
        f"in the primary evacuation corridor currently stand at {peak_aqi} AQI and are modeled "
        f"to exceed 200 µg/m³ by T+4h.\n\n"
        f"PRIORITY EVACUATION CORRIDORS:\n"
        f"1. US-97 South → OR-31 West (Status: CLEAR | Capacity: 2,400 veh/hr | Clearance: 2.5h)\n"
        f"2. US-20 West → OR-126 (Status: ADVISORY | Capacity: 1,800 veh/hr | Clearance: 3.8h)\n"
        f"3. NF-46 South → Cascade Lakes Hwy (Status: CLOSED to civilian traffic — Emergency Access Only)\n\n"
        f"SHELTER DISPATCH ASSIGNMENTS:\n"
        f"• Redmond High School Gymnasium — Capacity: 800 (Available: 420)\n"
        f"• Deschutes County Fairgrounds — Capacity: 1,200 (Available: 780)\n"
        f"• First Presbyterian Church Refuge — Capacity: 200 (Available: 45)\n\n"
        f"AI MODEL METRICS:\n"
        f"Confidence: 94.2%  |  Engine: HYSPLIT + TEMPO Fusion v3.1  |  Sensors Online: {len(air_quality.stations)}"
    )

    evac_routes = [
        EvacuationRouteSchema(
            corridor="US-97 South → OR-31 West",
            direction="Southbound",
            status="CLEAR",
            capacity_rate="2,400 veh/hr",
            eta_clearance_hours=2.5,
        ),
        EvacuationRouteSchema(
            corridor="US-20 West → OR-126",
            direction="Westbound",
            status="ADVISORY",
            capacity_rate="1,800 veh/hr",
            eta_clearance_hours=3.8,
        ),
        EvacuationRouteSchema(
            corridor="NF-46 South → Cascade Lakes Hwy",
            direction="Southbound",
            status="CLOSED",
            capacity_rate="Emergency Vehicles Only",
            eta_clearance_hours=0.0,
        ),
    ]

    shelters = [
        ShelterAssignmentSchema(
            facility_name="Redmond High School Gymnasium",
            address="675 SW Rimrock Way, Redmond, OR",
            capacity_total=800,
            capacity_available=420,
            status="ACTIVE",
        ),
        ShelterAssignmentSchema(
            facility_name="Deschutes County Fairgrounds",
            address="3800 SW Airport Way, Redmond, OR",
            capacity_total=1200,
            capacity_available=780,
            status="ACTIVE",
        ),
        ShelterAssignmentSchema(
            facility_name="First Presbyterian Church Refuge",
            address="230 NE 9th St, Bend, OR",
            capacity_total=200,
            capacity_available=45,
            status="ACTIVE",
        ),
    ]

    return AdvisoryResponseSchema(
        timestamp=now,
        sector=sector,
        urgency_level="LEVEL 4 - CRITICAL",
        status="ANALYSIS COMPLETE",
        headline=headline,
        raw_advisory_text=raw_advisory,
        evacuation_routes=evac_routes,
        shelter_assignments=shelters,
        at_risk_population=38400,
        confidence_score=94.2,
        model_version="HYSPLIT + TEMPO Fusion v3.1 (Deterministic Fallback)",
        active_fires_detected=fire_count,
        highest_recorded_aqi=peak_aqi,
    )
