"use client";

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
import type {
  BacktestResult,
  BacktestState,
  BacktestTrade,
  EquityPoint,
} from "@/hooks/use-backtest";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Clock,
  Play,
  Rocket,
  TrendingDown,
  TrendingUp,
  Trophy,
  XCircle,
  ArrowLeft,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

// ------------------------------------------------------------------
// Props
// ------------------------------------------------------------------

interface BacktestPanelProps {
  state: BacktestState;
  onRunBacktest: () => void;
  onDeploy: () => void;
  onBack: () => void;
  onCancel: () => void;
  deployLoading?: boolean;
}

// ------------------------------------------------------------------
// Component
// ------------------------------------------------------------------

export function BacktestPanel({
  state,
  onRunBacktest,
  onDeploy,
  onBack,
  onCancel,
  deployLoading,
}: BacktestPanelProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-800/40 bg-zinc-900/30 p-6 backdrop-blur-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-transparent to-blue-500/5" />
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white">
                Backtest Your Strategy
              </h2>
              <p className="text-sm text-zinc-500">
                Simulate the last 365 days of market data to see how your
                agent would have performed
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Idle state */}
      {state.phase === "idle" && <IdleState onRun={onRunBacktest} onBack={onBack} />}

      {/* Running state — live equity curve */}
      {(state.phase === "fetching" || state.phase === "simulating") && (
        <SimulationView state={state} onCancel={onCancel} />
      )}

      {/* Error state */}
      {state.phase === "error" && (
        <ErrorState message={state.message} onRetry={onRunBacktest} onBack={onBack} />
      )}

      {/* Results */}
      {state.phase === "complete" && state.result && (
        <ResultsView
          result={state.result}
          onDeploy={onDeploy}
          onBack={onBack}
          deployLoading={deployLoading}
        />
      )}
    </div>
  );
}

// ------------------------------------------------------------------
// Idle state — CTA to run backtest
// ------------------------------------------------------------------

function IdleState({ onRun, onBack }: { onRun: () => void; onBack: () => void }) {
  return (
    <Card className="flex flex-col items-center justify-center py-16">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-400">
        <Play className="h-8 w-8" />
      </div>
      <h3 className="mt-5 text-lg font-semibold text-white">
        Ready to Backtest
      </h3>
      <p className="mt-2 max-w-md text-center text-sm leading-relaxed text-zinc-500">
        Run your strategy against 1 year of real market data. The backtest uses
        the exact same rule engine as live trading for accurate results.
      </p>
      <div className="mt-8 flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Back to Review
        </Button>
        <Button onClick={onRun}>
          <Play className="h-4 w-4" />
          Run 1-Year Backtest
        </Button>
      </div>
    </Card>
  );
}

// ------------------------------------------------------------------
// Simulation view — live equity curve instead of boring progress bar
// ------------------------------------------------------------------

function SimulationView({ state, onCancel }: { state: BacktestState; onCancel: () => void }) {
  const hasEquityData = state.liveEquityCurve.length > 0;

  return (
    <div className="space-y-4">
      {/* Live equity curve chart */}
      <Card>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-purple-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-purple-500" />
            </span>
            {state.phase === "fetching"
              ? "Fetching Market Data..."
              : "Live Simulation"}
          </CardTitle>
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-zinc-500">
              {state.progressPct}%
            </span>
            <Button variant="outline" size="sm" onClick={onCancel}>
              <XCircle className="h-3.5 w-3.5" />
              Cancel
            </Button>
          </div>
        </div>
        <CardContent className="mt-3">
          {hasEquityData ? (
            <LiveEquityCurveChart data={state.liveEquityCurve} />
          ) : (
            <div className="flex h-[300px] items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 animate-bounce rounded-full bg-purple-500 [animation-delay:-0.3s]" />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-purple-500 [animation-delay:-0.15s]" />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-purple-500" />
                </div>
                <p className="text-sm text-zinc-500">
                  {state.message || "Fetching historical candles..."}
                </p>
              </div>
            </div>
          )}

          {/* Thin progress bar beneath the chart */}
          <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500 ease-out"
              style={{ width: `${state.progressPct}%` }}
            />
          </div>
          <p className="mt-2 text-center text-xs text-zinc-600">
            {state.message}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ------------------------------------------------------------------
// Error state
// ------------------------------------------------------------------

function ErrorState({
  message,
  onRetry,
  onBack,
}: {
  message: string;
  onRetry: () => void;
  onBack: () => void;
}) {
  return (
    <Card className="flex flex-col items-center justify-center py-16">
      <XCircle className="h-10 w-10 text-red-400" />
      <h3 className="mt-4 text-lg font-semibold text-white">Backtest Failed</h3>
      <p className="mt-2 max-w-md text-center text-sm text-zinc-500">{message}</p>
      <div className="mt-6 flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button onClick={onRetry}>Retry</Button>
      </div>
    </Card>
  );
}

// ------------------------------------------------------------------
// Results view — stats + equity curve + trade list
// ------------------------------------------------------------------

function ResultsView({
  result,
  onDeploy,
  onBack,
  deployLoading,
}: {
  result: BacktestResult;
  onDeploy: () => void;
  onBack: () => void;
  deployLoading?: boolean;
}) {
  const { stats, trades, equity_curve } = result;

  return (
    <div className="space-y-6">
      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Total Return"
          value={`${stats.total_return_pct >= 0 ? "+" : ""}${stats.total_return_pct.toFixed(2)}%`}
          variant={stats.total_return_pct >= 0 ? "positive" : "negative"}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <StatCard
          label="Win Rate"
          value={`${stats.win_rate.toFixed(1)}%`}
          variant={stats.win_rate >= 50 ? "positive" : "neutral"}
          icon={<Trophy className="h-4 w-4" />}
        />
        <StatCard
          label="Max Drawdown"
          value={`-${stats.max_drawdown.toFixed(2)}%`}
          variant="negative"
          icon={<TrendingDown className="h-4 w-4" />}
        />
        <StatCard
          label="Sharpe Ratio"
          value={stats.sharpe_ratio.toFixed(2)}
          variant={stats.sharpe_ratio >= 1 ? "positive" : "neutral"}
          icon={<Activity className="h-4 w-4" />}
        />
        <StatCard
          label="Profit Factor"
          value={stats.profit_factor >= 999 ? "inf" : stats.profit_factor.toFixed(2)}
          variant={stats.profit_factor >= 1.5 ? "positive" : "neutral"}
          icon={<BarChart3 className="h-4 w-4" />}
        />
        <StatCard
          label="Total Trades"
          value={String(stats.total_trades)}
          variant="neutral"
          icon={<Activity className="h-4 w-4" />}
        />
        <StatCard
          label="Avg Duration"
          value={formatDuration(stats.avg_trade_duration_hours)}
          variant="neutral"
          icon={<Clock className="h-4 w-4" />}
        />
        <StatCard
          label="Best / Worst"
          value={`${stats.best_trade_pct >= 0 ? "+" : ""}${stats.best_trade_pct.toFixed(2)}% / ${stats.worst_trade_pct.toFixed(2)}%`}
          variant="neutral"
          icon={<TrendingUp className="h-4 w-4" />}
        />
      </div>

      {/* Equity curve */}
      {equity_curve.length > 0 && (
        <Card>
          <CardTitle>Equity Curve</CardTitle>
          <CardContent className="mt-4">
            <EquityCurveChart data={equity_curve} />
          </CardContent>
        </Card>
      )}

      {/* Trade list */}
      <Card>
        <CardTitle>
          Trade History
          <Badge variant="default" className="ml-2">
            {trades.length}
          </Badge>
        </CardTitle>
        <CardContent className="mt-4">
          <TradeTable trades={trades} />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between rounded-2xl border border-zinc-800/40 bg-zinc-900/30 p-6 backdrop-blur-sm">
        <div>
          <p className="text-sm font-medium text-zinc-300">
            {stats.total_return_pct >= 0
              ? "Your strategy shows positive results!"
              : "Consider tweaking your strategy before deploying."}
          </p>
          <p className="mt-1 text-xs text-zinc-600">
            Past performance does not guarantee future results.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
            Edit Strategy
          </Button>
          <Button onClick={onDeploy} loading={deployLoading}>
            <Rocket className="h-4 w-4" />
            Deploy Agent
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Stat card sub-component
// ------------------------------------------------------------------

function StatCard({
  label,
  value,
  variant,
  icon,
}: {
  label: string;
  value: string;
  variant: "positive" | "negative" | "neutral";
  icon: React.ReactNode;
}) {
  const colorMap = {
    positive: "text-emerald-400",
    negative: "text-red-400",
    neutral: "text-zinc-200",
  };

  return (
    <div className="rounded-2xl border border-zinc-800/40 bg-zinc-900/30 p-4 backdrop-blur-sm">
      <div className="flex items-center gap-2 text-zinc-600">
        {icon}
        <p className="text-[11px] font-medium uppercase tracking-wider">
          {label}
        </p>
      </div>
      <p className={`mt-1.5 text-lg font-bold tracking-tight ${colorMap[variant]}`}>
        {value}
      </p>
    </div>
  );
}

// ------------------------------------------------------------------
// Live equity curve chart — appends data incrementally during sim
// ------------------------------------------------------------------

function LiveEquityCurveChart({
  data,
}: {
  data: EquityPoint[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof import("lightweight-charts").createChart> | null>(null);
  const seriesRef = useRef<ReturnType<ReturnType<typeof import("lightweight-charts").createChart>["addSeries"]> | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Initialize chart once
  useEffect(() => {
    if (!containerRef.current || initialized) return;

    let cancelled = false;

    const init = async () => {
      const { createChart, AreaSeries, ColorType } = await import(
        "lightweight-charts"
      );

      if (cancelled || !containerRef.current) return;

      const chart = createChart(containerRef.current, {
        width: containerRef.current.clientWidth,
        height: 300,
        layout: {
          background: { type: ColorType.Solid, color: "transparent" },
          textColor: "#71717a",
          fontSize: 11,
        },
        grid: {
          vertLines: { color: "rgba(63, 63, 70, 0.3)" },
          horzLines: { color: "rgba(63, 63, 70, 0.3)" },
        },
        rightPriceScale: {
          borderColor: "rgba(63, 63, 70, 0.5)",
        },
        timeScale: {
          borderColor: "rgba(63, 63, 70, 0.5)",
          timeVisible: true,
        },
        crosshair: {
          vertLine: { color: "rgba(168, 85, 247, 0.4)" },
          horzLine: { color: "rgba(168, 85, 247, 0.4)" },
        },
      });

      const series = chart.addSeries(AreaSeries, {
        lineColor: "rgba(168, 85, 247, 1)",
        topColor: "rgba(168, 85, 247, 0.3)",
        bottomColor: "rgba(168, 85, 247, 0.02)",
        lineWidth: 2,
      });

      chartRef.current = chart;
      seriesRef.current = series;

      const resizeObserver = new ResizeObserver(() => {
        if (chartRef.current && containerRef.current) {
          chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
        }
      });
      resizeObserver.observe(containerRef.current);

      setInitialized(true);
    };

    init();

    return () => {
      cancelled = true;
    };
  }, [initialized]);

  // Update data when it changes
  useEffect(() => {
    if (!seriesRef.current || !chartRef.current || data.length === 0) return;

    const chartData = data
      .map((d) => ({
        time: Math.floor(new Date(d.time).getTime() / 1000) as import("lightweight-charts").Time,
        value: d.equity,
      }))
      .sort((a, b) => (a.time as number) - (b.time as number));

    seriesRef.current.setData(chartData);
    chartRef.current.timeScale().fitContent();
  }, [data]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      chartRef.current?.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  return <div ref={containerRef} className="h-[300px] w-full" />;
}

// ------------------------------------------------------------------
// Static equity curve chart (for final results)
// ------------------------------------------------------------------

function EquityCurveChart({
  data,
}: {
  data: EquityPoint[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;

    let chart: ReturnType<typeof import("lightweight-charts").createChart> | null = null;

    const init = async () => {
      const { createChart, AreaSeries, ColorType } = await import(
        "lightweight-charts"
      );

      if (!containerRef.current) return;

      chart = createChart(containerRef.current, {
        width: containerRef.current.clientWidth,
        height: 300,
        layout: {
          background: { type: ColorType.Solid, color: "transparent" },
          textColor: "#71717a",
          fontSize: 11,
        },
        grid: {
          vertLines: { color: "rgba(63, 63, 70, 0.3)" },
          horzLines: { color: "rgba(63, 63, 70, 0.3)" },
        },
        rightPriceScale: {
          borderColor: "rgba(63, 63, 70, 0.5)",
        },
        timeScale: {
          borderColor: "rgba(63, 63, 70, 0.5)",
          timeVisible: true,
        },
        crosshair: {
          vertLine: { color: "rgba(168, 85, 247, 0.4)" },
          horzLine: { color: "rgba(168, 85, 247, 0.4)" },
        },
      });

      const areaSeries = chart.addSeries(AreaSeries, {
        lineColor: "rgba(168, 85, 247, 1)",
        topColor: "rgba(168, 85, 247, 0.3)",
        bottomColor: "rgba(168, 85, 247, 0.02)",
        lineWidth: 2,
      });

      const chartData = data
        .map((d) => ({
          time: Math.floor(new Date(d.time).getTime() / 1000) as import("lightweight-charts").Time,
          value: d.equity,
        }))
        .sort((a, b) => (a.time as number) - (b.time as number));

      areaSeries.setData(chartData);
      chart.timeScale().fitContent();

      const resizeObserver = new ResizeObserver(() => {
        if (chart && containerRef.current) {
          chart.applyOptions({ width: containerRef.current.clientWidth });
        }
      });
      resizeObserver.observe(containerRef.current);
    };

    init();

    return () => {
      chart?.remove();
    };
  }, [data]);

  return <div ref={containerRef} className="h-[300px] w-full" />;
}

// ------------------------------------------------------------------
// Trade table sub-component
// ------------------------------------------------------------------

function TradeTable({ trades }: { trades: BacktestTrade[] }) {
  if (trades.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-zinc-500">
        No trades were generated during the backtest period.
      </p>
    );
  }

  // Show last 50 trades (most recent first)
  const displayTrades = [...trades].reverse().slice(0, 50);

  return (
    <div className="max-h-[400px] overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Entry Time</TableHead>
            <TableHead>Instrument</TableHead>
            <TableHead>Direction</TableHead>
            <TableHead>Entry</TableHead>
            <TableHead>Exit</TableHead>
            <TableHead>Return</TableHead>
            <TableHead>SL / TP</TableHead>
            <TableHead>Duration</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayTrades.map((trade, idx) => (
            <TableRow key={idx}>
              <TableCell className="text-xs">
                {new Date(trade.entry_time).toLocaleString()}
              </TableCell>
              <TableCell className="text-xs font-medium text-zinc-300">
                {trade.instrument.replace("_", "/")}
              </TableCell>
              <TableCell>
                <Badge
                  variant={trade.direction === "buy" ? "success" : "danger"}
                >
                  {trade.direction.toUpperCase()}
                </Badge>
              </TableCell>
              <TableCell>{trade.entry_price.toFixed(5)}</TableCell>
              <TableCell>
                {trade.exit_price ? trade.exit_price.toFixed(5) : "\u2014"}
              </TableCell>
              <TableCell>
                {trade.return_pct != null ? (
                  <span
                    className={
                      trade.return_pct >= 0
                        ? "text-emerald-400"
                        : "text-red-400"
                    }
                  >
                    {trade.return_pct >= 0 ? "+" : ""}
                    {trade.return_pct.toFixed(2)}%
                  </span>
                ) : (
                  "\u2014"
                )}
              </TableCell>
              <TableCell className="text-xs text-zinc-500">
                {trade.stop_loss_pct != null || trade.take_profit_pct != null ? (
                  <>
                    {trade.stop_loss_pct != null && (
                      <span className="text-red-400/70">
                        -{trade.stop_loss_pct.toFixed(1)}%
                      </span>
                    )}
                    {trade.stop_loss_pct != null &&
                      trade.take_profit_pct != null &&
                      " / "}
                    {trade.take_profit_pct != null && (
                      <span className="text-emerald-400/70">
                        +{trade.take_profit_pct.toFixed(1)}%
                      </span>
                    )}
                  </>
                ) : (
                  "\u2014"
                )}
              </TableCell>
              <TableCell className="text-xs text-zinc-500">
                {trade.entry_time && trade.exit_time
                  ? formatDuration(
                      (new Date(trade.exit_time).getTime() -
                        new Date(trade.entry_time).getTime()) /
                        3600000
                    )
                  : "\u2014"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {trades.length > 50 && (
        <p className="mt-2 text-center text-xs text-zinc-600">
          Showing 50 of {trades.length} trades
        </p>
      )}
    </div>
  );
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

function formatDuration(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${hours.toFixed(1)}h`;
  const days = hours / 24;
  return `${days.toFixed(1)}d`;
}
