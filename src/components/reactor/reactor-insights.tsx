"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import type { ReactorConfig } from "@/hooks/use-reactor";
import { useReactorAnalyses, type M1Analysis } from "@/hooks/use-reactor-analyses";
import { useReactorTrades, type Trade } from "@/hooks/use-trades";
import { WEIGHT_SECTIONS } from "./reactor-form";
import { Loader2, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useRef, useState } from "react";

interface ReactorInsightsProps {
  config: ReactorConfig;
  onToggleActive: () => void;
  toggleLoading: boolean;
}

const DIRECTION_LABELS = ["SELL", "HOLD", "BUY"] as const;

const TF_INTERVAL: Record<string, number> = {
  M1: 60,
  M5: 300,
  M15: 900,
  H1: 3600,
  H4: 14400,
  D: 86400,
};

const DOMAIN_COLORS: Record<string, string> = {
  technical: "#10b981",
  momentum: "#06b6d4",
  fundamental: "#f59e0b",
  structure: "#8b5cf6",
  session: "#f43f5e",
};

const WEIGHT_MAP: Record<string, keyof ReactorConfig> = {
  technical: "weight_technical",
  momentum: "weight_momentum",
  fundamental: "weight_fundamental",
  structure: "weight_structure",
  session: "weight_session",
};

/** Convert hex color to rgba, with opacity derived from user weight.
 *  weight 0.10 → 0.3 opacity, weight 0.30+ → 1.0 */
function hexWithWeightOpacity(hex: string, weight: number): string {
  const opacity = Math.max(0.3, Math.min(1, weight * 3));
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/** Map domain key to the ai_* column name in M1Analysis */
const DOMAIN_AI_KEY: Record<string, keyof M1Analysis> = {
  technical: "ai_technical",
  momentum: "ai_momentum",
  fundamental: "ai_fundamental",
  structure: "ai_structure",
  session: "ai_session",
};

/**
 * Aggregate M1 analyses into timeframe candles.
 * Returns one time series per domain (scores normalized to 0..1).
 */
function aggregateAnalyses(
  analyses: M1Analysis[],
  domainKey: string,
  timeframe: string,
): { time: number; value: number }[] {
  if (analyses.length === 0) return [];

  const interval = TF_INTERVAL[timeframe] ?? 60;
  const aiKey = DOMAIN_AI_KEY[domainKey];

  // Group M1 rows into candle buckets
  const buckets = new Map<number, number[]>();
  for (const a of analyses) {
    const ts = Math.floor(new Date(a.ts).getTime() / 1000);
    const candleOpen = ts - (ts % interval);
    const score = Number(a[aiKey] ?? 0);
    // Convert -1..+1 → 0..1
    const normalized = (score + 1) / 2;
    const bucket = buckets.get(candleOpen);
    if (bucket) bucket.push(normalized);
    else buckets.set(candleOpen, [normalized]);
  }

  // Average each bucket and sort by time
  const result: { time: number; value: number }[] = [];
  for (const [time, scores] of buckets) {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    result.push({ time, value: Math.round(avg * 1000) / 1000 });
  }
  result.sort((a, b) => a.time - b.time);
  return result;
}

// ─── ConfluenceChart ─────────────────────────────────────────────────────────

interface ConfluenceChartProps {
  domainData: { key: string; color: string; weight: number; data: { time: number; value: number }[] }[];
  overallData: { time: number; value: number }[];
  confluenceData: { time: number; value: number }[];
  confidenceThreshold: number;
  hiddenDomains: Set<string>;
  closedCount: number;
  onCandleClick?: (time: number) => void;
}

function ConfluenceChart({
  domainData,
  overallData,
  confluenceData,
  confidenceThreshold,
  hiddenDomains,
  closedCount,
  onCandleClick,
}: ConfluenceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof import("lightweight-charts").createChart> | null>(null);
  const seriesMapRef = useRef<Map<string, import("lightweight-charts").ISeriesApi<"Line" | "Area">>>(new Map());

  // Update visibility without recreating chart
  useEffect(() => {
    for (const [key, series] of seriesMapRef.current) {
      if (key === "overall" || key === "confluence") continue;
      const baseKey = key.includes(":") ? key.split(":")[0] : key;
      series.applyOptions({ visible: !hiddenDomains.has(baseKey) });
    }
  }, [hiddenDomains]);

  useEffect(() => {
    if (!containerRef.current || overallData.length === 0) return;

    let cancelled = false;

    const init = async () => {
      const { createChart, LineSeries, AreaSeries, ColorType, LineStyle } =
        await import("lightweight-charts");

      if (cancelled || !containerRef.current) return;

      chartRef.current?.remove();
      chartRef.current = null;
      seriesMapRef.current.clear();
      containerRef.current.innerHTML = "";

      const chart = createChart(containerRef.current, {
        width: containerRef.current.clientWidth,
        height: 350,
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
        timeScale: {
          borderColor: "rgba(63, 63, 70, 0.5)",
          timeVisible: true,
        },
        crosshair: {
          vertLine: { color: "rgba(228, 228, 231, 0.3)" },
          horzLine: { color: "rgba(228, 228, 231, 0.3)" },
        },
      });

      chartRef.current = chart;

      const fixedRange = () => ({
        priceRange: { minValue: 0, maxValue: 1 },
      });

      // 1. Confluence area (rendered first = behind everything)
      const confluenceSeries = chart.addSeries(AreaSeries, {
        lineWidth: 1,
        lineColor: "rgba(16, 185, 129, 0.07)",
        topColor: "rgba(16, 185, 129, 0.07)",
        bottomColor: "rgba(16, 185, 129, 0.07)",
        priceScaleId: "right",
        crosshairMarkerVisible: false,
        lastValueVisible: false,
        priceLineVisible: false,
      });
      confluenceSeries.setData(
        confluenceData.map((d) => ({
          time: d.time as import("lightweight-charts").Time,
          value: d.value,
        }))
      );
      confluenceSeries.applyOptions({ autoscaleInfoProvider: fixedRange });
      seriesMapRef.current.set("confluence", confluenceSeries);

      // Helper: split data into closed (solid) + provisional segment (dashed)
      const splitData = (data: { time: number; value: number }[]) => {
        const closed = data.slice(0, closedCount);
        const dashed = closedCount > 0 && closedCount < data.length
          ? [data[closedCount - 1], data[closedCount]]
          : [];
        return { closed, dashed };
      };

      const toChart = (d: { time: number; value: number }) => ({
        time: d.time as import("lightweight-charts").Time,
        value: d.value,
      });

      // 2. Domain lines (solid + dashed provisional)
      for (const domain of domainData) {
        const { closed, dashed } = splitData(domain.data);
        const isVisible = !hiddenDomains.has(domain.key);
        const domainColor = hexWithWeightOpacity(domain.color, domain.weight);

        const series = chart.addSeries(LineSeries, {
          color: domainColor,
          lineWidth: 2,
          priceScaleId: "right",
          crosshairMarkerRadius: 3,
          lastValueVisible: false,
          priceLineVisible: false,
        });
        series.setData(closed.map(toChart));
        series.applyOptions({ autoscaleInfoProvider: fixedRange, visible: isVisible });
        seriesMapRef.current.set(domain.key, series);

        if (dashed.length === 2) {
          const dashedSeries = chart.addSeries(LineSeries, {
            color: domainColor,
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            priceScaleId: "right",
            crosshairMarkerRadius: 2,
            lastValueVisible: false,
            priceLineVisible: false,
          });
          dashedSeries.setData(dashed.map(toChart));
          dashedSeries.applyOptions({ autoscaleInfoProvider: fixedRange, visible: isVisible });
          seriesMapRef.current.set(`${domain.key}:provisional`, dashedSeries);
        }
      }

      // 3. Overall weighted line (solid + dashed provisional)
      const { closed: overallClosed, dashed: overallDashed } = splitData(overallData);

      const overallSeries = chart.addSeries(LineSeries, {
        color: "#e4e4e7",
        lineWidth: 3,
        priceScaleId: "right",
        crosshairMarkerRadius: 4,
        lastValueVisible: false,
        priceLineVisible: false,
      });
      overallSeries.setData(overallClosed.map(toChart));
      overallSeries.applyOptions({ autoscaleInfoProvider: fixedRange });
      seriesMapRef.current.set("overall", overallSeries);

      if (overallDashed.length === 2) {
        const overallDashedSeries = chart.addSeries(LineSeries, {
          color: "#e4e4e7",
          lineWidth: 2,
          lineStyle: LineStyle.Dashed,
          priceScaleId: "right",
          crosshairMarkerRadius: 3,
          lastValueVisible: false,
          priceLineVisible: false,
        });
        overallDashedSeries.setData(overallDashed.map(toChart));
        overallDashedSeries.applyOptions({ autoscaleInfoProvider: fixedRange });
      }

      // 4. Threshold price line on the overall series
      overallSeries.createPriceLine({
        price: confidenceThreshold,
        color: "#71717a",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: "threshold",
      });

      chart.timeScale().fitContent();

      if (onCandleClick) {
        chart.subscribeClick((param) => {
          if (!param.time) return;
          onCandleClick(param.time as number);
        });
      }

      // ResizeObserver
      const el = containerRef.current;
      const resizeObserver = new ResizeObserver(() => {
        if (chartRef.current && el) {
          chartRef.current.applyOptions({ width: el.clientWidth });
        }
      });
      resizeObserver.observe(el);
    };

    init();

    return () => {
      cancelled = true;
      seriesMapRef.current.clear();
      chartRef.current?.remove();
      chartRef.current = null;
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
    // hiddenDomains excluded — handled by the separate effect above
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domainData, overallData, confluenceData, confidenceThreshold, closedCount]);

  return (
    <div ref={containerRef} className="h-[350px] w-full overflow-hidden" />
  );
}

// ─── M1DetailChart ───────────────────────────────────────────────────────────

interface M1DetailProps {
  domains: { key: string; color: string; weight: number }[];
  analyses: M1Analysis[];
  candleTime: number;
  interval: number;
  confidenceThreshold: number;
  hiddenDomains: Set<string>;
  onClose: () => void;
}

function M1DetailChart({ domains, analyses, candleTime, interval, confidenceThreshold, hiddenDomains, onClose }: M1DetailProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof import("lightweight-charts").createChart> | null>(null);

  // Filter M1 analyses that fall within this candle
  const candleM1 = useMemo(() => {
    return analyses.filter((a) => {
      const ts = Math.floor(new Date(a.ts).getTime() / 1000);
      return ts >= candleTime && ts < candleTime + interval;
    });
  }, [analyses, candleTime, interval]);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    const init = async () => {
      const { createChart, LineSeries, ColorType, LineStyle } = await import("lightweight-charts");
      if (cancelled || !containerRef.current) return;

      chartRef.current?.remove();
      chartRef.current = null;
      containerRef.current.innerHTML = "";

      const chart = createChart(containerRef.current, {
        width: containerRef.current.clientWidth,
        height: 200,
        layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: "#71717a", fontSize: 10 },
        grid: { vertLines: { color: "rgba(63,63,70,0.2)" }, horzLines: { color: "rgba(63,63,70,0.2)" } },
        rightPriceScale: { borderColor: "rgba(63,63,70,0.5)", autoScale: false, scaleMargins: { top: 0.02, bottom: 0.02 } },
        timeScale: { borderColor: "rgba(63,63,70,0.5)", timeVisible: true, secondsVisible: false },
        crosshair: { vertLine: { color: "rgba(228,228,231,0.2)" }, horzLine: { color: "rgba(228,228,231,0.2)" } },
      });
      chartRef.current = chart;

      const fixedRange = () => ({ priceRange: { minValue: 0, maxValue: 1 } });
      const toChart = (d: { time: number; value: number }) => ({
        time: d.time as import("lightweight-charts").Time,
        value: d.value,
      });

      // Plot real M1 data for each domain
      for (const dom of domains) {
        const aiKey = DOMAIN_AI_KEY[dom.key];
        const pts = candleM1.map((a) => {
          const ts = Math.floor(new Date(a.ts).getTime() / 1000);
          const score = Number(a[aiKey] ?? 0);
          return { time: ts, value: Math.round(((score + 1) / 2) * 1000) / 1000 };
        });
        const series = chart.addSeries(LineSeries, {
          color: hexWithWeightOpacity(dom.color, dom.weight),
          lineWidth: 1,
          priceScaleId: "right",
          crosshairMarkerRadius: 2,
          lastValueVisible: false,
          priceLineVisible: false,
        });
        series.setData(pts.map(toChart));
        series.applyOptions({ autoscaleInfoProvider: fixedRange, visible: !hiddenDomains.has(dom.key) });
      }

      // Overall weighted M1 line
      const overallPts = candleM1.map((a) => {
        const ts = Math.floor(new Date(a.ts).getTime() / 1000);
        let w = 0;
        for (const dom of domains) {
          const aiKey = DOMAIN_AI_KEY[dom.key];
          const score = Number(a[aiKey] ?? 0);
          w += ((score + 1) / 2) * dom.weight;
        }
        return { time: ts, value: Math.round(w * 1000) / 1000 };
      });
      const overallSeries = chart.addSeries(LineSeries, {
        color: "#e4e4e7",
        lineWidth: 2,
        priceScaleId: "right",
        crosshairMarkerRadius: 3,
        lastValueVisible: false,
        priceLineVisible: false,
      });
      overallSeries.setData(overallPts.map(toChart));
      overallSeries.applyOptions({ autoscaleInfoProvider: fixedRange });

      overallSeries.createPriceLine({
        price: confidenceThreshold,
        color: "#71717a",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: false,
        title: "",
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
      chartRef.current?.remove();
      chartRef.current = null;
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [domains, candleM1, candleTime, confidenceThreshold, hiddenDomains]);

  const fmt = (ts: number) => new Date(ts * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-2 border-t border-zinc-800/50 pt-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500">
          M1 composition — {fmt(candleTime)} to {fmt(candleTime + interval)}
        </p>
        <button
          onClick={onClose}
          className="rounded px-2 py-0.5 text-[10px] font-medium text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
        >
          Close
        </button>
      </div>
      <div ref={containerRef} className="h-[200px] w-full overflow-hidden" />
    </div>
  );
}

// ─── ReactorInsights ────────────────────────────────────────────────────────

export function ReactorInsights({ config, onToggleActive, toggleLoading }: ReactorInsightsProps) {
  const [hiddenDomains, setHiddenDomains] = useState<Set<string>>(new Set());
  const [selectedCandle, setSelectedCandle] = useState<number | null>(null);

  const { analyses, loading: analysesLoading, refetch: refetchAnalyses } = useReactorAnalyses(config.instrument);

  // Auto-refresh analyses every 60s
  useEffect(() => {
    const id = setInterval(refetchAnalyses, 60_000);
    return () => clearInterval(id);
  }, [refetchAnalyses]);

  // Aggregate M1 analyses into domain time series
  const domainData = useMemo(
    () =>
      WEIGHT_SECTIONS.map((section) => ({
        key: section.key,
        label: section.label,
        color: DOMAIN_COLORS[section.key],
        weight: config[WEIGHT_MAP[section.key]] as number,
        data: aggregateAnalyses(analyses, section.key, config.timeframe),
      })),
    [analyses, config]
  );

  // closedCount = total points - 1 (last point is the provisional candle)
  const closedCount = domainData.length > 0 && domainData[0].data.length > 1
    ? domainData[0].data.length - 1
    : 0;

  // Compute overall weighted score per timestamp
  const overallData = useMemo(() => {
    if (domainData.length === 0 || domainData[0].data.length === 0) return [];
    const count = domainData[0].data.length;
    const result: { time: number; value: number }[] = [];

    for (let i = 0; i < count; i++) {
      const time = domainData[0].data[i].time;
      let weighted = 0;
      for (const d of domainData) {
        weighted += d.data[i].value * d.weight;
      }
      result.push({ time, value: Math.round(weighted * 1000) / 1000 });
    }
    return result;
  }, [domainData]);

  // Compute confluence zones: 1 when weighted overall >= confidence_threshold
  const confluenceData = useMemo(() => {
    if (overallData.length === 0) return [];
    return overallData.map((d) => ({
      time: d.time,
      value: d.value >= config.confidence_threshold ? 1 : 0,
    }));
  }, [overallData, config.confidence_threshold]);

  // Overall score = last point of overallData
  const overallScore = overallData.length > 0 ? overallData[overallData.length - 1].value : 0;

  // Direction from latest M1 analysis majority vote
  const direction = useMemo(() => {
    if (analyses.length === 0) return "HOLD";
    // Take latest candle's M1 analyses
    const interval = TF_INTERVAL[config.timeframe] ?? 60;
    const lastTs = Math.floor(new Date(analyses[analyses.length - 1].ts).getTime() / 1000);
    const candleOpen = lastTs - (lastTs % interval);
    const candleAnalyses = analyses.filter((a) => {
      const ts = Math.floor(new Date(a.ts).getTime() / 1000);
      return ts >= candleOpen && ts < candleOpen + interval;
    });
    const buys = candleAnalyses.filter((a) => a.ai_direction === "buy").length;
    const sells = candleAnalyses.filter((a) => a.ai_direction === "sell").length;
    if (buys > sells) return "BUY";
    if (sells > buys) return "SELL";
    return "HOLD";
  }, [analyses, config.timeframe]);

  function toggleDomain(key: string) {
    setHiddenDomains((prev) => {
      if (prev.size === 0) {
        const next = new Set<string>(domainData.map((d) => d.key));
        next.delete(key);
        return next;
      }
      if (prev.size === domainData.length - 1 && !prev.has(key)) {
        return new Set();
      }
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="space-y-8">
      {/* Activate / Deactivate */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="lg"
          onClick={onToggleActive}
          loading={toggleLoading}
        >
          {config.is_active ? (
            <>
              <Pause className="h-4 w-4" />
              Deactivate Reactor
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Activate Reactor
            </>
          )}
        </Button>
        <span className="text-sm text-zinc-500">
          {config.is_active
            ? "Reactor is running. LLM analysis is active."
            : "Reactor is paused. Activate to start LLM analysis."}
        </span>
      </div>

      {/* Overall Score */}
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-zinc-500">Overall Score</p>
              <p className="mt-1 text-3xl font-bold text-zinc-100">{overallScore.toFixed(2)}</p>
            </div>
            <div className={cn(
              "rounded-lg px-4 py-2 text-sm font-bold",
              direction === "BUY" && "bg-emerald-500/15 text-emerald-400",
              direction === "SELL" && "bg-red-500/15 text-red-400",
              direction === "HOLD" && "bg-yellow-500/15 text-yellow-400",
            )}>
              {direction}
            </div>
          </div>
          {analyses.length === 0 && !analysesLoading && (
            <p className="mt-2 text-xs text-zinc-600">
              No analyses yet — scores will appear once the LLM engine produces data.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Confluence Breakdown */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-200">Domain Breakdown</h2>

          <span className="rounded-md bg-zinc-800/80 px-2.5 py-1 text-[11px] font-semibold text-zinc-300">
            {config.timeframe}
          </span>
        </div>

        {/* Domain status badges */}
        <div className="flex flex-wrap gap-2">
          {domainData.map((d) => {
            const lastScore = d.data.length > 0 ? d.data[d.data.length - 1].value : 0;
            const isGo = d.weight === 0 || lastScore >= 0.5;
            const isHidden = hiddenDomains.has(d.key);

            return (
              <button
                key={d.key}
                onClick={() => toggleDomain(d.key)}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                  isHidden
                    ? "border-zinc-800 bg-zinc-900/50 text-zinc-600"
                    : "border-zinc-700/50 bg-zinc-800/60 text-zinc-300 hover:border-zinc-600"
                )}
              >
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{
                    backgroundColor: isHidden ? "#3f3f46" : hexWithWeightOpacity(d.color, d.weight),
                    boxShadow: !isHidden && isGo ? `0 0 6px ${hexWithWeightOpacity(d.color, d.weight)}` : undefined,
                  }}
                />
                <span>{d.label}</span>
                <span className="text-zinc-500">{(d.weight * 100).toFixed(0)}%</span>
                <span className={cn("font-mono", isGo ? "text-emerald-400" : "text-red-400")}>
                  {lastScore.toFixed(2)}
                </span>
              </button>
            );
          })}
        </div>

        {/* Confluence chart */}
        <Card>
          <CardContent className="py-4 space-y-0">
            {analysesLoading && analyses.length === 0 && (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
              </div>
            )}
            {!analysesLoading && analyses.length === 0 && (
              <p className="py-16 text-center text-sm text-zinc-500">
                No analyses yet. Data will appear once the LLM engine is running.
              </p>
            )}
            {analyses.length > 0 && <ConfluenceChart
              domainData={domainData}
              overallData={overallData}
              confluenceData={confluenceData}
              confidenceThreshold={config.confidence_threshold}
              hiddenDomains={hiddenDomains}
              closedCount={closedCount}
              onCandleClick={(t) => setSelectedCandle((prev) => prev === t ? null : t)}
            />}

            {selectedCandle !== null && (TF_INTERVAL[config.timeframe] ?? 60) > 60 && (
              <M1DetailChart
                domains={domainData}
                analyses={analyses}
                candleTime={selectedCandle}
                interval={TF_INTERVAL[config.timeframe] ?? 60}
                confidenceThreshold={config.confidence_threshold}
                hiddenDomains={hiddenDomains}
                onClose={() => setSelectedCandle(null)}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Trades */}
      <ReactorTradeTable configId={config.id} currentPrice={null} />
    </div>
  );
}

// ------------------------------------------------------------------
// Reactor Trade Table
// ------------------------------------------------------------------

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

function ReactorTradeTable({ configId, currentPrice }: { configId: string; currentPrice: number | null }) {
  const { trades, loading, error, refetch } = useReactorTrades(configId);

  // Auto-refresh every 30s
  useEffect(() => {
    const id = setInterval(refetch, 30_000);
    return () => clearInterval(id);
  }, [refetch]);

  const openTrades = useMemo(() => trades.filter((t) => t.status === "open"), [trades]);
  const closedTrades = useMemo(() => trades.filter((t) => t.status === "closed"), [trades]);

  const totalPnl = closedTrades.reduce((sum, t) => sum + (t.return_pct ?? 0), 0);
  const winCount = closedTrades.filter((t) => (t.return_pct ?? 0) > 0).length;
  const winRate = closedTrades.length > 0 ? (winCount / closedTrades.length) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-200">Trades</h2>
        {closedTrades.length > 0 && (
          <div className="flex items-center gap-4 text-xs text-zinc-400">
            <span>
              PnL:{" "}
              <span className={totalPnl >= 0 ? "font-semibold text-emerald-400" : "font-semibold text-red-400"}>
                {totalPnl >= 0 ? "+" : ""}{totalPnl.toFixed(2)}%
              </span>
            </span>
            <span>
              Win rate:{" "}
              <span className="font-semibold text-zinc-200">
                {winRate.toFixed(0)}%
              </span>
            </span>
            <span>
              {closedTrades.length} closed · {openTrades.length} open
            </span>
          </div>
        )}
      </div>

      {loading && trades.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
        </div>
      )}

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      {!loading && trades.length === 0 && !error && (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-sm text-zinc-500">
              No trades yet. Trades will appear here once the reactor triggers a signal.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Open trades first */}
      {openTrades.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Open Positions
            </p>
            <TradeRows trades={openTrades} currentPrice={currentPrice} />
          </CardContent>
        </Card>
      )}

      {/* Closed trades */}
      {closedTrades.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Trade History
            </p>
            <TradeRows trades={closedTrades.slice(0, 50)} currentPrice={null} />
            {closedTrades.length > 50 && (
              <p className="mt-2 text-center text-xs text-zinc-600">
                Showing 50 of {closedTrades.length} trades
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TradeRows({ trades, currentPrice }: { trades: Trade[]; currentPrice: number | null }) {
  return (
    <div className="max-h-[400px] overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Opened</TableHead>
            <TableHead>Direction</TableHead>
            <TableHead>Entry</TableHead>
            <TableHead>Exit</TableHead>
            <TableHead>Return</TableHead>
            <TableHead>SL / TP</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {trades.map((trade) => {
            const isOpen = trade.status === "open";
            const unrealizedPnl = isOpen && currentPrice
              ? trade.direction === "buy"
                ? ((currentPrice - trade.entry_price) / trade.entry_price) * 100
                : ((trade.entry_price - currentPrice) / trade.entry_price) * 100
              : null;
            const pnl = isOpen ? unrealizedPnl : trade.return_pct;
            const durationMs = trade.closed_at
              ? new Date(trade.closed_at).getTime() - new Date(trade.opened_at).getTime()
              : Date.now() - new Date(trade.opened_at).getTime();

            return (
              <TableRow key={trade.id}>
                <TableCell className="text-xs text-zinc-400">
                  {new Date(trade.opened_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}{" "}
                  {new Date(trade.opened_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                </TableCell>
                <TableCell>
                  <Badge variant={trade.direction === "buy" ? "success" : "danger"}>
                    {trade.direction.toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-xs">{trade.entry_price.toFixed(5)}</TableCell>
                <TableCell className="font-mono text-xs">
                  {trade.exit_price ? trade.exit_price.toFixed(5) : isOpen ? "—" : "—"}
                </TableCell>
                <TableCell>
                  {pnl != null ? (
                    <span className={cn("font-semibold", pnl >= 0 ? "text-emerald-400" : "text-red-400")}>
                      {pnl >= 0 ? "+" : ""}{pnl.toFixed(2)}%
                    </span>
                  ) : "—"}
                </TableCell>
                <TableCell className="text-xs text-zinc-500">
                  {trade.stop_loss_pct != null || trade.take_profit_pct != null ? (
                    <>
                      {trade.stop_loss_pct != null && (
                        <span className="text-red-400/70">-{trade.stop_loss_pct.toFixed(2)}%</span>
                      )}
                      {trade.stop_loss_pct != null && trade.take_profit_pct != null && " / "}
                      {trade.take_profit_pct != null && (
                        <span className="text-emerald-400/70">+{trade.take_profit_pct.toFixed(2)}%</span>
                      )}
                    </>
                  ) : "—"}
                </TableCell>
                <TableCell className="text-xs text-zinc-500">
                  {formatDuration(durationMs)}
                </TableCell>
                <TableCell>
                  <Badge variant={isOpen ? "info" : "default"}>
                    {isOpen ? "OPEN" : "CLOSED"}
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
