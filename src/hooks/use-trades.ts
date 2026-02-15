"use client";

import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/types/database";
import { useCallback, useEffect, useState } from "react";

type Trade = Database["public"]["Tables"]["trades"]["Row"];

export function useTrades(agentId?: string) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrades = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    let query = supabase
      .from("trades")
      .select("*")
      .order("opened_at", { ascending: false })
      .limit(500);

    if (agentId) {
      query = query.eq("agent_id", agentId);
    }

    const { data, error } = await query;

    if (error) {
      setError(error.message);
    } else {
      setTrades(data ?? []);
    }
    setLoading(false);
  }, [agentId]);

  useEffect(() => {
    fetchTrades();
  }, [fetchTrades]);

  return { trades, loading, error, refetch: fetchTrades };
}
