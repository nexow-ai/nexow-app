"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EyeOff, Eye, Loader2, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface PriceRow {
  ts: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  ai_technical: number | null;
  ai_momentum: number | null;
  ai_fundamental: number | null;
  ai_structure: number | null;
  ai_session: number | null;
  ai_overall: number | null;
  ai_direction: string | null;
  ai_analyzed_at: string | null;
}

const DOMAINS = [
  { key: "ai_technical", label: "Technical", color: "#10b981" },
  { key: "ai_momentum", label: "Momentum", color: "#06b6d4" },
  { key: "ai_fundamental", label: "Fundamental", color: "#f59e0b" },
  { key: "ai_structure", label: "Structure", color: "#8b5cf6" },
  { key: "ai_session", label: "Session", color: "#f43f5e" },
] as const;

const TIMEFRAMES = ["M1", "M5", "M15", "H1", "H4", "D1"] as const;

const RANGE_PRESETS: Record<string, { label: string; hours: number }[]> = {
  M1:  [{ label: "3H", hours: 3 }, { label: "6H", hours: 6 }, { label: "12H", hours: 12 }],
  M5:  [{ label: "12H", hours: 12 }, { label: "1D", hours: 24 }, { label: "3D", hours: 72 }],
  M15: [{ label: "1D", hours: 24 }, { label: "3D", hours: 72 }, { label: "1W", hours: 168 }],
  H1:  [{ label: "3D", hours: 72 }, { label: "1W", hours: 168 }, { label: "1M", hours: 720 }],
  H4:  [{ label: "1W", hours: 168 }, { label: "1M", hours: 720 }, { label: "3M", hours: 2160 }],
  D1:  [{ label: "1M", hours: 720 }, { label: "3M", hours: 2160 }, { label: "1Y", hours: 8760 }],
};

const DEFAULT_RANGE: Record<string, number> = {
  M1: 3, M5: 24, M15: 72, H1: 168, H4: 720, D1: 2160,
};

function useOverviewData(instrument: string, timeframe: string, rangeHours: number) {
  const [rows, setRows] = useState<PriceRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/reactor/overview?instrument=${encodeURIComponent(instrument)}&timeframe=${timeframe}&range=${rangeHours}`
      );
      const data = await res.json();
      if (res.ok) setRows(data.rows ?? []);
    } catch { /* silent */ }
    setLoading(false);
  }, [instrument, timeframe, rangeHours]);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 60_000);
    return () => clearInterval(id);
  }, [fetchData]);

  return { rows, loading };
}

// ─── Chart ────────────────────────────────────────────────────────────────────

interface OverviewChartProps {
  rows: PriceRow[];
  hiddenDomains: Set<string>;
}

function OverviewChart({ rows, hiddenDomains }: OverviewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const legendRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof import("lightweight-charts").createChart> | null>(null);
  const seriesMapRef = useRef<Map<string, import("lightweight-charts").ISeriesApi<"Line">>>(new Map());

  // Toggle visibility without recreating the chart
  useEffect(() => {
    for (const [key, series] of seriesMapRef.current) {
      series.applyOptions({ visible: !hiddenDomains.has(key) });
    }
  }, [hiddenDomains]);

  useEffect(() => {
    if (!containerRef.current || rows.length === 0) return;
    let cancelled = false;

    const init = async () => {
      const { createChart, CandlestickSeries, LineSeries, ColorType, LineStyle } =
        await import("lightweight-charts");
      if (cancelled || !containerRef.current) return;

      chartRef.current?.remove();
      chartRef.current = null;
      seriesMapRef.current.clear();
      containerRef.current.innerHTML = "";

      const tzOffsetSec = -(new Date().getTimezoneOffset()) * 60;

      const formatLocalTime = (utcTs: number) => {
        const d = new Date((utcTs - tzOffsetSec) * 1000);
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
          visible: true,
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

      const toTime = (ts: string) =>
        (Math.floor(new Date(ts).getTime() / 1000) + tzOffsetSec) as import("lightweight-charts").Time;

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
        rows.map((r) => ({
          time: toTime(r.ts),
          open: Number(r.open),
          high: Number(r.high),
          low: Number(r.low),
          close: Number(r.close),
        }))
      );

      const fixedRange = () => ({
        priceRange: { minValue: -1, maxValue: 1 },
      });

      const analyzedRows = rows.filter((r) => r.ai_overall !== null);

      // 2. Domain score lines
      const domainSeriesRefs: { series: import("lightweight-charts").ISeriesApi<import("lightweight-charts").SeriesType>; label: string; color: string; key: string }[] = [];
      for (const domain of DOMAINS) {
        const series = chart.addSeries(LineSeries, {
          color: domain.color,
          lineWidth: 1,
          priceScaleId: "right",
          lastValueVisible: false,
          priceLineVisible: false,
          crosshairMarkerRadius: 2,
          visible: !hiddenDomains.has(domain.key),
        });
        series.setData(
          analyzedRows.map((r) => ({
            time: toTime(r.ts),
            value: Number(r[domain.key as keyof PriceRow] ?? 0),
          }))
        );
        series.applyOptions({ autoscaleInfoProvider: fixedRange });
        seriesMapRef.current.set(domain.key, series as import("lightweight-charts").ISeriesApi<"Line">);
        domainSeriesRefs.push({ series: series as import("lightweight-charts").ISeriesApi<import("lightweight-charts").SeriesType>, label: domain.label, color: domain.color, key: domain.key });
      }

      // 3. Overall line
      const overallSeries = chart.addSeries(LineSeries, {
        color: "#e4e4e7",
        lineWidth: 2,
        priceScaleId: "right",
        lastValueVisible: true,
        priceLineVisible: false,
        crosshairMarkerRadius: 3,
        title: "Overall",
        visible: !hiddenDomains.has("overall"),
      });
      overallSeries.setData(
        analyzedRows.map((r) => ({
          time: toTime(r.ts),
          value: Number(r.ai_overall),
        }))
      );
      overallSeries.applyOptions({ autoscaleInfoProvider: fixedRange });
      seriesMapRef.current.set("overall", overallSeries as import("lightweight-charts").ISeriesApi<"Line">);

      // 4. Zero line
      overallSeries.createPriceLine({
        price: 0,
        color: "#3f3f46",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: false,
        title: "",
      });

      // 5. Crosshair legend (TradingView-style top-left overlay)
      chart.subscribeCrosshairMove((param) => {
        const legend = legendRef.current;
        if (!legend) return;

        if (!param.time || param.seriesData.size === 0) {
          legend.innerHTML = "";
          return;
        }

        const parts: string[] = [];

        const ohlc = param.seriesData.get(candleSeries) as { open?: number; high?: number; low?: number; close?: number } | undefined;
        if (ohlc && ohlc.open != null) {
          parts.push(
            `<span style="color:#e4e4e7">O</span> <span style="color:#a1a1aa">${ohlc.open.toFixed(5)}</span>` +
            ` <span style="color:#e4e4e7">H</span> <span style="color:#a1a1aa">${ohlc.high!.toFixed(5)}</span>` +
            ` <span style="color:#e4e4e7">L</span> <span style="color:#a1a1aa">${ohlc.low!.toFixed(5)}</span>` +
            ` <span style="color:#e4e4e7">C</span> <span style="color:#a1a1aa">${ohlc.close!.toFixed(5)}</span>`
          );
        }

        const overall = param.seriesData.get(overallSeries) as { value?: number } | undefined;
        if (overall?.value != null) {
          const v = overall.value;
          const c = v > 0 ? "#10b981" : v < 0 ? "#ef4444" : "#a1a1aa";
          parts.push(`<span style="color:#e4e4e7">Overall</span> <span style="color:${c}">${v > 0 ? "+" : ""}${v.toFixed(2)}</span>`);
        }

        for (const ref of domainSeriesRefs) {
          const data = param.seriesData.get(ref.series) as { value?: number } | undefined;
          if (data?.value != null) {
            const v = data.value;
            parts.push(`<span style="color:${ref.color}">${ref.label}</span> <span style="color:#a1a1aa">${v > 0 ? "+" : ""}${v.toFixed(2)}</span>`);
          }
        }

        legend.innerHTML = parts.join(`<span style="color:#3f3f46;margin:0 4px">·</span>`);
      });

      chart.timeScale().fitContent();

      const el = containerRef.current;
      const ro = new ResizeObserver(() => {
        if (chartRef.current && el) chartRef.current.applyOptions({ width: el.clientWidth });
      });
      ro.observe(el);
    };

    init();
    return () => {
      cancelled = true;
      seriesMapRef.current.clear();
      chartRef.current?.remove();
      chartRef.current = null;
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
    // hiddenDomains excluded — handled by the separate effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  return (
    <div className="relative">
      <div
        ref={legendRef}
        className="pointer-events-none absolute left-2 top-2 z-10 flex flex-wrap gap-x-1 text-[10px] font-mono leading-relaxed"
      />
      <div ref={containerRef} className="h-[400px] w-full overflow-hidden" />
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface ReactorOverviewProps {
  instrument?: string;
}

export function ReactorOverview({ instrument = "EUR_USD" }: ReactorOverviewProps) {
  const [timeframe, setTimeframe] = useState<string>("M1");
  const [rangeHours, setRangeHours] = useState<number>(DEFAULT_RANGE["M1"]);
  const { rows, loading } = useOverviewData(instrument, timeframe, rangeHours);
  const [hiddenDomains, setHiddenDomains] = useState<Set<string>>(new Set());

  const handleTimeframeChange = useCallback((tf: string) => {
    setTimeframe(tf);
    setRangeHours(DEFAULT_RANGE[tf] ?? 3);
  }, []);

  const latest = useMemo(() => {
    if (rows.length === 0) return null;
    return rows[rows.length - 1];
  }, [rows]);

  const latestAnalyzed = useMemo(() => {
    for (let i = rows.length - 1; i >= 0; i--) {
      if (rows[i].ai_direction !== null) return rows[i];
    }
    return null;
  }, [rows]);

  const analyzedCount = useMemo(
    () => rows.filter((r) => r.ai_direction !== null).length,
    [rows]
  );



  const ALL_SERIES_KEYS = [...DOMAINS.map((d) => d.key), "overall"];

  function toggleDomain(key: string) {
    setHiddenDomains((prev) => {
      // First click: isolate this series (hide all others)
      if (prev.size === 0) {
        const next = new Set<string>(ALL_SERIES_KEYS);
        next.delete(key);
        return next;
      }
      // If only this series is visible, show all
      if (prev.size === ALL_SERIES_KEYS.length - 1 && !prev.has(key)) {
        return new Set();
      }
      // Otherwise, toggle
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-24">
          <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
        </CardContent>
      </Card>
    );
  }

  if (rows.length === 0) return null;

  const price = Number(latest!.close);
  const prevClose = rows.length > 1 ? Number(rows[rows.length - 2].close) : price;
  const changePct = prevClose ? ((price - prevClose) / prevClose) * 100 : 0;

  const direction = latestAnalyzed?.ai_direction;
  const DirectionIcon =
    direction === "buy" ? TrendingUp : direction === "sell" ? TrendingDown : Minus;
  const directionColor =
    direction === "buy"
      ? "text-emerald-400"
      : direction === "sell"
        ? "text-red-400"
        : "text-yellow-400";

  return (
    <Card>
      <CardContent className="space-y-4 py-5">
        {/* Header stats */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-xs text-zinc-500">{instrument.replace("_", "/")}</p>
              <p className="text-2xl font-bold tabular-nums text-zinc-100">
                {price.toFixed(5)}
              </p>
            </div>
            <span
              className={cn(
                "text-sm font-medium",
                changePct >= 0 ? "text-emerald-400" : "text-red-400"
              )}
            >
              {changePct >= 0 ? "+" : ""}
              {changePct.toFixed(3)}%
            </span>
          </div>

          {latestAnalyzed && (
            <div className="flex items-center gap-5">
              <div className="flex items-center gap-2">
                <DirectionIcon className={cn("h-4 w-4", directionColor)} />
                <Badge
                  variant={
                    direction === "buy" ? "success" : direction === "sell" ? "danger" : "default"
                  }
                >
                  {(direction ?? "hold").toUpperCase()}
                </Badge>
              </div>

              <div className="text-center">
                <p className="text-[10px] uppercase tracking-wider text-zinc-600">Overall</p>
                <p
                  className={cn(
                    "text-lg font-bold tabular-nums",
                    Number(latestAnalyzed.ai_overall) > 0
                      ? "text-emerald-400"
                      : Number(latestAnalyzed.ai_overall) < 0
                        ? "text-red-400"
                        : "text-zinc-300"
                  )}
                >
                  {Number(latestAnalyzed.ai_overall) > 0 ? "+" : ""}
                  {Number(latestAnalyzed.ai_overall).toFixed(2)}
                </p>
              </div>

              <div className="text-center">
                <p className="text-[10px] uppercase tracking-wider text-zinc-600">Analyzed</p>
                <p className="text-lg font-bold tabular-nums text-zinc-300">
                  {analyzedCount}
                  <span className="text-xs font-normal text-zinc-600">/{rows.length}</span>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Timeframe & Range selector */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center rounded-lg border border-zinc-800 bg-zinc-900/50 p-0.5">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                onClick={() => handleTimeframeChange(tf)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-all",
                  timeframe === tf
                    ? "bg-zinc-700 text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                {tf}
              </button>
            ))}
          </div>

          <span className="text-zinc-800">|</span>

          <div className="flex items-center rounded-lg border border-zinc-800 bg-zinc-900/50 p-0.5">
            {(RANGE_PRESETS[timeframe] ?? []).map((preset) => (
              <button
                key={preset.label}
                onClick={() => setRangeHours(preset.hours)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-all",
                  rangeHours === preset.hours
                    ? "bg-zinc-700 text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Domain filter toggles */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              const allHidden = hiddenDomains.size === ALL_SERIES_KEYS.length;
              setHiddenDomains(allHidden ? new Set() : new Set(ALL_SERIES_KEYS));
            }}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all",
              hiddenDomains.size === ALL_SERIES_KEYS.length
                ? "border-zinc-700/50 bg-zinc-800/60 text-zinc-300"
                : "border-zinc-800 bg-zinc-900/50 text-zinc-500 hover:text-zinc-300"
            )}
          >
            {hiddenDomains.size === ALL_SERIES_KEYS.length ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            Scores
          </button>

          {/* Overall toggle */}
          <button
            onClick={() => toggleDomain("overall")}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
              hiddenDomains.has("overall")
                ? "border-zinc-800 bg-zinc-900/50 text-zinc-600"
                : "border-zinc-700/50 bg-zinc-800/60 text-zinc-300 hover:border-zinc-600"
            )}
          >
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: hiddenDomains.has("overall") ? "#3f3f46" : "#e4e4e7" }}
            />
            <span>Overall</span>
            {latestAnalyzed && (
              <span
                className={cn(
                  "font-mono",
                  Number(latestAnalyzed.ai_overall) > 0 ? "text-emerald-400" : Number(latestAnalyzed.ai_overall) < 0 ? "text-red-400" : "text-zinc-500"
                )}
              >
                {Number(latestAnalyzed.ai_overall) > 0 ? "+" : ""}{Number(latestAnalyzed.ai_overall).toFixed(2)}
              </span>
            )}
          </button>

          {DOMAINS.map((domain) => {
            const isHidden = hiddenDomains.has(domain.key);
            const score = latestAnalyzed
              ? Number(latestAnalyzed[domain.key as keyof PriceRow] ?? 0)
              : null;

            return (
              <button
                key={domain.key}
                onClick={() => toggleDomain(domain.key)}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                  isHidden
                    ? "border-zinc-800 bg-zinc-900/50 text-zinc-600"
                    : "border-zinc-700/50 bg-zinc-800/60 text-zinc-300 hover:border-zinc-600"
                )}
              >
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: isHidden ? "#3f3f46" : domain.color }}
                />
                <span>{domain.label}</span>
                {score !== null && (
                  <span
                    className={cn(
                      "font-mono",
                      score > 0 ? "text-emerald-400" : score < 0 ? "text-red-400" : "text-zinc-500"
                    )}
                  >
                    {score > 0 ? "+" : ""}{score.toFixed(2)}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Chart */}
        <OverviewChart rows={rows} hiddenDomains={hiddenDomains} />

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-[10px] text-zinc-600">
          <span>Left: Price (OHLC)</span>
          <span className="text-zinc-800">|</span>
          <span>Right: AI Scores (-1 to +1)</span>
          <span className="text-zinc-800">|</span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-0.5 w-3 bg-zinc-200" /> Overall
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
