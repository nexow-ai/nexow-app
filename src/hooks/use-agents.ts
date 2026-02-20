"use client";

import type { Database } from "@/lib/types/database";
import { useCallback, useEffect, useState } from "react";
import { useSession } from "./use-session";

type Agent = Database["public"]["Tables"]["agents"]["Row"];

export function useAgents(typeFilter?: "bot" | "agent") {
  const { user } = useSession();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    if (!user) {
      setAgents([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const url = typeFilter
      ? `/api/agents?type=${typeFilter}`
      : "/api/agents";
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to fetch agents");
      setAgents([]);
    } else {
      setError(null);
      setAgents(data.agents ?? data ?? []);
    }
    setLoading(false);
  }, [user, typeFilter]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  return { agents, loading, error, refetch: fetchAgents };
}

export function useAgent(id: string) {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAgent = useCallback(async () => {
    const res = await fetch(`/api/agents/${id}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to fetch agent");
      setAgent(null);
    } else {
      setError(null);
      setAgent(data.agent ?? data);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchAgent();
  }, [fetchAgent]);

  return { agent, loading, error, refetch: fetchAgent };
}
