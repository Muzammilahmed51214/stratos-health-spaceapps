"use client";

import { useState, useEffect } from "react";
import { Shield, AlertTriangle, Radio, Satellite, Server } from "lucide-react";

interface TopBarProps {
  urgencyLevel?: string;
  isOffline?: boolean;
}

export default function TopBar({
  urgencyLevel = "LEVEL 4 - CRITICAL",
  isOffline = false,
}: TopBarProps) {
  const [utcTime, setUtcTime] = useState<string>("");

  useEffect(() => {
    const updateClock = () => {
      setUtcTime(new Date().toISOString().substring(11, 19));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-14 shrink-0 glass-panel border-t-0 border-x-0 flex items-center justify-between px-6 z-50 select-none">
      {/* ── Logo ── */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <Shield className="w-7 h-7 text-cyan-400" />
          <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full" />
        </div>
        <span className="text-lg font-bold tracking-wider">
          <span className="text-cyan-400">STRATOS</span>
          <span className="text-white/90">HEALTH</span>
        </span>
      </div>

      {/* ── Center Telemetry Strip ── */}
      <div className="hidden md:flex items-center gap-5 text-sm">
        {/* Satellite Feed */}
        <div className="flex items-center gap-2">
          <Satellite className="w-4 h-4 text-slate-500" />
          <span className="text-slate-400 text-xs">NASA TEMPO</span>
          <span className="text-emerald-400 font-semibold text-xs tracking-wide">
            LIVE
          </span>
          {/* Pulsing dot — 1 Hz */}
          <span className="relative flex h-2 w-2">
            <span className="animate-pulse-live absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
        </div>

        <div className="w-px h-5 bg-slate-700/60" />

        {/* Backend Connectivity Status */}
        <div className="flex items-center gap-2">
          <Server className={`w-3.5 h-3.5 ${isOffline ? "text-amber-400" : "text-emerald-400"}`} />
          <span className="text-slate-500 text-xs">API:</span>
          <span className={`font-mono text-xs font-semibold ${isOffline ? "text-amber-400" : "text-emerald-400"}`}>
            {isOffline ? "OFFLINE (CACHE)" : "FASTAPI :8000"}
          </span>
        </div>

        <div className="w-px h-5 bg-slate-700/60" />

        {/* Sector */}
        <div className="flex items-center gap-2">
          <Radio className="w-3.5 h-3.5 text-slate-600" />
          <span className="text-slate-500 text-xs">SECTOR</span>
          <span className="font-mono text-xs text-white/80">PACIFIC NW</span>
        </div>

        <div className="w-px h-5 bg-slate-700/60" />

        {/* UTC Clock */}
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-telemetry-blue tabular-nums text-base tracking-wider">
            {utcTime || "--:--:--"}
          </span>
          <span className="text-slate-600 text-[10px] font-mono">UTC</span>
        </div>
      </div>

      {/* ── Alert Badge ── */}
      <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/25 rounded-lg px-3 py-1.5 animate-glow [animation-duration:3s]">
        <AlertTriangle className="w-4 h-4 text-red-400" />
        <span className="text-red-400 font-mono text-xs font-bold tracking-wider">
          ALERT: {urgencyLevel.includes("LEVEL") ? urgencyLevel.split("-")[0].trim() : "LVL 4"}
        </span>
      </div>
    </header>
  );
}
