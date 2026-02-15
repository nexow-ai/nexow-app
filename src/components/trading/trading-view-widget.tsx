"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import {
  createChart,
  type IChartApi,
  type Time,
  CandlestickSeries,
  ColorType,
  createSeriesMarkers,
} from "lightweight-charts";
import { createClient } from "@/lib/supabase/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TradingViewWidgetProps {
  instrument?: string;
  granularity?: string;
  agentId?: string;
  className?: string;
  height?: number;
}

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface TradeRecord {
  id: string;
  instrument: string;
  direction: "buy" | "sell";
  entry_price: number;
  exit_price: number | null;
  return_pct: number | null;
  status: "open" | "closed";
  opened_at: string;
  closed_at: string | null;
}

// Granularity -> seconds per candle
const GRAN_SECONDS: Record<string, number> = {
  M1: 60,
  M5: 300,
  M15: 900,
  M30: 1800,
  H1: 3600,
  H4: 14400,
  D: 86400,
  W: 604800,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TradingViewWidget({
  instrument = "EUR_USD",
  granularity = "M5",
  agentId,
  className,
  height = 500,
}: TradingViewWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ReturnType<IChartApi["addSeries"]> | null>(
    null
  );
  const candlesRef = useRef<CandleData[]>([]);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [status, setStatus] = useState<"loading" | "live" | "error">(
    "loading"
  );

  // ── Data fetchers ──────────────────────────────────────────────────────

  const fetchCandles = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/candles?instrument=${instrument}&granularity=${granularity}&count=300`
      );
      if (!res.ok) throw new Error("Failed to fetch candles");
      const data = await res.json();
      const candles = (data.candles ?? []) as CandleData[];

      // Deduplicate and sort by time
      const seen = new Set<number>();
      const unique: CandleData[] = [];
      for (const c of candles) {
        if (!seen.has(c.time)) {
          seen.add(c.time);
          unique.push(c);
        }
      }
      unique.sort((a, b) => a.time - b.time);
      return unique;
    } catch {
      return null;
    }
  }, [instrument, granularity]);

  const fetchPrice = useCallback(async () => {
    try {
      const res = await fetch(`/api/price?instrument=${instrument}`);
      if (!res.ok) return null;
      return (await res.json()) as { mid: number; time: number };
    } catch {
      return null;
    }
  }, [instrument]);

  const fetchTrades = useCallback(async (): Promise<TradeRecord[]> => {
    if (!agentId) return [];
    try {
      const supabase = createClient();
      const { data } = await (supabase.from as Function)("trades")
        .select("*")
        .eq("agent_id", agentId)
        .eq("instrument", instrument)
        .order("opened_at", { ascending: true });
      return (data ?? []) as TradeRecord[];
    } catch {
      return [];
    }
  }, [agentId, instrument]);

  // ── Chart lifecycle ────────────────────────────────────────────────────

  useEffect(() => {
    if (!containerRef.current) return;

    setStatus("loading");

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#52525b",
        fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
      },
      grid: {
        vertLines: { color: "#18181b" },
        horzLines: { color: "#18181b" },
      },
      width: containerRef.current.clientWidth,
      height,
      timeScale: {
        borderColor: "#27272a",
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: "#27272a",
      },
      crosshair: {
        vertLine: {
          color: "#10b981",
          width: 1,
          style: 2,
          labelBackgroundColor: "#10b981",
        },
        horzLine: {
          color: "#10b981",
          width: 1,
          style: 2,
          labelBackgroundColor: "#10b981",
        },
      },
    });
    chartRef.current = chart;

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#10b981",
      downColor: "#ef4444",
      borderDownColor: "#ef4444",
      borderUpColor: "#10b981",
      wickDownColor: "#ef4444",
      wickUpColor: "#10b981",
    });
    candleSeriesRef.current = candleSeries;

    // ── Load initial data ──────────────────────────────────────────────

    async function loadData() {
      const candles = await fetchCandles();
      if (!candles || candles.length === 0) {
        setStatus("error");
        return;
      }

      candlesRef.current = candles;

      candleSeries.setData(
        candles.map((c) => ({
          time: c.time as Time,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }))
      );

      // ── Trade markers (entries + exits) ──────────────────────────────

      const trades = await fetchTrades();
      if (trades.length > 0 && candles.length > 0) {
        const candleTimeSet = new Set(candles.map((c) => c.time));
        const firstCandle = candles[0].time;
        const lastCandle = candles[candles.length - 1].time;

        // Snap a trade timestamp to the candle that contains it.
        // Uses floor division to find the candle boundary, then
        // verifies it exists in the loaded data.
        const snapToCandle = (epochSec: number): number | null => {
          const candleStart =
            Math.floor(epochSec / duration) * duration;

          // Exact match in loaded candles
          if (candleTimeSet.has(candleStart)) return candleStart;

          // Trade is before loaded range or after — skip it
          if (candleStart < firstCandle || candleStart > lastCandle)
            return null;

          // Candle might not exist (gap) — find nearest loaded candle
          // that is <= candleStart
          let best: number | null = null;
          for (const ct of candleTimeSet) {
            if (ct <= candleStart && (best === null || ct > best)) {
              best = ct;
            }
          }
          return best;
        };

        type MarkerDef = {
          time: Time;
          position: "belowBar" | "aboveBar";
          color: string;
          shape: "arrowUp" | "arrowDown" | "circle";
          text: string;
        };

        const markers: MarkerDef[] = [];

        for (const trade of trades) {
          // Entry marker
          const entryEpoch = Math.floor(
            new Date(trade.opened_at).getTime() / 1000
          );
          const entryCandle = snapToCandle(entryEpoch);
          if (entryCandle !== null) {
            markers.push({
              time: entryCandle as Time,
              position: trade.direction === "buy" ? "belowBar" : "aboveBar",
              color: trade.direction === "buy" ? "#10b981" : "#ef4444",
              shape: trade.direction === "buy" ? "arrowUp" : "arrowDown",
              text: `${trade.direction.toUpperCase()} @ ${Number(trade.entry_price).toFixed(5)}`,
            });
          }

          // Exit marker (only for closed trades)
          if (
            trade.status === "closed" &&
            trade.closed_at &&
            trade.exit_price != null
          ) {
            const exitEpoch = Math.floor(
              new Date(trade.closed_at).getTime() / 1000
            );
            const exitCandle = snapToCandle(exitEpoch);
            if (exitCandle !== null) {
              const returnStr =
                trade.return_pct != null
                  ? ` ${trade.return_pct >= 0 ? "+" : ""}${Number(trade.return_pct).toFixed(2)}%`
                  : "";
              markers.push({
                time: exitCandle as Time,
                position: (trade.return_pct ?? 0) >= 0 ? "aboveBar" : "belowBar",
                color: (trade.return_pct ?? 0) >= 0 ? "#10b981" : "#ef4444",
                shape: "circle",
                text: `CLOSE @ ${Number(trade.exit_price).toFixed(5)}${returnStr}`,
              });
            }
          }
        }

        // Sort by time (required by lightweight-charts)
        markers.sort((a, b) => (a.time as number) - (b.time as number));
        createSeriesMarkers(candleSeries, markers);
      }

      chart.timeScale().fitContent();
      setStatus("live");
    }

    loadData();

    // ── Resize handler ─────────────────────────────────────────────────

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);

    // ── Real-time price polling ────────────────────────────────────────
    // Uses proper candle boundary alignment to avoid drift.

    const duration = GRAN_SECONDS[granularity] || 300;

    pollingRef.current = setInterval(async () => {
      const price = await fetchPrice();
      if (!price || !candleSeriesRef.current) return;

      const candles = candlesRef.current;
      if (candles.length === 0) return;

      const lastCandle = candles[candles.length - 1];

      // Align to candle boundary: which candle does this price belong to?
      const currentCandleStart =
        Math.floor(price.time / duration) * duration;

      if (currentCandleStart === lastCandle.time) {
        // Same candle — update OHLC
        lastCandle.close = price.mid;
        lastCandle.high = Math.max(lastCandle.high, price.mid);
        lastCandle.low = Math.min(lastCandle.low, price.mid);
        candleSeriesRef.current.update({
          time: lastCandle.time as Time,
          open: lastCandle.open,
          high: lastCandle.high,
          low: lastCandle.low,
          close: lastCandle.close,
        });
      } else if (currentCandleStart > lastCandle.time) {
        // New candle(s) — create at the correct boundary
        const newCandle: CandleData = {
          time: currentCandleStart,
          open: price.mid,
          high: price.mid,
          low: price.mid,
          close: price.mid,
          volume: 0,
        };
        candles.push(newCandle);
        candleSeriesRef.current.update({
          time: newCandle.time as Time,
          open: newCandle.open,
          high: newCandle.high,
          low: newCandle.low,
          close: newCandle.close,
        });
      }
    }, 3000);

    // ── Cleanup ────────────────────────────────────────────────────────

    return () => {
      window.removeEventListener("resize", handleResize);
      if (pollingRef.current) clearInterval(pollingRef.current);
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      candlesRef.current = [];
    };
  }, [instrument, granularity, agentId, height, fetchCandles, fetchPrice, fetchTrades]);

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className={className}>
      {/* Status indicator */}
      <div className="mb-2 flex items-center justify-end text-xs">
        {status === "live" && (
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            <span className="text-emerald-400">Live</span>
          </span>
        )}
        {status === "loading" && (
          <span className="text-zinc-600">Loading chart...</span>
        )}
        {status === "error" && (
          <span className="text-red-400">Failed to load data</span>
        )}
      </div>
      <div ref={containerRef} />
    </div>
  );
}
