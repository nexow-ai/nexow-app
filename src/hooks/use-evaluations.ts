"use client";

import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/types/database";
import { useCallback, useEffect, useState } from "react";

type Evaluation = Database["public"]["Tables"]["agent_evaluations"]["Row"];

export function useEvaluations(agentId?: string) {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvaluations = useCallback(async () => {
    if (!agentId) return;
    setLoading(true);
    const supabase = createClient();

    const { data, error: fetchError } = await supabase
      .from("agent_evaluations")
      .select("*")
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setEvaluations(data ?? []);
    }
    setLoading(false);
  }, [agentId]);

  useEffect(() => {
    fetchEvaluations();
  }, [fetchEvaluations]);

  useEffect(() => {
    if (!agentId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`evaluations:${agentId}`)
      .on(
        "postgres_changes" as never,
        {
          event: "INSERT",
          schema: "public",
          table: "agent_evaluations",
          filter: `agent_id=eq.${agentId}`,
        },
        (payload: Record<string, unknown>) => {
          const record = payload.new as Evaluation | null;
          if (!record) return;
          setEvaluations((prev) => [record, ...prev].slice(0, 100));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [agentId]);

  const totalTokens = evaluations.reduce((sum, e) => sum + (e.total_tokens ?? 0), 0);
  const avgTokens = evaluations.length > 0 ? Math.round(totalTokens / evaluations.length) : 0;

  return {
    evaluations,
    loading,
    error,
    refetch: fetchEvaluations,
    totalTokens,
    avgTokens,
  };
}
