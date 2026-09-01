"use client";

import { useState, useMemo } from "react";
import Map, {
  Marker,
  Popup,
  Source,
  Layer,
  NavigationControl,
  ScaleControl,
} from "react-map-gl";
import {
  Flame,
  School,
  Hospital,
  Navigation2,
  Satellite,
  Loader2,
  AlertCircle,
  RefreshCw,
  Key,
  ExternalLink,
  AlertTriangle,
  Radio,
} from "lucide-react";
import {
  WILDFIRE_DATA,
  FACILITIES_DATA,
  WIND_VECTORS,
  NO2_DATA_POINTS,
  PM25_DATA_POINTS,
  toHeatmapGeoJSON,
} from "../lib/mock-data";
import { generateCirclePolygon } from "../lib/utils";
import EmergencyMarkerPopup, {
  type PopupEventData,
} from "./components/EmergencyMarkerPopup";
import type { LayerToggles, FireGeoJSONFeature } from "../lib/types";
import "mapbox-gl/dist/mapbox-gl.css";

// ─── Config ──────────────────────────────────────────────────

const MAPBOX_TOKEN =
  (process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "").trim();

const isTokenConfigured =
  Boolean(MAPBOX_TOKEN) &&
  MAPBOX_TOKEN.startsWith("pk.") &&
  MAPBOX_TOKEN !== "pk.your_mapbox_token_here" &&
  MAPBOX_TOKEN !== "YOUR_MAPBOX_ACCESS_TOKEN" &&
  !MAPBOX_TOKEN.includes("your_mapbox_token");

// ─── Types ───────────────────────────────────────────────────

interface MapComponentProps {
  layers: LayerToggles;
  showVulnerabilityRadius: boolean;
  onFireClick: () => void;
  fireFeatures?: FireGeoJSONFeature[];
  isLoading?: boolean;
  isOffline?: boolean;
  onRefresh?: () => void;
}

// ─── Component ───────────────────────────────────────────────

export default function MapComponent({
  layers,
  showVulnerabilityRadius,
  onFireClick,
  fireFeatures = [],
  isLoading = false,
  isOffline = false,
  onRefresh,
}: MapComponentProps) {
  const [viewState, setViewState] = useState({
    latitude: WILDFIRE_DATA.latitude,
    longitude: WILDFIRE_DATA.longitude,
    zoom: 10.2,
    bearing: -5,
    pitch: 35,
  });

  const [mapRuntimeError, setMapRuntimeError] = useState<string | null>(null);

  // Selected fire event for popup & vulnerability radius center
  const [selectedFire, setSelectedFire] = useState<PopupEventData | null>(null);

  // Determine active radius center (selected fire or default Cascade Ridge)
  const radiusCenter: [number, number] = useMemo(() => {
    if (selectedFire) {
      return [selectedFire.longitude, selectedFire.latitude];
    }
    return [WILDFIRE_DATA.longitude, WILDFIRE_DATA.latitude];
  }, [selectedFire]);

  // Pre-compute GeoJSON vulnerability circle
  const vulnerabilityCircle = useMemo(
    () => generateCirclePolygon(radiusCenter, WILDFIRE_DATA.radiusKm),
    [radiusCenter]
  );

  const no2GeoJSON = useMemo(() => toHeatmapGeoJSON(NO2_DATA_POINTS), []);
  const pm25GeoJSON = useMemo(() => toHeatmapGeoJSON(PM25_DATA_POINTS), []);

  // If token is missing, invalid, or placeholder, render configuration guidance
  if (!isTokenConfigured) {
    const isSecretKey = MAPBOX_TOKEN.startsWith("sk.");
    return (
      <div className="w-full h-full flex items-center justify-center bg-obsidian p-6 select-none">
        <div className="max-w-lg w-full glass-panel-strong rounded-2xl p-6 text-center space-y-4 border border-slate-700/80 shadow-2xl shadow-black/80">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
            <Key className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-semibold text-white">
              {isSecretKey
                ? "Secret Key Detected (Invalid Token Type)"
                : "Mapbox Public Token Required"}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {isSecretKey
                ? "Your token starts with 'sk.' (Secret Key). Mapbox blocks secret keys in browsers. Please use a public token starting with 'pk.'."
                : "Mapbox GL requires a valid Public Access Token to render map tiles and satellite layers."}
            </p>
          </div>

          <div className="bg-slate-950/80 rounded-xl p-3.5 text-left border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                File: .env.local
              </span>
              <span className="text-[10px] font-mono text-cyan-400">
                NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
              </span>
            </div>
            <div className="font-mono text-xs text-slate-300 break-all bg-slate-900/90 p-2.5 rounded border border-slate-800 select-all">
              NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.eyJ1...
            </div>
          </div>

          <div className="pt-2 text-xs text-slate-400 text-left space-y-1.5 bg-slate-900/40 p-3 rounded-lg border border-slate-800/60">
            <div className="text-[11px] font-semibold text-slate-300">Quick Setup:</div>
            <div className="flex items-center gap-1.5">
              <span>1. Get your free public token at</span>
              <a
                href="https://account.mapbox.com/access-tokens/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 hover:underline inline-flex items-center gap-1 font-medium"
              >
                mapbox.com <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div>2. Open <code className="text-cyan-300 font-mono">.env.local</code> and replace the placeholder.</div>
            <div>3. Restart the dev server (<code className="text-cyan-300 font-mono">npm run dev</code>).</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {mapRuntimeError && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-red-500/20 border border-red-500/50 rounded-lg px-4 py-2 text-xs text-red-300 flex items-center gap-2 backdrop-blur-md">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <span>Mapbox error: {mapRuntimeError}</span>
        </div>
      )}

      <Map
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        style={{ width: "100%", height: "100%" }}
        attributionControl={false}
        reuseMaps
        onError={(e) => {
          console.warn("Mapbox GL runtime error:", e);
          if (e.error?.message) {
            setMapRuntimeError(e.error.message);
          }
        }}
        onClick={() => setSelectedFire(null)}
      >
        {/* ── Map Controls ── */}
        <NavigationControl position="top-left" showCompass showZoom />
        <ScaleControl position="bottom-left" />

        {/* ═══════════════════════════════════════════
            GeoJSON Layers
            ═══════════════════════════════════════════ */}

        {/* ── Vulnerability Radius (GeoJSON Danger Zone) ── */}
        {showVulnerabilityRadius && (
          <Source
            id="vulnerability-radius"
            type="geojson"
            data={vulnerabilityCircle}
          >
            <Layer
              id="vulnerability-fill"
              type="fill"
              paint={{
                "fill-color": "#EF4444",
                "fill-opacity": 0.12,
              }}
            />
            <Layer
              id="vulnerability-stroke"
              type="line"
              paint={{
                "line-color": "#EF4444",
                "line-width": 2,
                "line-dasharray": [4, 3],
                "line-opacity": 0.7,
              }}
            />
            <Layer
              id="vulnerability-glow"
              type="line"
              paint={{
                "line-color": "#EF4444",
                "line-width": 8,
                "line-opacity": 0.08,
                "line-blur": 6,
              }}
            />
          </Source>
        )}

        {/* ── NO₂ Heatmap Layer ── */}
        {layers.tempoNO2 && (
          <Source id="no2-heatmap" type="geojson" data={no2GeoJSON}>
            <Layer
              id="no2-heat"
              type="heatmap"
              paint={{
                "heatmap-weight": ["get", "intensity"],
                "heatmap-intensity": 0.6,
                "heatmap-color": [
                  "interpolate",
                  ["linear"],
                  ["heatmap-density"],
                  0,
                  "rgba(0,0,0,0)",
                  0.15,
                  "rgba(128,90,213,0.15)",
                  0.35,
                  "rgba(139,92,246,0.3)",
                  0.55,
                  "rgba(167,139,250,0.45)",
                  0.75,
                  "rgba(192,132,252,0.55)",
                  1,
                  "rgba(232,121,249,0.65)",
                ],
                "heatmap-radius": 55,
                "heatmap-opacity": 0.8,
              }}
            />
          </Source>
        )}

        {/* ── PM2.5 Heatmap Layer ── */}
        {layers.epaPM25 && (
          <Source id="pm25-heatmap" type="geojson" data={pm25GeoJSON}>
            <Layer
              id="pm25-heat"
              type="heatmap"
              paint={{
                "heatmap-weight": ["get", "intensity"],
                "heatmap-intensity": 0.5,
                "heatmap-color": [
                  "interpolate",
                  ["linear"],
                  ["heatmap-density"],
                  0,
                  "rgba(0,0,0,0)",
                  0.15,
                  "rgba(251,191,36,0.1)",
                  0.35,
                  "rgba(245,158,11,0.25)",
                  0.55,
                  "rgba(234,88,12,0.4)",
                  0.75,
                  "rgba(220,38,38,0.5)",
                  1,
                  "rgba(185,28,28,0.6)",
                ],
                "heatmap-radius": 45,
                "heatmap-opacity": 0.75,
              }}
            />
          </Source>
        )}

        {/* ═══════════════════════════════════════════
            Wind Vector Markers
            ═══════════════════════════════════════════ */}
        {layers.windVectors &&
          WIND_VECTORS.map((vec, i) => (
            <Marker
              key={`wind-${i}`}
              latitude={vec.latitude}
              longitude={vec.longitude}
              anchor="center"
            >
              <div className="relative group">
                <Navigation2
                  className="w-5 h-5 text-teal-400/50 drop-shadow-sm"
                  style={{
                    transform: `rotate(${vec.direction}deg)`,
                    filter: "drop-shadow(0 0 3px rgba(20,184,166,0.3))",
                  }}
                />
                <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-[8px] font-mono text-teal-400/40 whitespace-nowrap">
                  {vec.speed}
                </span>
              </div>
            </Marker>
          ))}

        {/* ═══════════════════════════════════════════
            Dynamic Wildfire Markers (FastAPI Telemetry)
            ═══════════════════════════════════════════ */}
        {fireFeatures.map((feat) => {
          const lng = feat.geometry.coordinates[0];
          const lat = feat.geometry.coordinates[1];
          const isSelected = selectedFire?.id === feat.properties.id;

          const popupData: PopupEventData = {
            id: feat.properties.id,
            title: feat.properties.title,
            latitude: lat,
            longitude: lng,
            date: feat.properties.date,
            source: feat.properties.source,
            category: feat.properties.category,
            link: feat.properties.source_url,
            severity: feat.properties.severity,
          };

          return (
            <Marker
              key={feat.properties.id}
              latitude={lat}
              longitude={lng}
              anchor="center"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setSelectedFire(popupData);
                onFireClick();
              }}
            >
              <div
                className="relative cursor-pointer group"
                title={`${feat.properties.title} (Click to toggle Danger Zone)`}
              >
                {/* Emergency Pulsing Rings */}
                <div
                  className={`absolute -inset-3.5 rounded-full ${
                    isSelected ? "bg-red-500/40 animate-ping" : "bg-red-500/20 animate-pulse-fire"
                  }`}
                />
                <div className="absolute -inset-5 bg-red-500/10 rounded-full animate-pulse-fire [animation-delay:0.4s]" />

                {/* Core Flame Pin */}
                <div
                  className={`relative flex items-center justify-center w-8 h-8 rounded-full border-2 shadow-lg transition-transform group-hover:scale-125 ${
                    isSelected
                      ? "bg-gradient-to-br from-red-600 to-rose-700 border-white shadow-red-500/80 scale-110"
                      : "bg-gradient-to-br from-red-500 to-orange-600 border-red-400/60 shadow-red-500/40"
                  }`}
                >
                  <Flame className="w-4 h-4 text-white" />
                </div>

                {/* Micro badge */}
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap opacity-75 group-hover:opacity-100 transition-opacity">
                  <span className="text-[8px] font-mono text-red-300/80 bg-slate-950/80 px-1 py-0.2 rounded border border-red-500/30">
                    {feat.properties.title.slice(0, 14)}
                  </span>
                </div>
              </div>
            </Marker>
          );
        })}

        {/* ═══════════════════════════════════════════
            Facility Markers (Schools & Hospitals)
            ═══════════════════════════════════════════ */}
        {layers.facilities &&
          FACILITIES_DATA.map((facility) => (
            <Marker
              key={facility.id}
              latitude={facility.latitude}
              longitude={facility.longitude}
              anchor="center"
            >
              <div
                className={`flex items-center justify-center w-6 h-6 rounded-full border-2 shadow-md transition-transform hover:scale-125 ${
                  facility.type === "school"
                    ? "bg-amber-500/80 border-amber-300/50 shadow-amber-500/20"
                    : "bg-cyan-500/80 border-cyan-300/50 shadow-cyan-500/20"
                } ${facility.impacted ? "ring-2 ring-red-500/30 ring-offset-1 ring-offset-transparent" : ""}`}
                title={`${facility.name} — ${facility.distanceFromFire}km from fire`}
              >
                {facility.type === "school" ? (
                  <School className="w-3 h-3 text-white" />
                ) : (
                  <Hospital className="w-3 h-3 text-white" />
                )}
              </div>
            </Marker>
          ))}

        {/* ═══════════════════════════════════════════
            Emergency Marker Popup
            ═══════════════════════════════════════════ */}
        {selectedFire && (
          <Popup
            latitude={selectedFire.latitude}
            longitude={selectedFire.longitude}
            onClose={() => setSelectedFire(null)}
            closeButton={false}
            anchor="bottom"
            offset={24}
            maxWidth="320px"
          >
            <EmergencyMarkerPopup
              event={selectedFire}
              onClose={() => setSelectedFire(null)}
              onActivateRadius={onFireClick}
              isRadiusActive={showVulnerabilityRadius}
            />
          </Popup>
        )}

        {/* ═══════════════════════════════════════════
            Backend Telemetry Status Overlay
            ═══════════════════════════════════════════ */}
        <div className="absolute top-[140px] left-2.5 z-10">
          <div className="glass-panel rounded-lg px-3 py-2 space-y-1.5 min-w-[190px]">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Satellite className="w-3 h-3 text-cyan-400" />
                <span className="text-[9px] font-semibold tracking-[0.15em] text-slate-400 uppercase">
                  FastAPI Telemetry
                </span>
              </div>
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  className="p-1 rounded hover:bg-slate-700/40 text-slate-500 hover:text-cyan-400 transition-colors"
                  title="Refetch backend telemetry"
                >
                  <RefreshCw
                    className={`w-3 h-3 ${isLoading ? "animate-spin text-cyan-400" : ""}`}
                  />
                </button>
              )}
            </div>

            {/* Status Rows */}
            {isLoading && fireFeatures.length === 0 ? (
              <div className="flex items-center gap-2 py-1">
                <Loader2 className="w-3 h-3 text-cyan-400 animate-spin" />
                <span className="text-[10px] text-slate-500 font-mono">
                  Syncing with 127.0.0.1:8000...
                </span>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">Live Fires</span>
                  <div className="flex items-center gap-1.5">
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${
                        isOffline ? "bg-amber-500" : "bg-emerald-500 animate-pulse"
                      }`}
                    />
                    <span className="text-[10px] font-mono text-slate-300">
                      {fireFeatures.length} active
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">Server</span>
                  <div className="flex items-center gap-1">
                    {isOffline ? (
                      <span className="text-[9px] font-mono text-amber-400 bg-amber-500/10 px-1 rounded border border-amber-500/20">
                        OFFLINE (CACHE)
                      </span>
                    ) : (
                      <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1 rounded border border-emerald-500/20">
                        ONLINE :8000
                      </span>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </Map>
    </div>
  );
}
