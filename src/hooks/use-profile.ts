"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "./use-session";

export interface ProfileData {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export function useProfile() {
  const { user } = useSession();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/profile");
      if (!res.ok) {
        setData(null);
        return;
      }
      const profile = await res.json();
      if (profile) {
        setData({
          username: profile.username,
          displayName: profile.display_name ?? null,
          avatarUrl: profile.avatar_url ?? null,
        });
      } else {
        setData(null);
      }
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const displayName = data
    ? (data.displayName || data.username)
    : null;

  return { data, displayName, loading, refresh };
}
