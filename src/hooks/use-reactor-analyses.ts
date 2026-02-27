"use client";

import { useCallback, useEffect, useState } from "react";

export interface M1Analysis {
  ts: string;
  open: number;
  high: number;
  low: number;
  close: number;
  ai_technical: number | null;
  ai_momentum: number | null;
  ai_fundamental: number | null;
  ai_structure: number | null;
  ai_session: number | null;
  ai_overall: number | null;
  ai_direction: string | null;
  ai_reasoning: string | null;
}

export function useReactorAnalyses(instrument: string, limit = 3000, from?: string) {
  const [analyses, setAnalyses] = useState<M1Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalyses = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/api/reactor/analyses?instrument=${encodeURIComponent(instrument)}&limit=${limit}`;
      if (from) {
        url += `&from=${encodeURIComponent(from)}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to fetch analyses");
        setAnalyses([]);
      } else {
        setError(null);
        // API now returns ASC order directly
        setAnalyses(data.analyses ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fetch failed");
      setAnalyses([]);
    }
    setLoading(false);
  }, [instrument, limit, from]);

  useEffect(() => {
    fetchAnalyses();
  }, [fetchAnalyses]);

  return { analyses, loading, error, refetch: fetchAnalyses };
}
