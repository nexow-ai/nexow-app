"use client";

import { useCallback, useEffect, useState } from "react";

export interface M1Analysis {
  ts: string;
  ai_technical: number | null;
  ai_momentum: number | null;
  ai_fundamental: number | null;
  ai_structure: number | null;
  ai_session: number | null;
  ai_overall: number | null;
  ai_direction: string | null;
}

export function useReactorAnalyses(instrument: string, limit = 3000) {
  const [analyses, setAnalyses] = useState<M1Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalyses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/reactor/analyses?instrument=${encodeURIComponent(instrument)}&limit=${limit}`
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to fetch analyses");
        setAnalyses([]);
      } else {
        setError(null);
        // API returns DESC, reverse to ASC for charting
        setAnalyses((data.analyses ?? []).reverse());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fetch failed");
      setAnalyses([]);
    }
    setLoading(false);
  }, [instrument, limit]);

  useEffect(() => {
    fetchAnalyses();
  }, [fetchAnalyses]);

  return { analyses, loading, error, refetch: fetchAnalyses };
}
