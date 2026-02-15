"use client";

import { AgentStatusBadge } from "@/components/agents/agent-status-badge";
import { AgentConsole } from "@/components/trading/agent-console";
import { ChartToolbar } from "@/components/trading/chart-toolbar";
import { TradingViewWidget } from "@/components/trading/trading-view-widget";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createClient } from "@/lib/supabase/client";
import { useAgent } from "@/hooks/use-agents";
import { useTrades } from "@/hooks/use-trades";
import type { InstrumentConfig } from "@/lib/types/database";
import { BarChart3, Loader2, Pause, Play, Radio, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useMemo, useState } from "react";

type TradeView = "live" | "backtest";

interface AgentDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function AgentDetailPage({ params }: AgentDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { agent, loading: agentLoading, refetch } = useAgent(id);
  const {
    trades,
    loading: tradesLoading,
    refetch: refetchTrades,
  } = useTrades(id);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Trade view toggle: live vs backtest
  const [tradeView, setTradeView] = useState<TradeView>("live");

  // Live prices per instrument (for accurate PnL on all open trades)
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});

  // Chart controlled state
  const [activeInstrument, setActiveInstrument] = useState<string>("");
  const [activeTimeframe, setActiveTimeframe] = useState<string>("");

  // Initialize chart state from agent data
  useEffect(() => {
    if (agent && !activeInstrument) {
      setActiveInstrument(agent.instrument);
      setActiveTimeframe(agent.timeframe);
    }
  }, [agent, activeInstrument]);

  // Derive instruments list from agent
  const instruments: InstrumentConfig[] = agent
    ? Array.isArray(agent.instruments) && agent.instruments.length > 0
      ? agent.instruments
      : [{ instrument: agent.instrument, timeframe: agent.timeframe }]
    : [];

  // Fetch live prices for all instruments that have open trades
  const fetchLivePrices = useCallback(async () => {
    const openTrades = trades.filter((t) => t.status === "open");
    if (openTrades.length === 0) return;

    // Get unique instruments from open trades
    const openInstruments = [
      ...new Set(openTrades.map((t) => t.instrument)),
    ];

    const prices: Record<string, number> = { ...livePrices };

    await Promise.all(
      openInstruments.map(async (inst) => {
        try {
          const res = await fetch(`/api/price?instrument=${inst}`);
          if (res.ok) {
            const data = await res.json();
            prices[inst] = data.mid;
          }
        } catch {
          /* ignore */
        }
      })
    );

    setLivePrices(prices);
  }, [trades, livePrices]);

  useEffect(() => {
    fetchLivePrices();
    const interval = setInterval(() => {
      fetchLivePrices();
      refetchTrades();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchLivePrices, refetchTrades]);

  async function handleToggleStatus() {
    if (!agent) return;
    const newStatus = agent.status === "active" ? "paused" : "active";
    setActionLoading("toggle");

    const supabase = createClient();
    await (supabase.from as Function)("agents")
      .update({ status: newStatus })
      .eq("id", agent.id);

    await refetch();
    setActionLoading(null);
  }

  async function handleDelete() {
    if (
      !agent ||
      !confirm(
        "Are you sure you want to delete this agent? This cannot be undone."
      )
    )
      return;
    setActionLoading("delete");

    const supabase = createClient();
    await (supabase.from as Function)("agents").delete().eq("id", agent.id);

    router.push("/agents");
  }

  if (agentLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="py-32 text-center text-zinc-500">Agent not found.</div>
    );
  }

  // Split trades into live and backtest
  const liveTrades = useMemo(
    () => trades.filter((t) => !t.backtest_id),
    [trades]
  );
  const backtestTrades = useMemo(
    () => trades.filter((t) => !!t.backtest_id),
    [trades]
  );
  const hasBacktestData = backtestTrades.length > 0;

  // Use filtered trades for current view
  const viewTrades = tradeView === "live" ? liveTrades : backtestTrades;

  const closedTrades = viewTrades.filter((t) => t.status === "closed");
  const winningTrades = closedTrades.filter((t) => (t.return_pct ?? 0) > 0);
  const totalReturn = closedTrades.reduce(
    (sum, t) => sum + (t.return_pct ?? 0),
    0
  );
  const avgReturn =
    closedTrades.length > 0 ? totalReturn / closedTrades.length : 0;
  const winRate =
    closedTrades.length > 0
      ? (winningTrades.length / closedTrades.length) * 100
      : 0;

  return (
    <div className="space-y-6">
      {/* Agent header */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-800/40 bg-zinc-900/30 p-6 backdrop-blur-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-cyan-500/5" />
        <div className="relative flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-white">
                {agent.name}
              </h1>
              <AgentStatusBadge status={agent.status} />
            </div>
            {agent.description && (
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                {agent.description}
              </p>
            )}
            <div className="mt-3 flex items-center gap-2">
              <Badge
                variant={agent.type === "systematic" ? "info" : "warning"}
              >
                {agent.type}
              </Badge>
              <span className="text-xs text-zinc-600">
                {instruments.map((i) => i.instrument.replace("_", "/")).join(", ")}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {agent.status !== "killed" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleStatus}
                loading={actionLoading === "toggle"}
              >
                {agent.status === "active" ? (
                  <>
                    <Pause className="h-4 w-4" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Resume
                  </>
                )}
              </Button>
            )}
            <Button
              variant="danger"
              size="sm"
              onClick={handleDelete}
              loading={actionLoading === "delete"}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Live / Backtest toggle */}
      {hasBacktestData && (
        <div className="flex items-center gap-1 rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-1 w-fit">
          <button
            onClick={() => setTradeView("live")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              tradeView === "live"
                ? "bg-emerald-500/15 text-emerald-400"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Radio className="h-3 w-3" />
            Live ({liveTrades.length})
          </button>
          <button
            onClick={() => setTradeView("backtest")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              tradeView === "backtest"
                ? "bg-purple-500/15 text-purple-400"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <BarChart3 className="h-3 w-3" />
            Backtest ({backtestTrades.length})
          </button>
        </div>
      )}

      {/* Performance stats */}
      <div className="stagger-children grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {[
          {
            label: "Total Return",
            value: `${totalReturn >= 0 ? "+" : ""}${totalReturn.toFixed(2)}%`,
          },
          {
            label: "Avg Return",
            value: `${avgReturn >= 0 ? "+" : ""}${avgReturn.toFixed(2)}%`,
          },
          { label: "Win Rate", value: `${winRate.toFixed(1)}%` },
          { label: "Trades", value: String(viewTrades.length) },
          {
            label: "Open",
            value: String(
              viewTrades.filter((t) => t.status === "open").length
            ),
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-zinc-800/40 bg-zinc-900/30 p-4 backdrop-blur-sm"
          >
            <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-600">
              {stat.label}
            </p>
            <p className="mt-1.5 text-xl font-bold tracking-tight text-white">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Chart workspace */}
      <div>
        {/* Toolbar */}
        <ChartToolbar
          instruments={instruments}
          activeInstrument={activeInstrument}
          activeTimeframe={activeTimeframe}
          onInstrumentChange={setActiveInstrument}
          onTimeframeChange={setActiveTimeframe}
        />

        {/* Split view: Chart + Console */}
        <div className="flex gap-0" style={{ height: 520 }}>
          {/* Chart */}
          <div className="min-w-0 flex-1 overflow-hidden rounded-bl-xl border-x border-b border-zinc-800/60 bg-zinc-900/20 p-4">
            {activeInstrument && activeTimeframe && (
              <TradingViewWidget
                instrument={activeInstrument}
                granularity={activeTimeframe}
                agentId={agent.id}
                height={460}
              />
            )}
          </div>

          {/* Console */}
          <AgentConsole
            agentId={agent.id}
            className="w-80 shrink-0 rounded-none rounded-br-xl border-b border-r border-zinc-800/60"
          />
        </div>
      </div>

      {/* Trades table */}
      <Card>
        <CardTitle>
          {tradeView === "backtest" ? "Backtest History" : "Signal History"}
          {tradeView === "backtest" && (
            <Badge variant="default" className="ml-2">
              backtest
            </Badge>
          )}
        </CardTitle>
        <CardContent className="mt-4">
          {tradesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
            </div>
          ) : viewTrades.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">
              {tradeView === "backtest"
                ? "No backtest data available for this agent."
                : "No signals yet. Agent will start generating signals when market conditions match."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Instrument</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead>Entry</TableHead>
                  <TableHead>Exit</TableHead>
                  <TableHead>Return</TableHead>
                  <TableHead>SL / TP</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {viewTrades.map((trade) => (
                  <TableRow key={trade.id}>
                    <TableCell className="text-xs">
                      {new Date(trade.opened_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs font-medium text-zinc-300">
                      {trade.instrument.replace("_", "/")}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          trade.direction === "buy" ? "success" : "danger"
                        }
                      >
                        {trade.direction.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {Number(trade.entry_price).toFixed(5)}
                    </TableCell>
                    <TableCell>
                      {trade.exit_price
                        ? Number(trade.exit_price).toFixed(5)
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {trade.status === "closed" &&
                      trade.return_pct != null ? (
                        <span
                          className={
                            trade.return_pct >= 0
                              ? "text-emerald-400"
                              : "text-red-400"
                          }
                        >
                          {trade.return_pct >= 0 ? "+" : ""}
                          {Number(trade.return_pct).toFixed(2)}%
                        </span>
                      ) : trade.status === "open" && livePrices[trade.instrument] ? (
                        (() => {
                          const entry = Number(trade.entry_price);
                          const price = livePrices[trade.instrument];
                          const unreturned =
                            trade.direction === "buy"
                              ? ((price - entry) / entry) * 100
                              : ((entry - price) / entry) * 100;
                          return (
                            <span
                              className={
                                unreturned >= 0
                                  ? "text-emerald-400"
                                  : "text-red-400"
                              }
                            >
                              {unreturned >= 0 ? "+" : ""}
                              {unreturned.toFixed(2)}%
                              <span className="ml-1 text-[10px] text-zinc-600">
                                live
                              </span>
                            </span>
                          );
                        })()
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-zinc-500">
                      {trade.stop_loss_pct != null ||
                      trade.take_profit_pct != null ? (
                        <>
                          {trade.stop_loss_pct != null && (
                            <span className="text-red-400/70">
                              -{Number(trade.stop_loss_pct).toFixed(1)}%
                            </span>
                          )}
                          {trade.stop_loss_pct != null &&
                            trade.take_profit_pct != null &&
                            " / "}
                          {trade.take_profit_pct != null && (
                            <span className="text-emerald-400/70">
                              +{Number(trade.take_profit_pct).toFixed(1)}%
                            </span>
                          )}
                        </>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          trade.status === "open" ? "info" : "default"
                        }
                      >
                        {trade.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
