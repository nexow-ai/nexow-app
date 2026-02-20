"use client";

import type { Database } from "@/lib/types/database";
import { useCallback, useEffect, useState } from "react";

type Trade = Database["public"]["Tables"]["trades"]["Row"];

export function useTrades(agentId?: string) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrades = useCallback(async () => {
    setLoading(true);
    const url = agentId
      ? `/api/trades?agentId=${encodeURIComponent(agentId)}`
      : "/api/trades";
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to fetch trades");
      setTrades([]);
    } else {
      setError(null);
      setTrades(data.trades ?? []);
    }
    setLoading(false);
  }, [agentId]);

  useEffect(() => {
    fetchTrades();
  }, [fetchTrades]);

  return { trades, loading, error, refetch: fetchTrades };
}
