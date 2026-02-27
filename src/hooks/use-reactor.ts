"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "./use-session";

export interface ReactorConfig {
  id: string;
  user_id: string;
  instrument: string;
  trades_per_day: number;
  risk_mode: "percentage" | "fixed";
  risk_value: number;
  timeframe: string;
  weight_technical: number;
  weight_momentum: number;
  weight_fundamental: number;
  weight_structure: number;
  weight_session: number;
  confidence_threshold: number;
  reward_ratio: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useReactorConfigs() {
  const { user, loading: sessionLoading } = useSession();
  const [configs, setConfigs] = useState<ReactorConfig[]>([]);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConfigs = useCallback(async () => {
    if (!user) {
      setConfigs([]);
      setFetching(false);
      return;
    }
    setFetching(true);
    const res = await fetch("/api/reactor");
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to fetch configs");
      setConfigs([]);
    } else {
      setError(null);
      setConfigs(data.configs ?? []);
    }
    setFetching(false);
  }, [user]);

  useEffect(() => {
    if (sessionLoading) return;
    fetchConfigs();
  }, [sessionLoading, fetchConfigs]);

  const loading = sessionLoading || fetching;
  return { configs, loading, error, refetch: fetchConfigs };
}

export function useReactorConfig(id: string) {
  const [config, setConfig] = useState<ReactorConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    const res = await fetch(`/api/reactor/${id}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to fetch config");
      setConfig(null);
    } else {
      setError(null);
      setConfig(data.config ?? data);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  return { config, loading, error, refetch: fetchConfig };
}
