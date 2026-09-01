"use client";

import { Play, Pause, SkipBack, SkipForward, Clock } from "lucide-react";
import { TIMELINE_MAX_HOURS, TIMELINE_START } from "../lib/mock-data";

// ─── Types ───────────────────────────────────────────────────

interface TimelineSliderProps {
  currentHour: number;
  onHourChange: (hour: number) => void;
  isPlaying: boolean;
  onPlayPause: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────

function offsetDate(isoStart: string, hours: number): Date {
  const d = new Date(isoStart);
  d.setUTCHours(d.getUTCHours() + hours);
  return d;
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function fmtTime(d: Date) {
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
}

// ─── Component ───────────────────────────────────────────────

export default function TimelineSlider({
  currentHour,
  onHourChange,
  isPlaying,
  onPlayPause,
}: TimelineSliderProps) {
  const start = new Date(TIMELINE_START);
  const current = offsetDate(TIMELINE_START, currentHour);
  const end = offsetDate(TIMELINE_START, TIMELINE_MAX_HOURS);

  return (
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 w-[92%] max-w-[640px] z-10 select-none">
      <div className="glass-panel-strong rounded-2xl px-5 py-3.5 shadow-2xl shadow-black/40">
        {/* ── Header Row ── */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[10px] font-semibold tracking-[0.15em] text-slate-400 uppercase">
              72-Hour Predictive Plume
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-xs text-cyan-400 tabular-nums">
              T+{String(currentHour).padStart(2, "0")}h
            </span>
            <span className="text-slate-600 text-[10px] font-mono">/</span>
            <span className="font-mono text-xs text-slate-500 tabular-nums">
              {TIMELINE_MAX_HOURS}h
            </span>
          </div>
        </div>

        {/* ── Controls + Slider ── */}
        <div className="flex items-center gap-3">
          {/* Playback Buttons */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => onHourChange(0)}
              className="p-1.5 rounded-lg hover:bg-slate-800/60 text-slate-500 hover:text-white transition-colors"
              title="Jump to start"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onPlayPause}
              className="p-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400 transition-all hover:shadow-lg hover:shadow-cyan-500/10"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4 ml-0.5" />
              )}
            </button>

            <button
              onClick={() => onHourChange(TIMELINE_MAX_HOURS)}
              className="p-1.5 rounded-lg hover:bg-slate-800/60 text-slate-500 hover:text-white transition-colors"
              title="Jump to end"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Slider + Time Labels */}
          <div className="flex-1 flex flex-col gap-1.5">
            <input
              type="range"
              min={0}
              max={TIMELINE_MAX_HOURS}
              value={currentHour}
              onChange={(e) => onHourChange(Number(e.target.value))}
              className="w-full cursor-pointer"
            />
            <div className="flex justify-between text-[9px] font-mono px-0.5">
              <span className="text-slate-600">
                {fmtDate(start)} {fmtTime(start)}
              </span>
              <span className="text-slate-400">
                {fmtDate(current)} {fmtTime(current)}
              </span>
              <span className="text-slate-600">
                {fmtDate(end)} {fmtTime(end)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
