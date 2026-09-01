"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { AlertCircle, RefreshCw } from "lucide-react";
import TopBar from "../components/TopBar";
import LeftDock from "../components/LeftDock";
import RightDock from "../components/RightDock";
import TimelineSlider from "../components/TimelineSlider";
import Footer from "../components/Footer";
import { useBackendTelemetry } from "../hooks/useBackendTelemetry";
import type { LayerToggles } from "../lib/types";

// ─── Dynamic Imports (SSR-safe for Mapbox GL) ────────────────

const MapComponent = dynamic(() => import("../components/MapComponent"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-obsidian">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-2 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin mx-auto" />
        <div className="space-y-1">
          <p className="text-xs text-slate-500 font-mono tracking-wider">
            INITIALIZING MAP ENGINE
          </p>
          <p className="text-[10px] text-slate-600 font-mono">
            Connecting to Mapbox GL...
          </p>
        </div>
      </div>
    </div>
  ),
});

// ─── Main Page Component ─────────────────────────────────────

export default function Home() {
  // Layer visibility state
  const [layers, setLayers] = useState<LayerToggles>({
    tempoNO2: true,
    epaPM25: true,
    windVectors: false,
    facilities: true,
  });

  // Vulnerability radius toggle (fires on fire marker click)
  const [showVulnerabilityRadius, setShowVulnerabilityRadius] = useState(false);

  // Timeline playback state
  const [timelineHour, setTimelineHour] = useState(12);
  const [isPlaying, setIsPlaying] = useState(false);

  // ── Live FastAPI Backend Telemetry Hook ──
  const {
    fires,
    airQuality,
    advisory,
    isLoading,
    isOffline,
    errorMessage,
    refetch,
  } = useBackendTelemetry(20_000); // Polling every 20 seconds

  // ── Timeline auto-advance ──
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setTimelineHour((prev) => {
        if (prev >= 72) {
          setIsPlaying(false);
          return 72;
        }
        return prev + 1;
      });
    }, 200); // ~5x real-time speed

    return () => clearInterval(interval);
  }, [isPlaying]);

  // ── Handlers ──
  const toggleLayer = useCallback((key: keyof LayerToggles) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleFireClick = useCallback(() => {
    setShowVulnerabilityRadius((prev) => !prev);
  }, []);

  const handlePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-obsidian text-white">
      {/* ── Top Bar ── */}
      <TopBar
        urgencyLevel={advisory?.urgency_level}
        isOffline={isOffline}
      />

      {/* ── Offline Banner (Graceful Degradation) ── */}
      {isOffline && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-1.5 flex items-center justify-between text-xs text-amber-300 z-40 select-none">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="font-mono text-[11px]">
              Telemetry server offline (http://127.0.0.1:8000). Running in local cached mode.
            </span>
          </div>
          <button
            onClick={refetch}
            className="flex items-center gap-1 text-[10px] font-mono text-cyan-400 hover:underline cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" /> Retry Connection
          </button>
        </div>
      )}

      {/* ── Main Content Stage ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Dock — Telemetry & Layers */}
        <LeftDock
          layers={layers}
          onToggleLayer={toggleLayer}
          airQuality={airQuality}
          isLoading={isLoading}
          isOffline={isOffline}
        />

        {/* Center Stage — Map + Timeline */}
        <main className="flex-1 relative overflow-hidden">
          <MapComponent
            layers={layers}
            showVulnerabilityRadius={showVulnerabilityRadius}
            onFireClick={handleFireClick}
            fireFeatures={fires?.features || []}
            isLoading={isLoading}
            isOffline={isOffline}
            onRefresh={refetch}
          />

          {/* Floating Timeline Slider */}
          <TimelineSlider
            currentHour={timelineHour}
            onHourChange={setTimelineHour}
            isPlaying={isPlaying}
            onPlayPause={handlePlayPause}
          />

          {/* Vulnerability Radius Status Badge */}
          {showVulnerabilityRadius && (
            <div className="absolute top-4 right-4 z-10 bg-red-500/15 border border-red-500/30 rounded-lg px-3 py-1.5 backdrop-blur-sm shadow-lg shadow-red-500/10 animate-fade-in">
              <span className="text-[10px] font-mono text-red-400 tracking-wider font-semibold">
                ● VULNERABILITY RADIUS ACTIVE — 25km DANGER ZONE
              </span>
            </div>
          )}
        </main>

        {/* Right Dock — Vulnerability Matrix + AI Advisory */}
        <RightDock
          advisory={advisory}
          isLoading={isLoading}
          isOffline={isOffline}
        />
      </div>

      {/* ── Footer ── */}
      <Footer />
    </div>
  );
}
