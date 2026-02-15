"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect } from "react";

type RealtimeEvent = "INSERT" | "UPDATE" | "DELETE";

interface UseRealtimeOptions {
  table: string;
  event?: RealtimeEvent | "*";
  filter?: string;
  onPayload: (payload: Record<string, unknown>) => void;
}

export function useRealtime({ table, event = "*", filter, onPayload }: UseRealtimeOptions) {
  useEffect(() => {
    const supabase = createClient();

    const channelConfig: Record<string, string> = {
      event,
      schema: "public",
      table,
    };

    if (filter) {
      channelConfig.filter = filter;
    }

    const channel = supabase
      .channel(`realtime:${table}`)
      .on(
        "postgres_changes" as never,
        channelConfig,
        (payload: Record<string, unknown>) => {
          onPayload(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, event, filter, onPayload]);
}
