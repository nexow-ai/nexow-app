"use client";

import { createClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useState } from "react";

export interface ProfileData {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export function useProfile() {
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setData(null);
        return;
      }

      const { data: profile } = await (supabase.from as Function)("profiles")
        .select("username, display_name, avatar_url")
        .eq("id", user.id)
        .single() as { data: { username: string; display_name: string | null; avatar_url: string | null } | null };

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
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const displayName = data
    ? (data.displayName || data.username)
    : null;

  return { data, displayName, loading, refresh };
}
