"use client";

import { Badge } from "@/components/ui/badge";
import type { ReactorConfig } from "@/hooks/use-reactor";
import { useReactorAnalyses } from "@/hooks/use-reactor-analyses";
import { useReactorTrades } from "@/hooks/use-trades";
import { WEIGHT_SECTIONS } from "./reactor-form";
import {
  TF_INTERVAL,
  DOMAIN_COLORS,
  WEIGHT_MAP,
  DOMAIN_AI_KEY,
  hexWithWeightOpacity,
  aggregateAnalyses,
} from "@/lib/reactor-utils";
import { cn } from "@/lib/utils";
import { ChevronRight, ExternalLink, Loader2, Pencil, Power, ScrollText } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

interface SignalLogEntry {
  id: string;
  signal_type: string;
  confidence: number;
  reason: string;
  candle_ts: string;
  created_at: string;
  timeframe: string;
}

function useSignalLog(configId: string) {
  const [logs, setLogs] = useState<SignalLogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reactor/signal-log?configId=${configId}&limit=30`);
      const data = await res.json();
      if (res.ok) setLogs(data.logs ?? []);
    } catch { /* silent */ }
    setLoading(false);
  }, [configId]);

  return { logs, loading, fetchLogs };
}

interface ReactorPanelProps {
  config: ReactorConfig;
  onToggleActive?: () => void;
  toggleLoading?: boolean;
}

function formatDuration(ms: number): string {
  if (ms < 60_000) return "<1m";
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hrs < 24) return remMins > 0 ? `${hrs}h ${remMins}m` : `${hrs}h`;
  const days = Math.floor(hrs / 24);
  const remHrs = hrs % 24;
  return remHrs > 0 ? `${days}d ${remHrs}h` : `${days}d`;
}

export function ReactorPanel({ config, onToggleActive, toggleLoading }: ReactorPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [reasoningOpen, setReasoningOpen] = useState(false);
  const [signalLogOpen, setSignalLogOpen] = useState(false);
  const { logs: signalLogs, loading: signalLogLoading, fetchLogs } = useSignalLog(config.id);

  const { analyses, loading: analysesLoading, refetch: refetchAnalyses } =
    useReactorAnalyses(config.instrument, 500);
  const { trades, loading: tradesLoading, refetch: refetchTrades } =
    useReactorTrades(config.id);

  // Auto-refresh analyses every 60s, trades every 30s
  useEffect(() => {
    const aId = setInterval(refetchAnalyses, 60_000);
    const tId = setInterval(refetchTrades, 30_000);
    return () => {
      clearInterval(aId);
      clearInterval(tId);
    };
  }, [refetchAnalyses, refetchTrades]);

  // Aggregate domain data
  const domainData = useMemo(
    () =>
      WEIGHT_SECTIONS.map((section) => ({
        key: section.key,
        label: section.label,
        color: DOMAIN_COLORS[section.key],
        weight: config[WEIGHT_MAP[section.key]] as number,
        data: aggregateAnalyses(analyses, section.key, config.timeframe),
      })),
    [analyses, config],
  );

  // Compute overall weighted score per timestamp
  const overallData = useMemo(() => {
    if (domainData.length === 0 || domainData[0].data.length === 0) return [];
    const count = domainData[0].data.length;
    const result: { time: number; value: number }[] = [];
    for (let i = 0; i < count; i++) {
      const time = domainData[0].data[i].time;
      let weighted = 0;
      for (const d of domainData) {
        if (d.data[i]) weighted += d.data[i].value * d.weight;
      }
      result.push({ time, value: Math.round(weighted * 1000) / 1000 });
    }
    return result;
  }, [domainData]);

  // Overall score = last point
  const overallScore =
    overallData.length > 0 ? overallData[overallData.length - 1].value : 0;

  // Direction from latest M1 analysis majority vote
  const direction = useMemo(() => {
    if (analyses.length === 0) return "HOLD";
    const interval = TF_INTERVAL[config.timeframe] ?? 60;
    const lastTs = Math.floor(
      new Date(analyses[analyses.length - 1].ts).getTime() / 1000,
    );
    const candleOpen = lastTs - (lastTs % interval);
    const candleAnalyses = analyses.filter((a) => {
      const ts = Math.floor(new Date(a.ts).getTime() / 1000);
      return ts >= candleOpen && ts < candleOpen + interval;
    });
    const buys = candleAnalyses.filter((a) => a.ai_direction === "buy").length;
    const sells = candleAnalyses.filter(
      (a) => a.ai_direction === "sell",
    ).length;
    if (buys > sells) return "BUY";
    if (sells > buys) return "SELL";
    return "HOLD";
  }, [analyses, config.timeframe]);

  // Above/below threshold
  const aboveThreshold = overallScore >= config.confidence_threshold;

  // Last AI reasoning
  const lastReasoning = useMemo(() => {
    if (analyses.length === 0) return null;
    // Search from the end for the first analysis with ai_reasoning
    for (let i = analyses.length - 1; i >= 0; i--) {
      if (analyses[i].ai_reasoning) {
        return {
          text: analyses[i].ai_reasoning!,
          ts: analyses[i].ts,
        };
      }
    }
    return null;
  }, [analyses]);

  // Trades
  const openTrades = useMemo(
    () => trades.filter((t) => t.status === "open"),
    [trades],
  );
  const closedTrades = useMemo(
    () => trades.filter((t) => t.status === "closed"),
    [trades],
  );
  const totalPnl = closedTrades.reduce(
    (sum, t) => sum + (t.return_pct ?? 0),
    0,
  );
  const winCount = closedTrades.filter(
    (t) => (t.return_pct ?? 0) > 0,
  ).length;
  const winRate =
    closedTrades.length > 0 ? (winCount / closedTrades.length) * 100 : 0;

  // Domain scores (last value)
  const domainScores = domainData.map((d) => ({
    ...d,
    lastScore: d.data.length > 0 ? d.data[d.data.length - 1].value : 0,
  }));

  const isLoading = analysesLoading && analyses.length === 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800/40 bg-zinc-900/30 backdrop-blur-sm">
      {/* Compact header — always visible */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-zinc-800/20"
      >
        <div className="flex items-center gap-3">
          <ChevronRight
            className={cn(
              "h-3.5 w-3.5 text-zinc-600 transition-transform",
              expanded && "rotate-90",
            )}
          />
          <span
            className={cn(
              "inline-block h-2 w-2 rounded-full",
              config.is_active ? "bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.5)]" : "bg-zinc-600",
            )}
          />
          <span className="font-semibold text-zinc-100">
            {config.instrument.replace("_", "/")}
          </span>
          <span className="rounded-md bg-zinc-800/80 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-500">
            {config.timeframe}
          </span>

          {/* Inline score + direction */}
          {!isLoading && analyses.length > 0 && (
            <>
              <span className="font-mono text-sm font-bold text-zinc-200">
                {overallScore.toFixed(2)}
              </span>
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px] font-bold",
                  direction === "BUY" && "bg-emerald-500/15 text-emerald-400",
                  direction === "SELL" && "bg-red-500/15 text-red-400",
                  direction === "HOLD" && "bg-yellow-500/15 text-yellow-400",
                )}
              >
                {direction}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Inline trade summary */}
          {openTrades.length > 0 && (
            <span className="text-[10px] text-emerald-400/70">
              {openTrades.length} open
            </span>
          )}
          {closedTrades.length > 0 && (
            <span className="text-[10px] text-zinc-500">
              {closedTrades.length} trades
              <span className={cn("ml-1 font-semibold", totalPnl >= 0 ? "text-emerald-400" : "text-red-400")}>
                {totalPnl >= 0 ? "+" : ""}{totalPnl.toFixed(2)}%
              </span>
            </span>
          )}

          {/* Action links (stop propagation so they don't toggle expand) */}
          <span className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            {onToggleActive && (
              <button
                onClick={onToggleActive}
                disabled={toggleLoading}
                className={cn(
                  "rounded-md p-1.5 transition-colors",
                  config.is_active
                    ? "text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                    : "text-zinc-600 hover:bg-zinc-800 hover:text-zinc-400",
                  toggleLoading && "opacity-50",
                )}
                title={config.is_active ? "Deactivate" : "Activate"}
              >
                {toggleLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Power className="h-3 w-3" />}
              </button>
            )}
            <Link
              href={`/reactor/${config.id}?tab=edit`}
              className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
            >
              <Pencil className="h-3 w-3" />
            </Link>
            <Link
              href={`/reactor/${config.id}`}
              className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-emerald-400"
            >
              <ExternalLink className="h-3 w-3" />
            </Link>
          </span>
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-zinc-800/40 px-5 py-4 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
            </div>
          ) : (
            <>
              {/* Score vs threshold */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-zinc-500">
                  Score <span className="font-mono font-semibold text-zinc-200">{overallScore.toFixed(2)}</span>
                </span>
                <span
                  className={cn(
                    "text-xs",
                    aboveThreshold ? "text-emerald-400/70" : "text-zinc-500",
                  )}
                >
                  vs threshold {config.confidence_threshold.toFixed(2)}
                  {aboveThreshold ? " (above)" : " (below)"}
                </span>
                {analyses.length === 0 && (
                  <span className="text-xs text-zinc-600">No analyses yet</span>
                )}
              </div>

              {/* Domain score badges */}
              <div className="flex flex-wrap gap-1.5">
                {domainScores.map((d) => (
                  <div
                    key={d.key}
                    className="flex items-center gap-1 rounded-md border border-zinc-800/50 bg-zinc-800/30 px-2 py-0.5 text-[11px]"
                  >
                    <span
                      className="inline-block h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: hexWithWeightOpacity(d.color, d.weight) }}
                    />
                    <span className="text-zinc-500">{d.label}</span>
                    <span className="font-mono font-semibold text-zinc-300">
                      {d.lastScore.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Open Trades */}
              {openTrades.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400/70">
                    Open Trades
                  </p>
                  {openTrades.map((trade) => {
                    const durationMs = Date.now() - new Date(trade.opened_at).getTime();
                    return (
                      <div
                        key={trade.id}
                        className="flex items-center gap-2 rounded-lg bg-zinc-800/30 px-3 py-1.5 text-[11px]"
                      >
                        <Badge variant={trade.direction === "buy" ? "success" : "danger"}>
                          {trade.direction.toUpperCase()}
                        </Badge>
                        <span className="font-mono text-zinc-300">@ {trade.entry_price.toFixed(5)}</span>
                        <span className="text-zinc-700">|</span>
                        <span className="text-zinc-500">
                          {trade.stop_loss_pct != null && <span className="text-red-400/70">SL -{trade.stop_loss_pct.toFixed(2)}%</span>}
                          {trade.stop_loss_pct != null && trade.take_profit_pct != null && " / "}
                          {trade.take_profit_pct != null && <span className="text-emerald-400/70">TP +{trade.take_profit_pct.toFixed(2)}%</span>}
                        </span>
                        <span className="text-zinc-700">|</span>
                        <span className="text-zinc-500">{formatDuration(durationMs)}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Trade history summary */}
              {closedTrades.length > 0 && (
                <div className="flex items-center gap-3 text-xs text-zinc-500">
                  <span>History: {closedTrades.length} closed</span>
                  <span className="text-zinc-700">|</span>
                  <span>Win rate <span className="font-semibold text-zinc-300">{winRate.toFixed(0)}%</span></span>
                  <span className="text-zinc-700">|</span>
                  <span>PnL <span className={cn("font-semibold", totalPnl >= 0 ? "text-emerald-400" : "text-red-400")}>{totalPnl >= 0 ? "+" : ""}{totalPnl.toFixed(2)}%</span></span>
                </div>
              )}

              {!tradesLoading && trades.length === 0 && openTrades.length === 0 && (
                <p className="text-xs text-zinc-600">No trades yet.</p>
              )}

              {/* AI Reasoning collapsible */}
              {lastReasoning && (
                <div className="border-t border-zinc-800/40 pt-3">
                  <button
                    onClick={() => setReasoningOpen(!reasoningOpen)}
                    className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 transition-colors hover:text-zinc-200"
                  >
                    <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", reasoningOpen && "rotate-90")} />
                    AI Reasoning
                    <span className="ml-1 text-zinc-600">
                      {new Date(lastReasoning.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </button>
                  {reasoningOpen && (
                    <div className="mt-2 rounded-lg bg-zinc-800/30 px-3 py-2.5">
                      <p className="whitespace-pre-wrap text-xs leading-relaxed text-zinc-300">{lastReasoning.text}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Signal Log collapsible */}
              <div className="border-t border-zinc-800/40 pt-3">
                <button
                  onClick={() => {
                    const opening = !signalLogOpen;
                    setSignalLogOpen(opening);
                    if (opening && signalLogs.length === 0) fetchLogs();
                  }}
                  className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 transition-colors hover:text-zinc-200"
                >
                  <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", signalLogOpen && "rotate-90")} />
                  <ScrollText className="h-3 w-3" />
                  Signal Log
                </button>
                {signalLogOpen && (
                  <div className="mt-2 space-y-1">
                    {signalLogLoading && signalLogs.length === 0 && (
                      <div className="flex items-center gap-2 py-2 text-xs text-zinc-500">
                        <Loader2 className="h-3 w-3 animate-spin" /> Loading...
                      </div>
                    )}
                    {!signalLogLoading && signalLogs.length === 0 && (
                      <p className="py-2 text-xs text-zinc-600">
                        No signal logs yet. Logs will appear once the reactor evaluates candles.
                      </p>
                    )}
                    {signalLogs.map((log) => (
                      <div
                        key={log.id}
                        className={cn(
                          "flex items-start gap-2 rounded-lg px-3 py-1.5 text-[11px]",
                          log.signal_type === "hold" ? "bg-zinc-800/20" : "bg-emerald-500/5",
                        )}
                      >
                        <span
                          className={cn(
                            "mt-0.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full",
                            log.signal_type === "buy" && "bg-emerald-400",
                            log.signal_type === "sell" && "bg-red-400",
                            log.signal_type === "hold" && "bg-zinc-600",
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className={cn("font-semibold uppercase", log.signal_type === "buy" && "text-emerald-400", log.signal_type === "sell" && "text-red-400", log.signal_type === "hold" && "text-zinc-500")}>
                              {log.signal_type}
                            </span>
                            <span className="font-mono text-zinc-500">{log.confidence.toFixed(3)}</span>
                            <span className="text-zinc-700">
                              {new Date(log.created_at).toLocaleString([], { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <p className="mt-0.5 text-zinc-500 break-words">{log.reason}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
