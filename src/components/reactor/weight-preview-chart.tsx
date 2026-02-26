"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useReactorAnalyses } from "@/hooks/use-reactor-analyses";
import {
  TF_INTERVAL,
  DOMAIN_COLORS,
  hexWithWeightOpacity,
  aggregateAnalyses,
  aggregateOHLC,
  runBacktest,
  optimizeWeights,
  type BacktestResult,
  type OptimizeResult,
} from "@/lib/reactor-utils";
import { WEIGHT_SECTIONS, type WeightKey } from "./reactor-form";
import { cn } from "@/lib/utils";
import { TradeBoxPrimitive, type TradeBox } from "@/lib/trade-box-primitive";
import { Eye, EyeOff, List, Loader2, BarChart3, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface WeightPreviewChartProps {
  instrument: string;
  timeframe: string;
  weights: Record<WeightKey, number>;
  confidenceThreshold: number;
  riskMode: string;
  riskValue: number;
  rewardRatio: number;
  tradesPerDay: number;
  balance: number | null;
  onWeightsChange?: (weights: Record<WeightKey, number>) => void;
  onThresholdChange?: (threshold: number) => void;
}

export function WeightPreviewChart({
  instrument,
  timeframe,
  weights,
  confidenceThreshold,
  riskMode,
  riskValue,
  rewardRatio,
  tradesPerDay,
  balance,
  onWeightsChange,
  onThresholdChange,
}: WeightPreviewChartProps) {
  const [backtestFrom, setBacktestFrom] = useState<string>("");
  const { analyses, loading } = useReactorAnalyses(
    instrument,
    50000,
    backtestFrom || undefined,
  );
  const [activeTab, setActiveTab] = useState<"chart" | "trades">("chart");
  const [optimizing, setOptimizing] = useState(false);
  const [optimizeMsg, setOptimizeMsg] = useState<string | null>(null);
  const [showSkipped, setShowSkipped] = useState(false);

  // Aggregate domain scores per timeframe candle
  const domainData = useMemo(
    () =>
      WEIGHT_SECTIONS.map((section) => ({
        key: section.key,
        label: section.label,
        color: DOMAIN_COLORS[section.key],
        weight: weights[section.key],
        data: aggregateAnalyses(analyses, section.key, timeframe),
      })),
    [analyses, timeframe, weights],
  );

  // Weighted overall score per candle
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

  // Confluence zones: 1 when above threshold, 0 when below
  const confluenceData = useMemo(() => {
    return overallData.map((d) => ({
      time: d.time,
      value: d.value >= confidenceThreshold ? 1 : 0,
    }));
  }, [overallData, confidenceThreshold]);

  // Direction derived from weighted score (respects user weight config)
  // > 0.66 = bullish (buy), < 0.33 = bearish (sell), between = hold (neutral zone)
  const directionData = useMemo(() => {
    const result = new Map<number, string>();
    for (const d of overallData) {
      result.set(d.time, d.value >= 0.66 ? "buy" : d.value <= 0.33 ? "sell" : "hold");
    }
    return result;
  }, [overallData]);

  // OHLC candles
  const ohlcData = useMemo(
    () => aggregateOHLC(analyses, timeframe),
    [analyses, timeframe],
  );

  // Run backtest simulation
  const backtest = useMemo<BacktestResult>(() => {
    return runBacktest({
      ohlcCandles: ohlcData,
      overallScores: overallData,
      directions: directionData,
      confidenceThreshold,
      riskMode,
      riskValue,
      rewardRatio,
      tradesPerDay,
    });
  }, [ohlcData, overallData, directionData, confidenceThreshold, riskMode, riskValue, rewardRatio, tradesPerDay]);

  const handleOptimize = useCallback(() => {
    if (!onWeightsChange || overallData.length === 0) return;
    setOptimizing(true);
    setOptimizeMsg(null);
    // Defer so the loading spinner renders before the CPU-bound work
    setTimeout(() => {
      const t0 = performance.now();
      const result = optimizeWeights({
        domainScores: domainData.map((d) => ({ key: d.key, data: d.data })),
        ohlcCandles: ohlcData,
        riskMode,
        riskValue,
        rewardRatio,
        tradesPerDay,
      });
      const elapsed = Math.round(performance.now() - t0);
      setOptimizing(false);
      if (result) {
        onWeightsChange(result.weights as Record<WeightKey, number>);
        onThresholdChange?.(result.confidenceThreshold);
        setOptimizeMsg(
          `Best: ${result.backtest.totalReturnR >= 0 ? "+" : ""}${result.backtest.totalReturnR.toFixed(2)}R` +
          ` in ${result.backtest.trades.length} trades` +
          ` · threshold ${result.confidenceThreshold.toFixed(2)}` +
          ` (${result.combinationsTested.toLocaleString()} combos in ${elapsed}ms)`
        );
      } else {
        setOptimizeMsg("Not enough data to optimize");
      }
    }, 50);
  }, [domainData, ohlcData, riskMode, riskValue, rewardRatio, tradesPerDay, onWeightsChange, onThresholdChange, overallData.length]);

  const totalCandles = overallData.length;

  const containerRef = useRef<HTMLDivElement>(null);
  const legendRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof import("lightweight-charts").createChart> | null>(null);

  useEffect(() => {
    if (!containerRef.current || overallData.length === 0 || ohlcData.length === 0) return;

    let cancelled = false;

    const init = async () => {
      const { createChart, createSeriesMarkers, LineSeries, AreaSeries, CandlestickSeries, ColorType, LineStyle } =
        await import("lightweight-charts");

      if (cancelled || !containerRef.current) return;

      chartRef.current?.remove();
      chartRef.current = null;
      containerRef.current.innerHTML = "";

      // Local timezone offset in seconds (for lightweight-charts)
      const tzOffsetSec = -(new Date().getTimezoneOffset()) * 60;

      const formatLocalTime = (utcTs: number) => {
        const d = new Date(utcTs * 1000);
        return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) +
          " " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
      };

      const chart = createChart(containerRef.current, {
        width: containerRef.current.clientWidth,
        height: 400,
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
          autoScale: false,
          scaleMargins: { top: 0.02, bottom: 0.02 },
        },
        leftPriceScale: {
          borderColor: "rgba(63, 63, 70, 0.5)",
          visible: true,
        },
        timeScale: {
          borderColor: "rgba(63, 63, 70, 0.5)",
          timeVisible: true,
          shiftVisibleRangeOnNewBar: false,
        },
        localization: {
          timeFormatter: formatLocalTime,
        },
        crosshair: {
          vertLine: { color: "rgba(228, 228, 231, 0.3)" },
          horzLine: { color: "rgba(228, 228, 231, 0.3)" },
        },
      });

      chartRef.current = chart;

      // Shift timestamps by local tz offset so the axis shows local time
      const toTime = (t: number) => (t + tzOffsetSec) as import("lightweight-charts").Time;
      const fixedRange = () => ({ priceRange: { minValue: 0, maxValue: 1 } });

      // 1. Candlestick series (left price scale)
      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: "#10b981",
        downColor: "#ef4444",
        borderDownColor: "#ef4444",
        borderUpColor: "#10b981",
        wickDownColor: "#ef4444",
        wickUpColor: "#10b981",
        priceScaleId: "left",
      });
      candleSeries.setData(
        ohlcData.map((d) => ({
          time: toTime(d.time),
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close,
        })),
      );

      // 2. Confluence area (trade zone highlighting)
      const confluenceSeries = chart.addSeries(AreaSeries, {
        lineWidth: 1,
        lineColor: "rgba(16, 185, 129, 0.12)",
        topColor: "rgba(16, 185, 129, 0.12)",
        bottomColor: "rgba(16, 185, 129, 0.02)",
        priceScaleId: "right",
        crosshairMarkerVisible: false,
        lastValueVisible: false,
        priceLineVisible: false,
      });
      confluenceSeries.setData(
        confluenceData.map((d) => ({ time: toTime(d.time), value: d.value })),
      );
      confluenceSeries.applyOptions({ autoscaleInfoProvider: fixedRange });

      // 3. Domain score lines
      const domainSeriesRefs: { series: import("lightweight-charts").ISeriesApi<import("lightweight-charts").SeriesType>; label: string; color: string }[] = [];
      for (const domain of domainData) {
        if (domain.weight === 0) continue;
        const series = chart.addSeries(LineSeries, {
          color: hexWithWeightOpacity(domain.color, domain.weight),
          lineWidth: 1,
          priceScaleId: "right",
          crosshairMarkerRadius: 2,
          lastValueVisible: false,
          priceLineVisible: false,
        });
        series.setData(domain.data.map((d) => ({ time: toTime(d.time), value: d.value })));
        series.applyOptions({ autoscaleInfoProvider: fixedRange });
        domainSeriesRefs.push({ series, label: domain.label, color: domain.color });
      }

      // 4. Overall weighted line
      const overallSeries = chart.addSeries(LineSeries, {
        color: "#e4e4e7",
        lineWidth: 2,
        priceScaleId: "right",
        crosshairMarkerRadius: 3,
        lastValueVisible: true,
        priceLineVisible: false,
      });
      overallSeries.setData(
        overallData.map((d) => ({ time: toTime(d.time), value: d.value })),
      );
      overallSeries.applyOptions({ autoscaleInfoProvider: fixedRange });

      // 5. Threshold line
      overallSeries.createPriceLine({
        price: confidenceThreshold,
        color: "#71717a",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: "threshold",
      });

      // 6. Trade entry/exit markers from backtest
      type MarkerItem = {
        time: import("lightweight-charts").Time;
        position: "belowBar" | "aboveBar";
        color: string;
        shape: "arrowUp" | "arrowDown" | "circle";
        text: string;
      };
      const markers: MarkerItem[] = [];

      for (const trade of backtest.trades) {
        // Entry marker — blue for BUY, orange for SELL (neutral colors)
        markers.push({
          time: toTime(trade.entryTime),
          position: trade.direction === "buy" ? "belowBar" : "aboveBar",
          color: trade.direction === "buy" ? "#3b82f6" : "#f97316",
          shape: trade.direction === "buy" ? "arrowUp" : "arrowDown",
          text: trade.direction === "buy" ? "BUY" : "SELL",
        });
        // Exit marker — green for win, red for loss
        const isWin = trade.returnR > 0;
        markers.push({
          time: toTime(trade.exitTime),
          position: trade.direction === "buy" ? "aboveBar" : "belowBar",
          color: isWin ? "#10b981" : "#ef4444",
          shape: "circle",
          text: `${trade.exitReason} ${trade.returnR >= 0 ? "+" : ""}${trade.returnR.toFixed(1)}R`,
        });
      }

      // Skipped signal markers
      const reasonLabel: Record<string, string> = {
        in_trade: "In trade",
        hold: "Hold",
        no_score: "No data",
        no_edge: "No edge",
        max_trades: "Day limit",
      };
      for (const s of backtest.skipped) {
        markers.push({
          time: toTime(s.time),
          position: "aboveBar",
          color: "#71717a",
          shape: "circle",
          text: reasonLabel[s.reason] ?? s.reason,
        });
      }

      // 7. Trade boxes (SL/TP lines + entry line) via canvas primitive
      const tradeBoxes: TradeBox[] = backtest.trades.map((trade) => ({
        entryTime: trade.entryTime,
        exitTime: trade.exitTime,
        entryPrice: trade.entryPrice,
        slPrice: trade.direction === "buy"
          ? trade.entryPrice * (1 - trade.slPct / 100)
          : trade.entryPrice * (1 + trade.slPct / 100),
        tpPrice: trade.direction === "buy"
          ? trade.entryPrice * (1 + trade.tpPct / 100)
          : trade.entryPrice * (1 - trade.tpPct / 100),
        direction: trade.direction,
        isWin: trade.returnR > 0,
      }));
      const tradeBoxPrimitive = new TradeBoxPrimitive(tradeBoxes);
      candleSeries.attachPrimitive(tradeBoxPrimitive);

      // Sort markers by time (required by lightweight-charts)
      markers.sort((a, b) => (a.time as number) - (b.time as number));

      if (markers.length > 0) {
        createSeriesMarkers(candleSeries, markers);
      }

      chart.timeScale().fitContent();

      // ── Crosshair legend (TradingView-style top-left overlay) ──
      chart.subscribeCrosshairMove((param) => {
        const legend = legendRef.current;
        if (!legend) return;

        if (!param.time || param.seriesData.size === 0) {
          legend.innerHTML = "";
          return;
        }

        const parts: string[] = [];

        // OHLC data
        const ohlc = param.seriesData.get(candleSeries) as { open?: number; high?: number; low?: number; close?: number } | undefined;
        if (ohlc && ohlc.open != null) {
          parts.push(
            `<span style="color:#e4e4e7">O</span> <span style="color:#a1a1aa">${ohlc.open.toFixed(5)}</span>` +
            ` <span style="color:#e4e4e7">H</span> <span style="color:#a1a1aa">${ohlc.high!.toFixed(5)}</span>` +
            ` <span style="color:#e4e4e7">L</span> <span style="color:#a1a1aa">${ohlc.low!.toFixed(5)}</span>` +
            ` <span style="color:#e4e4e7">C</span> <span style="color:#a1a1aa">${ohlc.close!.toFixed(5)}</span>`
          );
        }

        // Overall score
        const overall = param.seriesData.get(overallSeries) as { value?: number } | undefined;
        if (overall?.value != null) {
          parts.push(`<span style="color:#e4e4e7">Overall</span> <span style="color:#a1a1aa">${overall.value.toFixed(3)}</span>`);
        }

        // Domain scores
        for (let di = 0; di < domainSeriesRefs.length; di++) {
          const ref = domainSeriesRefs[di];
          const data = param.seriesData.get(ref.series) as { value?: number } | undefined;
          if (data?.value != null) {
            parts.push(`<span style="color:${ref.color}">${ref.label}</span> <span style="color:#a1a1aa">${data.value.toFixed(3)}</span>`);
          }
        }

        legend.innerHTML = parts.join(`<span style="color:#3f3f46;margin:0 4px">·</span>`);
      });

      const el = containerRef.current;
      const ro = new ResizeObserver(() => {
        if (chartRef.current && el) {
          chartRef.current.applyOptions({ width: el.clientWidth });
        }
      });
      ro.observe(el);
    };

    init();

    return () => {
      cancelled = true;
      chartRef.current?.remove();
      chartRef.current = null;
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [domainData, overallData, confluenceData, ohlcData, confidenceThreshold, backtest]);

  // Merge trades + skipped into a single chronological list for the table
  type TimelineRow =
    | { type: "trade"; trade: (typeof backtest.trades)[number]; idx: number }
    | { type: "skipped"; reason: string; time: number };

  const timeline = useMemo<TimelineRow[]>(() => {
    const rows: TimelineRow[] = backtest.trades.map((trade, idx) => ({
      type: "trade" as const,
      trade,
      idx,
    }));
    if (showSkipped) {
      for (const s of backtest.skipped) {
        rows.push({ type: "skipped" as const, reason: s.reason, time: s.time });
      }
    }
    rows.sort((a, b) => {
      const ta = a.type === "trade" ? a.trade.entryTime : a.time;
      const tb = b.type === "trade" ? b.trade.entryTime : b.time;
      return ta - tb;
    });
    return rows;
  }, [backtest, showSkipped]);

  if (loading && analyses.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
        </CardContent>
      </Card>
    );
  }

  if (analyses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-emerald-400" />
            Signal Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-8 text-center text-sm text-zinc-500">
            No historical analyses available yet. The preview will appear once the LLM engine produces data.
          </p>
        </CardContent>
      </Card>
    );
  }

  const hasTrades = backtest.trades.length > 0;

  // 1R in dollars
  const riskPerTrade = riskMode === "percentage" && balance != null
    ? balance * riskValue / 100
    : riskMode === "fixed"
      ? riskValue
      : null;

  const formatUsd = (v: number) => v >= 0 ? `+$${v.toFixed(2)}` : `-$${Math.abs(v).toFixed(2)}`;

  const formatTime = (ts: number) => {
    const d = new Date(ts * 1000);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) + " " +
      d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  };

  const skipReasonLabel: Record<string, string> = {
    in_trade: "In trade",
    hold: "Hold zone",
    no_score: "No data",
    no_edge: "No edge",
    max_trades: "Day limit",
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-emerald-400" />
            Signal Preview
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/50 px-2 py-1">
              <span className="text-[10px] text-zinc-500">From</span>
              <input
                type="date"
                value={backtestFrom}
                onChange={(e) => setBacktestFrom(e.target.value)}
                className="h-5 bg-transparent text-xs text-zinc-300 outline-none [color-scheme:dark]"
              />
            </div>
            {onWeightsChange && (
              <button
                onClick={handleOptimize}
                disabled={optimizing || overallData.length === 0}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                  "border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20",
                  "disabled:cursor-not-allowed disabled:opacity-50"
                )}
              >
                {optimizing ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                {optimizing ? "Optimizing..." : "Optimize"}
              </button>
            )}
          </div>
        </div>
        <CardDescription>
          Simulated backtest with position sizing (rising edge entry, ATR-based SL/TP, one trade at a time).
          {analyses.length > 0 && (
            <span className="ml-1 text-zinc-400">
              {analyses.length} analyzed candles
              {backtestFrom && ` from ${new Date(backtestFrom).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`}
            </span>
          )}
        </CardDescription>
        {optimizeMsg && (
          <p className="text-[10px] text-amber-400/80">{optimizeMsg}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Backtest summary */}
        {hasTrades ? (
          <>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-zinc-800/50 bg-zinc-800/20 px-4 py-3 text-xs">
              <div>
                <span className="text-zinc-500">Trades </span>
                <span className="font-semibold text-zinc-200">{backtest.trades.length}</span>
                <span className="text-zinc-600"> / {totalCandles} candles</span>
              </div>
              <div>
                <span className="text-zinc-500">PnL </span>
                <span className={cn("font-bold", backtest.totalReturnR >= 0 ? "text-emerald-400" : "text-red-400")}>
                  {backtest.totalReturnR >= 0 ? "+" : ""}{backtest.totalReturnR.toFixed(2)}R
                </span>
                {riskPerTrade != null && (
                  <span className="text-zinc-600">
                    {" "}({formatUsd(backtest.totalReturnR * riskPerTrade)})
                  </span>
                )}
              </div>
              <div>
                <span className="text-zinc-500">Win rate </span>
                <span className="font-semibold text-zinc-200">{backtest.winRate.toFixed(0)}%</span>
                <span className="text-zinc-600"> ({backtest.winCount}W / {backtest.lossCount}L)</span>
              </div>
              <div>
                <span className="text-zinc-500">Avg return </span>
                <span className={cn("font-semibold", backtest.avgReturnR >= 0 ? "text-emerald-400" : "text-red-400")}>
                  {backtest.avgReturnR >= 0 ? "+" : ""}{backtest.avgReturnR.toFixed(2)}R
                </span>
                {riskPerTrade != null && (
                  <span className="text-zinc-600">
                    {" "}({formatUsd(backtest.avgReturnR * riskPerTrade)})
                  </span>
                )}
              </div>
              <div>
                <span className="text-zinc-500">Avg duration </span>
                <span className="font-semibold text-zinc-200">{backtest.avgDurationCandles} candles</span>
              </div>
            </div>
            <p className="text-[10px] text-zinc-600">
              1R = {riskPerTrade != null ? `$${riskPerTrade.toFixed(2)}` : `${riskValue}%`}
              {riskMode === "percentage" && balance != null && ` (${riskValue}% of $${balance.toFixed(2)})`}
              {" "}risked per trade.
              SL is set by ATR(14) × 1.5, then position size is calculated so that SL distance × quantity = 1R.
            </p>
          </>
        ) : (
          <div className="rounded-lg border border-zinc-800/50 bg-zinc-800/20 px-4 py-3 text-xs text-zinc-500">
            {totalCandles < 16
              ? `Not enough data for backtest (need at least 16 candles, have ${totalCandles})`
              : "No trades triggered with these settings. Try lowering the confidence threshold or adjusting weights."}
          </div>
        )}

        {/* Tabs */}
        {hasTrades && (
          <div className="flex gap-1 rounded-lg border border-zinc-800/50 bg-zinc-900/50 p-1">
            <button
              onClick={() => setActiveTab("chart")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                activeTab === "chart"
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <BarChart3 className="h-3 w-3" />
              Chart
            </button>
            <button
              onClick={() => setActiveTab("trades")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                activeTab === "trades"
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <List className="h-3 w-3" />
              Trades ({backtest.trades.length})
            </button>
            {activeTab === "trades" && backtest.skipped.length > 0 && (
              <button
                onClick={() => setShowSkipped((v) => !v)}
                className={cn(
                  "ml-auto flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                  showSkipped
                    ? "bg-zinc-700/50 text-zinc-300"
                    : "text-zinc-600 hover:text-zinc-400"
                )}
              >
                {showSkipped ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                Skipped ({backtest.skipped.length})
              </button>
            )}
          </div>
        )}

        {/* Chart (always mounted, hidden when trades tab active) */}
        <div className={activeTab === "trades" && hasTrades ? "hidden" : undefined}>
          <div className="relative">
            <div
              ref={legendRef}
              className="pointer-events-none absolute left-2 top-2 z-10 flex flex-wrap gap-x-1 text-[10px] font-mono leading-relaxed"
            />
            <div ref={containerRef} className="h-[400px] w-full overflow-hidden" />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-[10px] text-zinc-600">
            <span>Left: Price (OHLC)</span>
            <span className="text-zinc-800">|</span>
            <span>Right: AI Scores (0 to 1)</span>
            <span className="text-zinc-800">|</span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-0.5 w-3 bg-zinc-200" /> Overall
            </span>
            <span className="text-zinc-800">|</span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-sm bg-emerald-500/20" /> Above threshold
            </span>
            <span className="text-zinc-800">|</span>
            <span className="text-blue-400">&#9650; Buy</span>
            <span className="text-orange-400">&#9660; Sell</span>
            <span className="text-zinc-800">|</span>
            <span className="text-emerald-400">&#9679; Win</span>
            <span className="text-red-400">&#9679; Loss</span>
            <span className="text-zinc-800">|</span>
            <span className="text-zinc-500">&#9679; Skipped</span>
          </div>
        </div>

        {/* Trades tab */}
        {activeTab === "trades" && hasTrades && (
          <div className="overflow-x-auto rounded-lg border border-zinc-800/50">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-800/50 bg-zinc-900/50 text-left text-zinc-500">
                  <th className="px-3 py-2 font-medium">#</th>
                  <th className="px-3 py-2 font-medium">Direction</th>
                  <th className="px-3 py-2 font-medium">Entry</th>
                  <th className="px-3 py-2 font-medium">Exit</th>
                  <th className="px-3 py-2 font-medium">SL</th>
                  <th className="px-3 py-2 font-medium">TP</th>
                  <th className="px-3 py-2 font-medium">Exit reason</th>
                  <th className="px-3 py-2 text-right font-medium">PnL</th>
                  <th className="px-3 py-2 text-right font-medium">Cumul</th>
                  <th className="px-3 py-2 text-right font-medium">Duration</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  let cumulR = 0;
                  let tradeNum = 0;
                  return timeline.map((row, rowIdx) => {
                    if (row.type === "skipped") {
                      return (
                        <tr
                          key={`s-${rowIdx}`}
                          className="border-b border-zinc-800/30 bg-zinc-500/[0.03] text-zinc-600"
                        >
                          <td className="px-3 py-1.5 text-zinc-700">—</td>
                          <td className="px-3 py-1.5">
                            <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-500">
                              SKIP
                            </span>
                          </td>
                          <td className="px-3 py-1.5" colSpan={4}>
                            <span className="text-zinc-500">{formatTime(row.time)}</span>
                            <span className="ml-2 text-zinc-600">— {skipReasonLabel[row.reason] ?? row.reason}</span>
                          </td>
                          <td className="px-3 py-1.5">
                            <span className="rounded bg-zinc-800/60 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-500">
                              {skipReasonLabel[row.reason] ?? row.reason}
                            </span>
                          </td>
                          <td className="px-3 py-1.5 text-right text-zinc-700">—</td>
                          <td className="px-3 py-1.5 text-right text-zinc-700">—</td>
                          <td className="px-3 py-1.5 text-right text-zinc-700">—</td>
                        </tr>
                      );
                    }

                    const trade = row.trade;
                    tradeNum++;
                    cumulR += trade.returnR;
                    const cumulRounded = Math.round(cumulR * 100) / 100;

                    const slPrice = trade.direction === "buy"
                      ? trade.entryPrice * (1 - trade.slPct / 100)
                      : trade.entryPrice * (1 + trade.slPct / 100);
                    const tpPrice = trade.direction === "buy"
                      ? trade.entryPrice * (1 + trade.tpPct / 100)
                      : trade.entryPrice * (1 - trade.tpPct / 100);
                    const slPips = (trade.slPct / 100 * trade.entryPrice / 0.0001);
                    const tpPips = (trade.tpPct / 100 * trade.entryPrice / 0.0001);

                    return (
                      <tr
                        key={`t-${row.idx}`}
                        className={cn(
                          "border-b border-zinc-800/30 transition-colors hover:bg-zinc-800/20",
                          trade.returnR > 0 ? "bg-emerald-500/[0.03]" : "bg-red-500/[0.03]"
                        )}
                      >
                        <td className="px-3 py-2 text-zinc-600">{tradeNum}</td>
                        <td className="px-3 py-2">
                          <Badge variant={trade.direction === "buy" ? "info" : "warning"}>
                            {trade.direction.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">
                          <div className="font-mono text-zinc-200">{trade.entryPrice.toFixed(5)}</div>
                          <div className="text-[10px] text-zinc-600">{formatTime(trade.entryTime)}</div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="font-mono text-zinc-200">{trade.exitPrice.toFixed(5)}</div>
                          <div className="text-[10px] text-zinc-600">{formatTime(trade.exitTime)}</div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="font-mono text-red-400/70">{slPrice.toFixed(5)}</div>
                          <div className="text-[10px] text-zinc-600">{slPips.toFixed(1)} pips</div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="font-mono text-emerald-400/70">{tpPrice.toFixed(5)}</div>
                          <div className="text-[10px] text-zinc-600">{tpPips.toFixed(1)} pips</div>
                        </td>
                        <td className="px-3 py-2">
                          <span className={cn(
                            "rounded px-1.5 py-0.5 text-[10px] font-semibold",
                            trade.exitReason === "TP" && "bg-emerald-500/10 text-emerald-400",
                            trade.exitReason === "SL" && "bg-red-500/10 text-red-400",
                            trade.exitReason === "end" && "bg-yellow-500/10 text-yellow-400",
                          )}>
                            {trade.exitReason}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className={cn(
                            "font-mono font-semibold",
                            trade.returnR >= 0 ? "text-emerald-400" : "text-red-400"
                          )}>
                            {trade.returnR >= 0 ? "+" : ""}{trade.returnR.toFixed(2)}R
                          </div>
                          {riskPerTrade != null && (
                            <div className="text-[10px] text-zinc-600">
                              {formatUsd(trade.returnR * riskPerTrade)}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className={cn(
                            "font-mono font-semibold",
                            cumulRounded >= 0 ? "text-emerald-400" : "text-red-400"
                          )}>
                            {cumulRounded >= 0 ? "+" : ""}{cumulRounded.toFixed(2)}R
                          </div>
                          {riskPerTrade != null && (
                            <div className="text-[10px] text-zinc-600">
                              {formatUsd(cumulRounded * riskPerTrade)}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right text-zinc-400">
                          {trade.durationCandles} candles
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
