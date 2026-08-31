"use client";

import { useState, useEffect, useCallback } from "react";
import type { NasaFireEvent, NasaApiResponse } from "@/lib/types";

/* ═══════════════════════════════════════════════════════════════
   useNasaData — Client hook that polls /api/nasa for live
   wildfire events (EONET) and thermal hotspots (FIRMS).
   ═══════════════════════════════════════════════════════════════ */

interface NasaDataState {
  events: NasaFireEvent[];
  hotspots: NasaFireEvent[];
  fetchedAt: string | null;
  isLoading: boolean;
  error: string | null;
  sources: NasaApiResponse["sources"] | null;
}

const INITIAL_STATE: NasaDataState = {
  events: [],
  hotspots: [],
  fetchedAt: null,
  isLoading: true,
  error: null,
  sources: null,
};

export function useNasaData(refreshIntervalMs = 300_000) {
  const [state, setState] = useState<NasaDataState>(INITIAL_STATE);

  const fetchData = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const res = await fetch("/api/nasa");

      if (!res.ok) {
        throw new Error(`API returned ${res.status}`);
      }

      const data: NasaApiResponse = await res.json();

      setState({
        events: data.events ?? [],
        hotspots: data.hotspots ?? [],
        fetchedAt: data.fetchedAt,
        isLoading: false,
        error: null,
        sources: data.sources,
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : "Unknown error",
      }));
    }
  }, []);

  // Initial fetch + polling interval
  useEffect(() => {
    fetchData();

    const interval = setInterval(fetchData, refreshIntervalMs);
    return () => clearInterval(interval);
  }, [fetchData, refreshIntervalMs]);

  return { ...state, refresh: fetchData };
}
