"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  FireGeoJSONFeatureCollection,
  AirQualityResponse,
  TacticalAdvisoryResponse,
  BackendTelemetryState,
} from "@/lib/types";
import {
  WILDFIRE_DATA,
  AI_ADVISORY,
  VULNERABILITY_STATS,
} from "../lib/mock-data";

const PRIMARY_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

// Secondary fallback in case of IPv4 vs IPv6 resolution differences on Windows
const SECONDARY_URL = PRIMARY_URL.includes("127.0.0.1")
  ? PRIMARY_URL.replace("127.0.0.1", "localhost")
  : PRIMARY_URL.replace("localhost", "127.0.0.1");

// ─── Fallback Mock Generators ────────────────────────────────

function getFallbackFires(): FireGeoJSONFeatureCollection {
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        id: WILDFIRE_DATA.id,
        geometry: {
          type: "Point",
          coordinates: [WILDFIRE_DATA.longitude, WILDFIRE_DATA.latitude],
        },
        properties: {
          id: WILDFIRE_DATA.id,
          title: WILDFIRE_DATA.name,
          category: "Wildfires",
          date: WILDFIRE_DATA.startDate,
          source: "Offline Telemetry Baseline",
          is_active: true,
          severity: "critical",
        },
      },
    ],
    metadata: {
      data_source: "Offline Telemetry Baseline",
      queried_at: new Date().toISOString(),
      feature_count: 1,
    },
  };
}

function getFallbackAirQuality(): AirQualityResponse {
  return {
    sector: "Pacific NW - Sector 7B",
    summary: {
      regional_aqi_avg: 198.5,
      peak_aqi: 287,
      peak_station: "Bend Central Ground Station",
      dominant_pollutant: "PM2.5",
      active_monitoring_stations: 5,
      data_provider: "Simulated EPA AirNow Offline Mode",
    },
    stations: [
      {
        station_id: "FALLBACK-01",
        station_name: "Bend Central Ground Station",
        sector: "Pacific NW - Sector 7B",
        latitude: WILDFIRE_DATA.latitude,
        longitude: WILDFIRE_DATA.longitude,
        aqi: 287,
        pm2_5: 185.7,
        pm10: 242.1,
        no2: 142.3,
        ozone: 0.082,
        temperature_f: 94.0,
        humidity_pct: 18.0,
        wind_speed_mph: 12.0,
        wind_direction_deg: 315,
        dominant_pollutant: "PM2.5",
        health_status: "Very Unhealthy",
        recorded_at: new Date().toISOString(),
      },
    ],
    timestamp: new Date().toISOString(),
  };
}

function getFallbackAdvisory(): TacticalAdvisoryResponse {
  return {
    timestamp: new Date().toISOString(),
    sector: "Pacific NW - Sector 7B",
    urgency_level: "LEVEL 4 - CRITICAL",
    status: AI_ADVISORY.status,
    headline: "MANDATORY EVACUATION: Sectors 7B & 8A within 2-Hour Window",
    raw_advisory_text: AI_ADVISORY.analysis,
    evacuation_routes: [
      {
        corridor: "US-97 South → OR-31 West",
        direction: "Southbound",
        status: "CLEAR",
        capacity_rate: "2,400 veh/hr",
        eta_clearance_hours: 2.5,
      },
      {
        corridor: "US-20 West → OR-126",
        direction: "Westbound",
        status: "ADVISORY",
        capacity_rate: "1,800 veh/hr",
        eta_clearance_hours: 3.8,
      },
      {
        corridor: "NF-46 South → Cascade Lakes Hwy",
        direction: "Southbound",
        status: "CLOSED",
        capacity_rate: "Emergency Access Only",
        eta_clearance_hours: 0.0,
      },
    ],
    shelter_assignments: [
      {
        facility_name: "Redmond High School Gymnasium",
        address: "675 SW Rimrock Way, Redmond, OR",
        capacity_total: 800,
        capacity_available: 420,
        status: "ACTIVE",
      },
      {
        facility_name: "Deschutes County Fairgrounds",
        address: "3800 SW Airport Way, Redmond, OR",
        capacity_total: 1200,
        capacity_available: 780,
        status: "ACTIVE",
      },
      {
        facility_name: "First Presbyterian Church Refuge",
        address: "230 NE 9th St, Bend, OR",
        capacity_total: 200,
        capacity_available: 45,
        status: "ACTIVE",
      },
    ],
    at_risk_population: VULNERABILITY_STATS.atRiskPopulation,
    confidence_score: 94.2,
    model_version: "HYSPLIT + TEMPO Fusion v3.1",
    active_fires_detected: 1,
    highest_recorded_aqi: 287,
  };
}

async function safeFetchJson<T>(baseUrl: string, endpoint: string, timeoutMs = 6000): Promise<T | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${baseUrl}${endpoint}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ─── Main Hook ───────────────────────────────────────────────

export function useBackendTelemetry(pollIntervalMs: number = 20_000) {
  const [state, setState] = useState<BackendTelemetryState>({
    fires: null,
    airQuality: null,
    advisory: null,
    isLoading: true,
    isOffline: false,
    errorMessage: null,
    lastUpdated: null,
  });

  const fetchTelemetry = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));

    // Try primary URL first, then secondary fallback URL
    let activeBaseUrl = PRIMARY_URL;

    // Test health or fires on primary
    let fires = await safeFetchJson<FireGeoJSONFeatureCollection>(PRIMARY_URL, "/api/v1/telemetry/fires");
    
    if (!fires && SECONDARY_URL !== PRIMARY_URL) {
      // Try secondary URL (e.g. localhost vs 127.0.0.1)
      const secondaryFires = await safeFetchJson<FireGeoJSONFeatureCollection>(SECONDARY_URL, "/api/v1/telemetry/fires");
      if (secondaryFires) {
        fires = secondaryFires;
        activeBaseUrl = SECONDARY_URL;
      }
    }

    // Fetch air-quality and advisory from the responsive host
    const [airQuality, advisory] = await Promise.all([
      safeFetchJson<AirQualityResponse>(activeBaseUrl, "/api/v1/telemetry/air-quality"),
      safeFetchJson<TacticalAdvisoryResponse>(activeBaseUrl, "/api/v1/advisory"),
    ]);

    const isConnected = Boolean(fires || airQuality || advisory);

    if (isConnected) {
      setState({
        fires: fires || getFallbackFires(),
        airQuality: airQuality || getFallbackAirQuality(),
        advisory: advisory || getFallbackAdvisory(),
        isLoading: false,
        isOffline: false,
        errorMessage: null,
        lastUpdated: new Date().toISOString(),
      });
    } else {
      // Full offline fallback
      setState({
        fires: getFallbackFires(),
        airQuality: getFallbackAirQuality(),
        advisory: getFallbackAdvisory(),
        isLoading: false,
        isOffline: true,
        errorMessage: `Telemetry server offline (${PRIMARY_URL}). Running in local cached mode.`,
        lastUpdated: new Date().toISOString(),
      });
    }
  }, []);

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, pollIntervalMs);
    return () => clearInterval(interval);
  }, [fetchTelemetry, pollIntervalMs]);

  return { ...state, refetch: fetchTelemetry, backendUrl: PRIMARY_URL };
}
