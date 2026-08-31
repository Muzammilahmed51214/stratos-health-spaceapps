"use client";

import { Layers, Activity, Radio, Loader2 } from "lucide-react";
import type { LayerToggles, AirQualityResponse } from "@/lib/types";

// ─── Layer Configuration ─────────────────────────────────────

const LAYER_OPTIONS: {
  key: keyof LayerToggles;
  label: string;
  sublabel: string;
  dotColor: string;
}[] = [
  {
    key: "tempoNO2",
    label: "NASA TEMPO",
    sublabel: "NO₂ Column Density",
    dotColor: "bg-purple-500",
  },
  {
    key: "epaPM25",
    label: "EPA AirNow",
    sublabel: "PM2.5 Concentration",
    dotColor: "bg-amber-500",
  },
  {
    key: "windVectors",
    label: "Wind Vectors",
    sublabel: "GFS 10m Wind Field",
    dotColor: "bg-teal-500",
  },
  {
    key: "facilities",
    label: "Facility Pins",
    sublabel: "Schools & Hospitals",
    dotColor: "bg-cyan-500",
  },
];

// ─── Component ───────────────────────────────────────────────

interface LeftDockProps {
  layers: LayerToggles;
  onToggleLayer: (key: keyof LayerToggles) => void;
  airQuality?: AirQualityResponse | null;
  isLoading?: boolean;
  isOffline?: boolean;
}

export default function LeftDock({
  layers,
  onToggleLayer,
  airQuality,
  isLoading = false,
  isOffline = false,
}: LeftDockProps) {
  // Extract primary station readings or fallback
  const primaryStation = airQuality?.stations?.[0];

  const telemetryReadings = [
    {
      label: "AQI",
      value: primaryStation?.aqi ? String(primaryStation.aqi) : "287",
      unit: "",
      status: (primaryStation?.aqi || 287) > 200 ? "critical" : "warning",
    },
    {
      label: "NO₂",
      value: primaryStation?.no2 ? String(primaryStation.no2) : "142.3",
      unit: "ppb",
      status: "critical",
    },
    {
      label: "PM2.5",
      value: primaryStation?.pm2_5 ? String(primaryStation.pm2_5) : "185.7",
      unit: "µg/m³",
      status: "critical",
    },
    {
      label: "PM10",
      value: primaryStation?.pm10 ? String(primaryStation.pm10) : "242.1",
      unit: "µg/m³",
      status: "critical",
    },
    {
      label: "WIND",
      value: primaryStation?.wind_speed_mph
        ? `${primaryStation.wind_speed_mph} mph NW`
        : "12 mph NW",
      unit: "",
      status: "warning",
    },
    {
      label: "TEMP",
      value: primaryStation?.temperature_f
        ? String(primaryStation.temperature_f)
        : "94",
      unit: "°F",
      status: "warning",
    },
  ];

  return (
    <aside className="w-[260px] xl:w-[300px] glass-panel border-t-0 border-b-0 border-l-0 flex flex-col overflow-hidden select-none">
      {/* ── Header ── */}
      <div className="px-4 py-3 border-b border-slate-800/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <h2 className="text-[11px] font-semibold tracking-[0.2em] text-slate-400 uppercase">
            Telemetry & Layers
          </h2>
        </div>
        {isLoading && (
          <Loader2 className="w-3 h-3 text-cyan-400 animate-spin" />
        )}
      </div>

      {/* ── Data Layers ── */}
      <div className="px-3 pt-4 pb-2 space-y-1">
        <span className="px-1 text-[10px] font-semibold tracking-[0.15em] text-slate-600 uppercase">
          Data Layers
        </span>

        {LAYER_OPTIONS.map((layer) => {
          const active = layers[layer.key];
          return (
            <button
              key={layer.key}
              onClick={() => onToggleLayer(layer.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-left ${
                active
                  ? "bg-slate-800/50 border border-slate-700/50"
                  : "bg-transparent border border-transparent hover:bg-slate-800/25"
              }`}
            >
              {/* Toggle Dot */}
              <div className="relative flex items-center justify-center w-4 h-4">
                <div
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                    active ? layer.dotColor : "bg-slate-700"
                  }`}
                />
                {active && (
                  <div
                    className={`absolute w-4 h-4 rounded-full ${layer.dotColor} opacity-20 animate-ping`}
                    style={{ animationDuration: "2s" }}
                  />
                )}
              </div>

              {/* Label */}
              <div>
                <div
                  className={`text-sm font-medium transition-colors ${
                    active ? "text-white" : "text-slate-500"
                  }`}
                >
                  {layer.label}
                </div>
                <div className="text-[10px] text-slate-600 leading-tight">
                  {layer.sublabel}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Divider ── */}
      <div className="mx-4 border-t border-slate-800/40" />

      {/* ── Live Metrics ── */}
      <div className="px-3 pt-3 pb-2 flex-1 overflow-y-auto space-y-1.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-semibold tracking-[0.15em] text-slate-600 uppercase">
            Live Metrics
          </span>
          {airQuality?.summary && (
            <span className="text-[9px] font-mono text-cyan-400/80">
              {airQuality.summary.active_monitoring_stations} STATIONS
            </span>
          )}
        </div>

        {telemetryReadings.map((reading) => (
          <div
            key={reading.label}
            className="flex items-center justify-between px-3 py-2 rounded-md bg-slate-800/25"
          >
            <span className="text-[11px] text-slate-500 font-medium">
              {reading.label}
            </span>
            <div className="flex items-center gap-1.5">
              {/* Status Pip */}
              <div
                className={`w-1.5 h-1.5 rounded-full ${
                  reading.status === "critical"
                    ? "bg-red-500"
                    : reading.status === "warning"
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                }`}
              />
              <span
                className={`font-mono text-sm font-semibold tabular-nums ${
                  reading.status === "critical"
                    ? "text-red-400"
                    : reading.status === "warning"
                    ? "text-amber-400"
                    : "text-emerald-400"
                }`}
              >
                {reading.value}
              </span>
              {reading.unit && (
                <span className="text-[10px] text-slate-600 font-mono">
                  {reading.unit}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Status Bar ── */}
      <div className="px-4 py-2.5 border-t border-slate-800/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-3 h-3 text-emerald-500" />
            <span className="text-[10px] text-slate-500 font-mono">
              {isOffline ? "BACKUP CACHE ACTIVE" : "FASTAPI TELEMETRY LIVE"}
            </span>
          </div>
          {isOffline && (
            <span className="flex items-center gap-1 text-[9px] font-mono text-amber-400">
              <Radio className="w-2.5 h-2.5" /> OFFLINE
            </span>
          )}
        </div>
      </div>
    </aside>
  );
}
