/* ═══════════════════════════════════════════════════════════════
   StratosHealth — Mock Data
   All data is synthetic. Coordinates are near Bend, Oregon.
   ═══════════════════════════════════════════════════════════════ */

// ─── Types ───────────────────────────────────────────────────

export interface Wildfire {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  acresBurned: number;
  containment: number;
  status: "active" | "contained" | "out";
  startDate: string;
  aqiImpact: number;
  radiusKm: number;
}

export interface Facility {
  id: string;
  name: string;
  type: "school" | "hospital";
  latitude: number;
  longitude: number;
  capacity: number;
  impacted: boolean;
  distanceFromFire: number;
}

export interface VulnerabilityStats {
  schoolsImpacted: number;
  hospitalsImpacted: number;
  atRiskPopulation: number;
  evacuationZones: number;
  sheltersActive: number;
  airQualityIndex: number;
  dominantPollutant: string;
}

export interface TelemetryReading {
  label: string;
  value: string;
  unit: string;
  status: "nominal" | "warning" | "critical";
}

export interface WindVector {
  latitude: number;
  longitude: number;
  speed: number;
  direction: number; // degrees, 0 = North, 90 = East
}

// ─── Active Wildfire ─────────────────────────────────────────

export const WILDFIRE_DATA: Wildfire = {
  id: "WF-2024-OR-0847",
  name: "Cascade Ridge Fire",
  latitude: 44.0582,
  longitude: -121.3153,
  acresBurned: 14200,
  containment: 18,
  status: "active",
  startDate: "2024-08-28T14:30:00Z",
  aqiImpact: 287,
  radiusKm: 25,
};

// ─── Facilities ──────────────────────────────────────────────

export const FACILITIES_DATA: Facility[] = [
  // Schools
  {
    id: "SCH-001",
    name: "Bend Senior High School",
    type: "school",
    latitude: 44.0631,
    longitude: -121.2943,
    capacity: 1450,
    impacted: true,
    distanceFromFire: 2.1,
  },
  {
    id: "SCH-002",
    name: "Pilot Butte Middle School",
    type: "school",
    latitude: 44.0712,
    longitude: -121.2813,
    capacity: 890,
    impacted: true,
    distanceFromFire: 3.8,
  },
  {
    id: "SCH-003",
    name: "Elk Meadow Elementary",
    type: "school",
    latitude: 44.0455,
    longitude: -121.267,
    capacity: 520,
    impacted: true,
    distanceFromFire: 4.5,
  },
  {
    id: "SCH-004",
    name: "Pine Ridge Academy",
    type: "school",
    latitude: 44.082,
    longitude: -121.34,
    capacity: 680,
    impacted: true,
    distanceFromFire: 3.2,
  },
  {
    id: "SCH-005",
    name: "Summit Charter School",
    type: "school",
    latitude: 44.034,
    longitude: -121.295,
    capacity: 340,
    impacted: false,
    distanceFromFire: 5.1,
  },
  // Hospitals
  {
    id: "HOS-001",
    name: "St. Charles Medical Center",
    type: "hospital",
    latitude: 44.0565,
    longitude: -121.2802,
    capacity: 260,
    impacted: true,
    distanceFromFire: 3.4,
  },
  {
    id: "HOS-002",
    name: "Central Oregon Regional",
    type: "hospital",
    latitude: 44.075,
    longitude: -121.305,
    capacity: 180,
    impacted: true,
    distanceFromFire: 2.0,
  },
  {
    id: "HOS-003",
    name: "High Desert Care Clinic",
    type: "hospital",
    latitude: 44.038,
    longitude: -121.33,
    capacity: 45,
    impacted: true,
    distanceFromFire: 2.8,
  },
];

// ─── Vulnerability Stats ─────────────────────────────────────

export const VULNERABILITY_STATS: VulnerabilityStats = {
  schoolsImpacted: 12,
  hospitalsImpacted: 3,
  atRiskPopulation: 38400,
  evacuationZones: 4,
  sheltersActive: 7,
  airQualityIndex: 287,
  dominantPollutant: "PM2.5",
};

// ─── Telemetry Readings ──────────────────────────────────────

export const TELEMETRY_READINGS: TelemetryReading[] = [
  { label: "AQI", value: "287", unit: "", status: "critical" },
  { label: "NO₂", value: "142.3", unit: "ppb", status: "critical" },
  { label: "PM2.5", value: "185.7", unit: "µg/m³", status: "critical" },
  { label: "WIND", value: "12", unit: "mph NW", status: "warning" },
  { label: "TEMP", value: "94", unit: "°F", status: "warning" },
  { label: "VIS", value: "0.8", unit: "mi", status: "critical" },
];

// ─── Wind Vectors ────────────────────────────────────────────

export const WIND_VECTORS: WindVector[] = [
  { latitude: 44.09, longitude: -121.38, speed: 12, direction: 135 },
  { latitude: 44.1, longitude: -121.28, speed: 14, direction: 140 },
  { latitude: 44.05, longitude: -121.4, speed: 10, direction: 130 },
  { latitude: 44.02, longitude: -121.32, speed: 11, direction: 145 },
  { latitude: 44.07, longitude: -121.25, speed: 15, direction: 135 },
  { latitude: 44.03, longitude: -121.28, speed: 9, direction: 120 },
  { latitude: 44.09, longitude: -121.2, speed: 13, direction: 150 },
  { latitude: 44.06, longitude: -121.42, speed: 8, direction: 125 },
  { latitude: 44.04, longitude: -121.22, speed: 16, direction: 140 },
  { latitude: 44.08, longitude: -121.35, speed: 11, direction: 132 },
];

// ─── AI Advisory ─────────────────────────────────────────────

export const AI_ADVISORY = {
  timestamp: "2024-08-31T07:45:00Z",
  status: "ANALYSIS COMPLETE",
  analysis: `Based on current wind vectors (NW @ 12 mph) and TEMPO NO₂ dispersion modeling, the plume corridor is projected to shift ESE over the next 6 hours.

IMMEDIATE ACTION REQUIRED:
Recommend evacuation of Sectors 7B and 8A within 2-hour window. PM2.5 concentrations in the evacuation corridor are expected to exceed 200 µg/m³ by T+4h.

PRIORITY EVACUATION ROUTES:
1. US-97 South → OR-31 West (Clear, capacity: 2,400 veh/hr)
2. US-20 West → OR-126 (Advisory, capacity: 1,800 veh/hr)
3. NF-46 South → Cascade Lakes Hwy (Backup, limited)

SHELTER ASSIGNMENTS:
• Redmond High School Gymnasium — 800 capacity
• Deschutes County Fairgrounds — 1,200 capacity
• First Presbyterian Church — 200 capacity

AI CONFIDENCE: 94.2%  |  MODEL: HYSPLIT + TEMPO Fusion v3.1`,
};

// ─── Heatmap Data Generation ─────────────────────────────────

function generateHeatmapPoints(
  centerLat: number,
  centerLng: number,
  numRings: number,
  pointsPerRing: number
): Array<{ latitude: number; longitude: number; intensity: number }> {
  const points = [
    { latitude: centerLat, longitude: centerLng, intensity: 1.0 },
  ];

  for (let ring = 1; ring <= numRings; ring++) {
    const radius = ring * 0.035;
    const intensity = Math.max(0.15, 1.0 - ring * 0.18);

    for (let i = 0; i < pointsPerRing; i++) {
      const angle = (i / pointsPerRing) * 2 * Math.PI + ring * 0.4;
      points.push({
        latitude: centerLat + radius * Math.sin(angle),
        longitude:
          centerLng +
          (radius * Math.cos(angle)) /
            Math.cos((centerLat * Math.PI) / 180),
        intensity,
      });
    }
  }

  return points;
}

/** NO₂ column density data points radiating from fire center */
export const NO2_DATA_POINTS = generateHeatmapPoints(
  44.0582,
  -121.3153,
  5,
  8
);

/** PM2.5 concentration data points radiating from fire center */
export const PM25_DATA_POINTS = generateHeatmapPoints(
  44.0582,
  -121.3153,
  4,
  6
);

// ─── GeoJSON Converters ──────────────────────────────────────

export function toHeatmapGeoJSON(
  points: Array<{ latitude: number; longitude: number; intensity: number }>
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: points.map((p) => ({
      type: "Feature" as const,
      properties: { intensity: p.intensity },
      geometry: {
        type: "Point" as const,
        coordinates: [p.longitude, p.latitude],
      },
    })),
  };
}

// ─── Timeline ────────────────────────────────────────────────

export const TIMELINE_MAX_HOURS = 72;
export const TIMELINE_START = "2024-08-28T14:00:00Z";
