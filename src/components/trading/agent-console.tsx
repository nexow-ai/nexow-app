"use client";

import { createClient } from "@/lib/supabase/client";
import { Terminal, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LogEntry {
  id: string;
  time: Date;
  level: "info" | "trade" | "close" | "warn" | "error";
  message: string;
}

interface AgentConsoleProps {
  agentId: string;
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

const LEVEL_COLORS: Record<string, string> = {
  info: "text-zinc-500",
  trade: "text-emerald-400",
  close: "text-blue-400",
  warn: "text-amber-400",
  error: "text-red-400",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AgentConsole({ agentId, className }: AgentConsoleProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const addLog = useCallback((entry: Omit<LogEntry, "id">) => {
    setLogs((prev) => [
      ...prev.slice(-200), // Keep last 200 entries
      { ...entry, id: `${Date.now()}-${Math.random()}` },
    ]);
  }, []);

  // ── Load initial trades as log history ─────────────────────────────────

  useEffect(() => {
    async function loadHistory() {
      try {
        const supabase = createClient();
        const { data: trades } = await (supabase.from as Function)("trades")
          .select("*")
          .eq("agent_id", agentId)
          .order("opened_at", { ascending: false })
          .limit(30);

        if (trades && trades.length > 0) {
          const entries: LogEntry[] = [];

          for (const trade of (trades as Array<Record<string, unknown>>).reverse()) {
            entries.push({
              id: `entry-${trade.id}`,
              time: new Date(trade.opened_at as string),
              level: "trade",
              message: `SIGNAL ${(trade.direction as string).toUpperCase()} ${(trade.instrument as string).replace("_", "/")} @ ${Number(trade.entry_price).toFixed(5)}`,
            });

            if (trade.status === "closed" && trade.closed_at) {
              const returnPct = trade.return_pct as number | null;
              const returnStr =
                returnPct != null
                  ? ` ${returnPct >= 0 ? "+" : ""}${returnPct.toFixed(2)}%`
                  : "";
              entries.push({
                id: `exit-${trade.id}`,
                time: new Date(trade.closed_at as string),
                level: "close",
                message: `CLOSED ${(trade.instrument as string).replace("_", "/")} @ ${Number(trade.exit_price).toFixed(5)}${returnStr}`,
              });
            }
          }

          setLogs(entries);
        }
      } catch {
        // Trade history unavailable
      }

      addLog({
        time: new Date(),
        level: "info",
        message: "Console connected. Listening for signals...",
      });
    }

    loadHistory();
  }, [agentId, addLog]);

  // ── Supabase realtime subscription for new trades ──────────────────────

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`console:trades:${agentId}`)
      .on(
        "postgres_changes" as never,
        {
          event: "*",
          schema: "public",
          table: "trades",
          filter: `agent_id=eq.${agentId}`,
        },
        (payload: Record<string, unknown>) => {
          const record = (payload.new ?? payload.old) as Record<
            string,
            unknown
          > | null;
          if (!record) return;

          const eventType = payload.eventType as string;

          if (eventType === "INSERT") {
            addLog({
              time: new Date(),
              level: "trade",
              message: `SIGNAL ${(record.direction as string).toUpperCase()} ${(record.instrument as string).replace("_", "/")} @ ${Number(record.entry_price).toFixed(5)}`,
            });
          } else if (eventType === "UPDATE" && record.status === "closed") {
            const returnPct = record.return_pct as number | null;
            const returnStr =
              returnPct != null
                ? ` ${returnPct >= 0 ? "+" : ""}${Number(returnPct).toFixed(2)}%`
                : "";
            addLog({
              time: new Date(),
              level: "close",
              message: `CLOSED ${(record.instrument as string).replace("_", "/")} @ ${Number(record.exit_price).toFixed(5)}${returnStr}`,
            });
          }
        }
      )
      .subscribe((status: string) => {
        setConnected(status === "SUBSCRIBED");
      });

    // Also subscribe to agent_logs table (if it exists — graceful)
    let logsChannel: ReturnType<typeof supabase.channel> | null = null;
    try {
      logsChannel = supabase
        .channel(`console:logs:${agentId}`)
        .on(
          "postgres_changes" as never,
          {
            event: "INSERT",
            schema: "public",
            table: "agent_logs",
            filter: `agent_id=eq.${agentId}`,
          },
          (payload: Record<string, unknown>) => {
            const record = payload.new as Record<string, unknown> | null;
            if (!record) return;

            addLog({
              time: new Date(record.created_at as string),
              level: (record.level as LogEntry["level"]) || "info",
              message: record.message as string,
            });
          }
        )
        .subscribe();
    } catch {
      // agent_logs table may not exist yet
    }

    return () => {
      supabase.removeChannel(channel);
      if (logsChannel) supabase.removeChannel(logsChannel);
    };
  }, [agentId, addLog]);

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-xl border border-zinc-800/60 bg-black/30 ${className ?? ""}`}
    >
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-zinc-800/40 px-3 py-2">
        <div className="flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5 text-zinc-500" />
          <span className="text-xs font-semibold text-zinc-400">Console</span>
          <span
            className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-emerald-500" : "bg-zinc-600"}`}
          />
        </div>
        <button
          onClick={() => setLogs([])}
          className="text-zinc-600 transition-colors hover:text-zinc-400"
          title="Clear console"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      {/* Log entries */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 font-mono text-[11px] leading-relaxed"
      >
        {logs.length === 0 ? (
          <p className="text-zinc-600">Waiting for events...</p>
        ) : (
          logs.map((entry) => (
            <div key={entry.id} className="flex gap-2">
              <span className="shrink-0 text-zinc-600">
                [{formatTime(entry.time)}]
              </span>
              <span className={LEVEL_COLORS[entry.level] ?? "text-zinc-500"}>
                {entry.message}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
