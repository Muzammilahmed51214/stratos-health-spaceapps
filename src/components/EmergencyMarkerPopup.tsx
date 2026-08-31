"use client";

import {
  X,
  ExternalLink,
  Flame,
  Satellite,
  MapPin,
  Clock,
  Zap,
  Thermometer,
  ShieldAlert,
} from "lucide-react";
import type { FireGeoJSONFeature, FireFeatureProperties } from "@/lib/types";

/* ═══════════════════════════════════════════════════════════════
   EmergencyMarkerPopup — Glassmorphic popup rendered inside
   react-map-gl's <Popup> component when an emergency fire marker
   is clicked. Tailwind-styled with the Aero-Modern Dark theme.
   ═══════════════════════════════════════════════════════════════ */

export interface PopupEventData {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  date: string;
  source: string;
  category: string;
  confidence?: string;
  brightness?: number;
  frp?: number;
  link?: string;
  severity?: "low" | "moderate" | "high" | "critical";
}

interface EmergencyMarkerPopupProps {
  event: PopupEventData;
  onClose: () => void;
  onActivateRadius?: () => void;
  isRadiusActive?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────

function formatCoord(lat: number, lng: number) {
  const latDir = lat >= 0 ? "N" : "S";
  const lngDir = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(4)}°${latDir}  ${Math.abs(lng).toFixed(4)}°${lngDir}`;
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  } catch {
    return iso;
  }
}

function formatTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "UTC",
    });
  } catch {
    return "";
  }
}

function getSeverityColor(sev?: string) {
  if (sev === "critical") return { bg: "bg-red-500/15", text: "text-red-400", border: "border-red-500/30" };
  if (sev === "high") return { bg: "bg-orange-500/15", text: "text-orange-400", border: "border-orange-500/30" };
  if (sev === "moderate") return { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/30" };
  return { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30" };
}

function DetailRow({
  icon: Icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 py-1">
      <Icon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
      <span className="text-[10px] text-slate-500 w-16 shrink-0">{label}</span>
      <span
        className={`text-[11px] text-slate-300 ${mono ? "font-mono tabular-nums" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

export default function EmergencyMarkerPopup({
  event,
  onClose,
  onActivateRadius,
  isRadiusActive = false,
}: EmergencyMarkerPopupProps) {
  const sev = getSeverityColor(event.severity || "high");

  return (
    <div className="min-w-[260px] max-w-[300px] select-none">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="shrink-0 flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-red-500/20 to-orange-500/10 border border-red-500/30">
            <Flame className="w-3.5 h-3.5 text-red-400" />
          </div>
          <div className="min-w-0">
            <h3 className="text-[13px] font-semibold text-white leading-tight truncate">
              {event.title}
            </h3>
            <span className="text-[10px] text-slate-500">{event.category}</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="shrink-0 p-1 rounded-md hover:bg-slate-700/50 text-slate-500 hover:text-white transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── Divider ── */}
      <div className="border-t border-slate-700/40 mb-2.5" />

      {/* ── Detail Rows ── */}
      <div className="space-y-0.5">
        <DetailRow
          icon={MapPin}
          label="Coords"
          value={formatCoord(event.latitude, event.longitude)}
          mono
        />
        <DetailRow
          icon={Clock}
          label="Detected"
          value={`${formatDate(event.date)} ${formatTime(event.date)} UTC`}
        />
        <DetailRow
          icon={Satellite}
          label="Source"
          value={event.source || "NASA EONET / FIRMS"}
        />
        {event.frp != null && (
          <DetailRow
            icon={Zap}
            label="FRP"
            value={`${event.frp.toFixed(1)} MW`}
            mono
          />
        )}
        {event.brightness != null && (
          <DetailRow
            icon={Thermometer}
            label="Bright."
            value={`${event.brightness.toFixed(1)} K`}
            mono
          />
        )}
      </div>

      {/* ── Severity / Confidence Badge ── */}
      <div className="mt-3 flex items-center justify-between gap-2">
        <div
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md ${sev.bg} border ${sev.border}`}
        >
          <ShieldAlert className={`w-3 h-3 ${sev.text}`} />
          <span className={`text-[9px] font-mono font-bold tracking-wider ${sev.text}`}>
            SEVERITY: {(event.severity || "CRITICAL").toUpperCase()}
          </span>
        </div>

        {onActivateRadius && (
          <button
            onClick={onActivateRadius}
            className={`text-[9px] font-mono px-2 py-0.5 rounded border transition-all ${
              isRadiusActive
                ? "bg-red-500/20 text-red-300 border-red-500/40"
                : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
            }`}
          >
            {isRadiusActive ? "RADIUS: ON" : "25km RADIUS"}
          </button>
        )}
      </div>

      {/* ── Source Link ── */}
      {event.link && (
        <a
          href={event.link}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg
            bg-cyan-500/10 border border-cyan-500/20 text-cyan-400
            hover:bg-cyan-500/20 hover:border-cyan-500/30 transition-all
            text-[11px] font-medium"
        >
          View Telemetry Report
          <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  );
}
