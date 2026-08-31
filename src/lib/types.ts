/** Shared type definitions for StratosHealth Frontend & Backend Integration */

export interface LayerToggles {
  tempoNO2: boolean;
  epaPM25: boolean;
  windVectors: boolean;
  facilities: boolean;
}

// ═══════════════════════════════════════════════════════════════
// NASA & Backend Wildfire GeoJSON Types
// ═══════════════════════════════════════════════════════════════

export interface FireFeatureProperties {
  id: string;
  title: string;
  category: string;
  date: string;
  source: string;
  source_url?: string;
  is_active: boolean;
  severity: "low" | "moderate" | "high" | "critical";
  extra?: Record<string, unknown>;
}

export interface FireGeoJSONFeature {
  type: "Feature";
  id?: string;
  geometry: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  };
  properties: FireFeatureProperties;
}

export interface FireGeoJSONFeatureCollection {
  type: "FeatureCollection";
  features: FireGeoJSONFeature[];
  metadata?: {
    data_source?: string;
    queried_at?: string;
    feature_count?: number;
    cached_in_sqlite?: boolean;
  };
}

// ═══════════════════════════════════════════════════════════════
// Air Quality Telemetry Types (EPA AirNow + TEMPO Ground Fusion)
// ═══════════════════════════════════════════════════════════════

export interface AirQualityStation {
  station_id: string;
  station_name: string;
  sector: string;
  latitude: number;
  longitude: number;
  aqi: number;
  pm2_5: number;
  pm10: number;
  no2?: number;
  ozone?: number;
  temperature_f?: number;
  humidity_pct?: number;
  wind_speed_mph?: number;
  wind_direction_deg?: number;
  dominant_pollutant: string;
  health_status: string;
  recorded_at: string;
}

export interface AirQualitySummary {
  regional_aqi_avg: number;
  peak_aqi: number;
  peak_station: string;
  dominant_pollutant: string;
  active_monitoring_stations: number;
  data_provider: string;
}

export interface AirQualityResponse {
  sector: string;
  summary: AirQualitySummary;
  stations: AirQualityStation[];
  timestamp: string;
}

// ═══════════════════════════════════════════════════════════════
// AI Tactical Advisory Types
// ═══════════════════════════════════════════════════════════════

export interface EvacuationRoute {
  corridor: string;
  direction: string;
  status: "CLEAR" | "ADVISORY" | "CONGESTED" | "CLOSED";
  capacity_rate: string;
  eta_clearance_hours: number;
}

export interface ShelterAssignment {
  facility_name: string;
  address: string;
  capacity_total: number;
  capacity_available: number;
  status: "ACTIVE" | "STANDBY" | "AT_CAPACITY";
}

export interface TacticalAdvisoryResponse {
  timestamp: string;
  sector: string;
  urgency_level: string;
  status: string;
  headline: string;
  raw_advisory_text: string;
  evacuation_routes: EvacuationRoute[];
  shelter_assignments: ShelterAssignment[];
  at_risk_population: number;
  confidence_score: number;
  model_version: string;
  active_fires_detected: number;
  highest_recorded_aqi: number;
}

// ═══════════════════════════════════════════════════════════════
// Unified Backend Telemetry Hook State
// ═══════════════════════════════════════════════════════════════

export interface BackendTelemetryState {
  fires: FireGeoJSONFeatureCollection | null;
  airQuality: AirQualityResponse | null;
  advisory: TacticalAdvisoryResponse | null;
  isLoading: boolean;
  isOffline: boolean;
  errorMessage: string | null;
  lastUpdated: string | null;
}
