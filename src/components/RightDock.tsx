"use client";

import { useState, useEffect, useRef } from "react";
import {
  Shield,
  School,
  Hospital,
  Users,
  MapPin,
  Flame,
  AlertTriangle,
  Brain,
  ChevronRight,
  Zap,
  Radio,
  Clock,
  Loader2,
} from "lucide-react";
import { WILDFIRE_DATA, FACILITIES_DATA } from "@/lib/mock-data";
import type { TacticalAdvisoryResponse } from "@/lib/types";

// ─── Component Props ─────────────────────────────────────────

interface RightDockProps {
  advisory: TacticalAdvisoryResponse | null;
  isLoading?: boolean;
  isOffline?: boolean;
}

export default function RightDock({
  advisory,
  isLoading = false,
  isOffline = false,
}: RightDockProps) {
  const [advisoryText, setAdvisoryText] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const scrollRef = useRef<HTMLPreElement>(null);

  // Raw text to stream
  const targetText =
    advisory?.raw_advisory_text ||
    "Initializing neural telemetry parser...\nConnecting to HYSPLIT + TEMPO dispersion engine...";

  // ── Typing effect for AI Advisory ──
  useEffect(() => {
    setIsTyping(true);
    let index = 0;

    const interval = setInterval(() => {
      if (index <= targetText.length) {
        setAdvisoryText(targetText.slice(0, index));
        index += 3;
      } else {
        setIsTyping(false);
        clearInterval(interval);
      }
    }, 12);

    return () => clearInterval(interval);
  }, [targetText]);

  // Auto-scroll advisory as text streams
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [advisoryText]);

  const atRiskPop = advisory?.at_risk_population
    ? `${(advisory.at_risk_population / 1000).toFixed(1)}k`
    : "38.4k";

  const peakAQI = advisory?.highest_recorded_aqi || 287;
  const firesCount = advisory?.active_fires_detected || 1;

  // ── Stats config ──
  const stats = [
    {
      icon: School,
      label: "Schools Impacted",
      value: 12,
      color: "text-amber-400",
      bg: "bg-amber-500/8",
      border: "border-amber-500/15",
    },
    {
      icon: Hospital,
      label: "Hospitals Impacted",
      value: 3,
      color: "text-cyan-400",
      bg: "bg-cyan-500/8",
      border: "border-cyan-500/15",
    },
    {
      icon: Users,
      label: "At-Risk Population",
      value: atRiskPop,
      color: "text-red-400",
      bg: "bg-red-500/8",
      border: "border-red-500/15",
    },
    {
      icon: Flame,
      label: "Active Fires",
      value: firesCount,
      color: "text-orange-400",
      bg: "bg-orange-500/8",
      border: "border-orange-500/15",
    },
    {
      icon: MapPin,
      label: "Peak AQI",
      value: peakAQI,
      color: "text-purple-400",
      bg: "bg-purple-500/8",
      border: "border-purple-500/15",
    },
    {
      icon: Shield,
      label: "Shelters Active",
      value: advisory?.shelter_assignments?.length || 3,
      color: "text-emerald-400",
      bg: "bg-emerald-500/8",
      border: "border-emerald-500/15",
    },
  ];

  return (
    <aside className="w-[300px] xl:w-[360px] glass-panel border-t-0 border-b-0 border-r-0 flex flex-col overflow-hidden select-none">
      {/* ═══════════════════════════════════════════
          TOP HALF — Vulnerability Matrix
          ═══════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col overflow-hidden border-b border-slate-800/50">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-800/40 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h2 className="text-[11px] font-semibold tracking-[0.2em] text-slate-400 uppercase">
              Vulnerability Matrix
            </h2>
          </div>
          {isLoading && (
            <Loader2 className="w-3 h-3 text-cyan-400 animate-spin" />
          )}
        </div>

        <div className="p-3 space-y-3 overflow-y-auto flex-1">
          {/* ── Active Fire Card ── */}
          <div className="bg-gradient-to-br from-red-500/10 to-orange-500/5 border border-red-500/20 rounded-xl p-3">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-5 h-5 bg-red-500/20 rounded-md">
                  <Flame className="w-3 h-3 text-red-400" />
                </div>
                <span className="text-sm font-semibold text-red-400">
                  {WILDFIRE_DATA.name}
                </span>
              </div>
              <span className="text-[9px] font-mono bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded border border-red-500/30">
                {advisory?.urgency_level || "LVL 4"}
              </span>
            </div>

            <div className="font-mono text-[10px] text-slate-500 mb-2.5">
              {WILDFIRE_DATA.latitude.toFixed(4)}°N&nbsp;&nbsp;
              {Math.abs(WILDFIRE_DATA.longitude).toFixed(4)}°W
            </div>

            {/* Containment Bar */}
            <div className="flex items-center gap-3">
              <div>
                <div className="text-[9px] text-slate-600 tracking-wider font-semibold">
                  CONTAINMENT
                </div>
                <div className="font-mono text-2xl font-bold text-red-400 leading-none mt-0.5">
                  {WILDFIRE_DATA.containment}
                  <span className="text-sm text-red-500/60">%</span>
                </div>
              </div>
              <div className="flex-1">
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-red-500 to-orange-400 rounded-full transition-all duration-700"
                    style={{ width: `${WILDFIRE_DATA.containment}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Stats Grid ── */}
          <div className="grid grid-cols-2 gap-2">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className={`${stat.bg} border ${stat.border} rounded-lg p-2.5`}
              >
                <stat.icon className={`w-3.5 h-3.5 ${stat.color} mb-1`} />
                <div
                  className={`font-mono text-xl font-bold ${stat.color} leading-none`}
                >
                  {stat.value}
                </div>
                <div className="text-[9px] text-slate-500 mt-1 leading-tight">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* ── Evacuation Routes from API ── */}
          {advisory?.evacuation_routes && advisory.evacuation_routes.length > 0 && (
            <div>
              <span className="text-[10px] font-semibold tracking-[0.15em] text-slate-500 uppercase">
                Active Evacuation Routes
              </span>
              <div className="mt-1.5 space-y-1">
                {advisory.evacuation_routes.map((route, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-slate-800/30 border border-slate-800 text-xs"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${
                          route.status === "CLEAR"
                            ? "bg-emerald-400"
                            : route.status === "ADVISORY"
                            ? "bg-amber-400"
                            : "bg-red-400"
                        }`}
                      />
                      <span className="text-slate-300 text-[11px] truncate">
                        {route.corridor}
                      </span>
                    </div>
                    <span className="font-mono text-[9px] text-slate-500 shrink-0 ml-1">
                      {route.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Nearest Facilities ── */}
          <div>
            <span className="text-[10px] font-semibold tracking-[0.15em] text-slate-600 uppercase">
              Impacted Facilities
            </span>
            <div className="mt-1.5 space-y-1">
              {FACILITIES_DATA.filter((f) => f.impacted)
                .slice(0, 3)
                .map((facility) => (
                  <div
                    key={facility.id}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-slate-800/25 text-xs"
                  >
                    {facility.type === "school" ? (
                      <School className="w-3 h-3 text-amber-400 shrink-0" />
                    ) : (
                      <Hospital className="w-3 h-3 text-cyan-400 shrink-0" />
                    )}
                    <span className="text-slate-300 truncate flex-1 text-[11px]">
                      {facility.name}
                    </span>
                    <span className="font-mono text-[10px] text-slate-600">
                      {facility.distanceFromFire}km
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          BOTTOM HALF — AI Tactical Advisory
          ═══════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-800/40 shrink-0">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-cyan-400" />
            <h2 className="text-[11px] font-semibold tracking-[0.2em] text-slate-400 uppercase">
              AI Tactical Advisory
            </h2>
            {isTyping ? (
              <div className="ml-auto flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-cyan-400 animate-pulse" />
                <span className="text-[9px] text-cyan-400/80 font-mono tracking-wider">
                  STREAMING
                </span>
              </div>
            ) : isOffline ? (
              <div className="ml-auto flex items-center gap-1">
                <Radio className="w-3 h-3 text-amber-400" />
                <span className="text-[8px] text-amber-400/80 font-mono">
                  CACHED
                </span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Advisory Content */}
        <div className="p-3 flex-1 overflow-y-auto">
          <div className="bg-cyan-500/[0.04] border border-cyan-500/10 rounded-xl p-3 h-full flex flex-col">
            {/* Status line */}
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-800/30">
              <ChevronRight className="w-3 h-3 text-cyan-400" />
              <span className="text-[10px] font-mono text-cyan-400 font-semibold truncate">
                {advisory?.status || "ANALYSIS COMPLETE"}
              </span>
              <span className="text-[10px] font-mono text-slate-600 ml-auto shrink-0 flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                {advisory?.timestamp
                  ? new Date(advisory.timestamp).toLocaleTimeString("en-US", {
                      hour12: false,
                      timeZone: "UTC",
                    }) + " UTC"
                  : "LIVE"}
              </span>
            </div>

            {/* Typing text container */}
            <pre
              ref={scrollRef}
              className="text-[11px] text-slate-300 font-mono whitespace-pre-wrap leading-relaxed flex-1 overflow-y-auto"
            >
              {advisoryText}
              {isTyping && (
                <span className="inline-block w-1.5 h-3.5 bg-cyan-400 ml-0.5 animate-typing rounded-[1px]" />
              )}
            </pre>

            {/* Model Footer */}
            {advisory?.model_version && (
              <div className="mt-2 pt-2 border-t border-slate-800/30 flex items-center justify-between text-[9px] font-mono text-slate-500">
                <span>{advisory.model_version}</span>
                <span className="text-cyan-400/80">
                  CONF: {advisory.confidence_score}%
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
