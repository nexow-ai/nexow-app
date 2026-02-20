"use client";

import type { User } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";

export function useSession() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/session");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Session check failed");
        setUser(null);
        return;
      }
      setUser(data.user ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Session check failed");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { user, loading, error, refetch };
}
