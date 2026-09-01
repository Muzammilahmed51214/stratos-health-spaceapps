import { NextResponse } from "next/server";
import type { NasaFireEvent } from "../../../lib/types";

/* ═══════════════════════════════════════════════════════════════
   /api/nasa — Aggregates fire & air-quality data from:
     1. NASA EONET v3 (Earth Observatory Natural Event Tracker)
        → Active wildfire events worldwide. No API key required.
     2. NASA FIRMS (Fire Information for Resource Management)
        → Satellite thermal hotspots (VIIRS/MODIS).
        → Requires a free MAP_KEY from https://firms.modaps.eosdis.nasa.gov/api/
   ═══════════════════════════════════════════════════════════════ */

// ─── EONET Response Types ────────────────────────────────────

interface EONETGeometry {
  date: string;
  type: string;
  coordinates: [number, number]; // [lng, lat]
}

interface EONETEvent {
  id: string;
  title: string;
  categories: { id: string; title: string }[];
  sources: { id: string; url: string }[];
  geometry: EONETGeometry[];
}

interface EONETResponse {
  title: string;
  events: EONETEvent[];
}

// ─── Route Handler ───────────────────────────────────────────

export async function GET() {
  let eonetStatus: "ok" | "error" = "ok";
  let firmsStatus: "ok" | "error" | "no_key" = "no_key";
  let events: NasaFireEvent[] = [];
  let hotspots: NasaFireEvent[] = [];

  // 1. Fetch EONET wildfire events
  try {
    events = await fetchEONET();
  } catch (err) {
    console.error("[NASA API] EONET fetch failed:", err);
    eonetStatus = "error";
  }

  // 2. Fetch FIRMS hotspots (optional — needs API key)
  try {
    const firmsResult = await fetchFIRMS();
    hotspots = firmsResult.data;
    firmsStatus = firmsResult.status;
  } catch (err) {
    console.error("[NASA API] FIRMS fetch failed:", err);
    firmsStatus = "error";
  }

  return NextResponse.json(
    {
      events,
      hotspots,
      fetchedAt: new Date().toISOString(),
      sources: {
        eonet: { status: eonetStatus, count: events.length },
        firms: { status: firmsStatus, count: hotspots.length },
      },
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    }
  );
}

// ─── EONET Fetcher ───────────────────────────────────────────

async function fetchEONET(): Promise<NasaFireEvent[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch(
      "https://eonet.gsfc.nasa.gov/api/v3/events?" +
        new URLSearchParams({
          category: "wildfires",
          status: "open",
          limit: "50",
        }),
      {
        signal: controller.signal,
        next: { revalidate: 300 }, // ISR: cache 5 min
      }
    );

    if (!res.ok) {
      throw new Error(`EONET responded ${res.status}`);
    }

    const data: EONETResponse = await res.json();

    return data.events
      .filter((e) => e.geometry.length > 0)
      .map((event) => {
        // Use the most recent geometry entry
        const geo = event.geometry[event.geometry.length - 1];
        return {
          id: event.id,
          title: event.title,
          latitude: geo.coordinates[1],
          longitude: geo.coordinates[0],
          date: geo.date,
          source: "EONET" as const,
          category: event.categories[0]?.title ?? "Wildfire",
          link: event.sources[0]?.url,
        };
      });
  } finally {
    clearTimeout(timeout);
  }
}

// ─── FIRMS Fetcher ───────────────────────────────────────────

async function fetchFIRMS(): Promise<{
  data: NasaFireEvent[];
  status: "ok" | "error" | "no_key";
}> {
  const apiKey = process.env.NASA_FIRMS_MAP_KEY;
  if (!apiKey) {
    return { data: [], status: "no_key" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    // Pacific NW bounding box: west,south,east,north
    // Covers Oregon, Washington, Northern California, parts of Idaho
    const bbox = "-126,41,-116,49";

    const res = await fetch(
      `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${apiKey}/VIIRS_SNPP_NRT/${bbox}/1`,
      {
        signal: controller.signal,
        next: { revalidate: 300 },
      }
    );

    if (!res.ok) {
      throw new Error(`FIRMS responded ${res.status}`);
    }

    const csv = await res.text();
    const lines = csv.trim().split("\n");

    if (lines.length < 2) {
      return { data: [], status: "ok" };
    }

    const headers = lines[0].split(",").map((h) => h.trim());

    const hotspots: NasaFireEvent[] = lines
      .slice(1)
      .map((line, i) => {
        const vals = line.split(",");
        const row: Record<string, string> = {};
        headers.forEach((h, j) => {
          row[h] = vals[j]?.trim() ?? "";
        });

        const lat = parseFloat(row["latitude"]);
        const lng = parseFloat(row["longitude"]);

        if (isNaN(lat) || isNaN(lng)) return null;

        // Parse acquisition time (HHMM format) into ISO string
        const time = (row["acq_time"] ?? "0000").padStart(4, "0");
        const timeFormatted = `${time.slice(0, 2)}:${time.slice(2)}`;
        const dateStr = row["acq_date"]
          ? `${row["acq_date"]}T${timeFormatted}:00Z`
          : new Date().toISOString();

        return {
          id: `FIRMS-${i}-${row["acq_date"]}-${row["acq_time"]}`,
          title: `VIIRS Hotspot — ${row["confidence"] ?? "unknown"} confidence`,
          latitude: lat,
          longitude: lng,
          date: dateStr,
          source: "FIRMS" as const,
          category: "Thermal Anomaly",
          confidence: row["confidence"],
          brightness: parseFloat(row["bright_ti4"]) || undefined,
          frp: parseFloat(row["frp"]) || undefined,
        };
      })
      .filter((h): h is NasaFireEvent => h !== null);

    return { data: hotspots, status: "ok" };
  } finally {
    clearTimeout(timeout);
  }
}
