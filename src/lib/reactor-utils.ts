import type { ReactorConfig } from "@/hooks/use-reactor";
import type { M1Analysis } from "@/hooks/use-reactor-analyses";

export const TF_INTERVAL: Record<string, number> = {
  M1: 60,
  M5: 300,
  M15: 900,
  H1: 3600,
  H4: 14400,
  D: 86400,
};

export const DOMAIN_COLORS: Record<string, string> = {
  technical: "#10b981",
  momentum: "#06b6d4",
  fundamental: "#f59e0b",
  structure: "#8b5cf6",
  session: "#f43f5e",
};

export const WEIGHT_MAP: Record<string, keyof ReactorConfig> = {
  technical: "weight_technical",
  momentum: "weight_momentum",
  fundamental: "weight_fundamental",
  structure: "weight_structure",
  session: "weight_session",
};

/** Map domain key to the ai_* column name in M1Analysis */
export const DOMAIN_AI_KEY: Record<string, keyof M1Analysis> = {
  technical: "ai_technical",
  momentum: "ai_momentum",
  fundamental: "ai_fundamental",
  structure: "ai_structure",
  session: "ai_session",
};

/** Convert hex color to rgba, with opacity derived from user weight.
 *  weight 0.10 -> 0.3 opacity, weight 0.30+ -> 1.0 */
export function hexWithWeightOpacity(hex: string, weight: number): string {
  const opacity = Math.max(0.3, Math.min(1, weight * 3));
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Aggregate M1 analyses into timeframe candles.
 * Returns one time series per domain (scores normalized to 0..1).
 */
export function aggregateAnalyses(
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
    // Convert -1..+1 -> 0..1
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

export interface OHLCCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

/**
 * Aggregate M1 price data into OHLC candles for the given timeframe.
 */
export function aggregateOHLC(
  analyses: M1Analysis[],
  timeframe: string,
): OHLCCandle[] {
  if (analyses.length === 0) return [];

  const interval = TF_INTERVAL[timeframe] ?? 60;

  const buckets = new Map<number, { open: number; high: number; low: number; close: number; firstTs: number; lastTs: number }>();
  for (const a of analyses) {
    const ts = Math.floor(new Date(a.ts).getTime() / 1000);
    const candleOpen = ts - (ts % interval);
    const o = Number(a.open);
    const h = Number(a.high);
    const l = Number(a.low);
    const c = Number(a.close);

    const existing = buckets.get(candleOpen);
    if (existing) {
      if (ts < existing.firstTs) {
        existing.open = o;
        existing.firstTs = ts;
      }
      if (ts > existing.lastTs) {
        existing.close = c;
        existing.lastTs = ts;
      }
      existing.high = Math.max(existing.high, h);
      existing.low = Math.min(existing.low, l);
    } else {
      buckets.set(candleOpen, { open: o, high: h, low: l, close: c, firstTs: ts, lastTs: ts });
    }
  }

  const result: OHLCCandle[] = [];
  for (const [time, b] of buckets) {
    result.push({ time, open: b.open, high: b.high, low: b.low, close: b.close });
  }
  result.sort((a, b) => a.time - b.time);
  return result;
}

// ─── ATR ──────────────────────────────────────────────────────────────────────

const ATR_PERIOD = 14;
const ATR_MULTIPLIER = 1.5;

/** Compute ATR from OHLC candles (matches server-side _compute_atr). */
export function computeATR(candles: OHLCCandle[], period = ATR_PERIOD): number {
  if (candles.length < 2) return 0;

  const trueRanges: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i - 1].close;
    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    trueRanges.push(tr);
  }

  const recent = trueRanges.slice(-period);
  return recent.reduce((a, b) => a + b, 0) / recent.length;
}

// ─── Backtest simulation ──────────────────────────────────────────────────────

export interface SimulatedTrade {
  entryTime: number;
  exitTime: number;
  direction: "buy" | "sell";
  entryPrice: number;
  exitPrice: number;
  returnPct: number;
  slPct: number;
  tpPct: number;
  exitReason: "SL" | "TP" | "end";
  durationCandles: number;
  atr: number;
  /** Position size multiplier: risk / (SL distance in price). For %: risk% / slPct. */
  positionMultiplier: number;
  /** Actual PnL accounting for position sizing (in risk units, e.g. 1R = risked amount) */
  returnR: number;
}

export interface SkippedSignal {
  time: number;
  reason: "in_trade" | "hold" | "no_score" | "no_edge" | "max_trades";
}

export interface BacktestResult {
  trades: SimulatedTrade[];
  skipped: SkippedSignal[];
  totalReturn: number;
  /** Total return in R units (position-sized) */
  totalReturnR: number;
  winRate: number;
  winCount: number;
  lossCount: number;
  avgReturn: number;
  avgReturnR: number;
  avgDurationCandles: number;
}

interface BacktestParams {
  ohlcCandles: OHLCCandle[];
  /** M1-level candles used for precise SL/TP checking within higher TF candles.
   *  If not provided, SL/TP is checked on ohlcCandles only. */
  m1Candles?: OHLCCandle[];
  overallScores: { time: number; value: number }[];
  directions: Map<number, string>;
  confidenceThreshold: number;
  riskMode: string;
  riskValue: number;
  rewardRatio: number;
  tradesPerDay: number;
}

/**
 * Simulate the reactor strategy on historical data.
 * - Rising edge: signal when prev < threshold AND current >= threshold
 * - SL = ATR(14) × 1.5, TP = SL × reward_ratio
 * - Position size: risk_value / SL distance (so SL hit = exactly 1R lost)
 * - One trade at a time
 * - SL/TP exit checked on each candle's high/low
 * - Returns in R-multiples (1R = risk_value)
 */
export function runBacktest(params: BacktestParams): BacktestResult {
  const {
    ohlcCandles,
    m1Candles,
    overallScores,
    directions,
    confidenceThreshold,
    riskMode,
    riskValue,
    rewardRatio,
    tradesPerDay,
  } = params;

  const empty: BacktestResult = {
    trades: [], skipped: [], totalReturn: 0, totalReturnR: 0, winRate: 0,
    winCount: 0, lossCount: 0, avgReturn: 0, avgReturnR: 0, avgDurationCandles: 0,
  };

  if (ohlcCandles.length < ATR_PERIOD + 2 || overallScores.length < 2) return empty;

  // Build a time->score map
  const scoreByTime = new Map<number, number>();
  overallScores.forEach((s) => scoreByTime.set(s.time, s.value));

  // Build M1 candle index sorted by time for SL/TP tick-level checking
  const ticks = m1Candles && m1Candles.length > 0 ? m1Candles : null;
  // Map: tfCandleTime -> index in ticks[] where that TF candle starts
  const tickStartForTf = new Map<number, number>();
  if (ticks) {
    const interval = ohlcCandles.length >= 2 ? ohlcCandles[1].time - ohlcCandles[0].time : 60;
    let ti = 0;
    for (let i = 0; i < ohlcCandles.length; i++) {
      const tfTime = ohlcCandles[i].time;
      // Advance tick pointer to the first M1 candle at or after this TF candle open
      while (ti < ticks.length && ticks[ti].time < tfTime) ti++;
      tickStartForTf.set(tfTime, ti);
    }
  }

  const trades: SimulatedTrade[] = [];
  const skipped: SkippedSignal[] = [];

  // Daily trade counter (key = day string "YYYY-MM-DD")
  const tradesPerDayCount = new Map<string, number>();
  const getDayKey = (ts: number) => {
    const d = new Date(ts * 1000);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  };

  /** Check SL/TP on M1 ticks between afterTfIdx (exclusive start) and the end of data.
   *  Returns exit info or null if trade is still open. */
  function checkSlTpOnTicks(
    trade: { direction: "buy" | "sell"; entryPrice: number; entryTime: number; slPct: number; tpPct: number },
    fromTfIdx: number,
  ): { exitPrice: number; exitTime: number; exitReason: "SL" | "TP"; exitTfIdx: number } | null {
    if (!ticks) return null;
    const entry = trade.entryPrice;
    const dir = trade.direction;
    const slPrice = dir === "buy"
      ? entry * (1 - trade.slPct / 100)
      : entry * (1 + trade.slPct / 100);
    const tpPrice = dir === "buy"
      ? entry * (1 + trade.tpPct / 100)
      : entry * (1 - trade.tpPct / 100);

    // Start scanning ticks from right after entry (entry candle close = trade open, check from next tick)
    const startTick = tickStartForTf.get(ohlcCandles[fromTfIdx].time) ?? 0;
    // We need ticks AFTER the entry candle, so start from the next TF candle's first tick
    const nextTfTick = fromTfIdx + 1 < ohlcCandles.length
      ? (tickStartForTf.get(ohlcCandles[fromTfIdx + 1].time) ?? startTick)
      : startTick;

    for (let t = nextTfTick; t < ticks.length; t++) {
      const tick = ticks[t];
      if (dir === "buy") {
        // Check SL first (pessimistic within same tick)
        if (tick.low <= slPrice) {
          // Find which TF candle this tick belongs to for durationCandles
          return { exitPrice: slPrice, exitTime: tick.time, exitReason: "SL", exitTfIdx: findTfIdx(tick.time, fromTfIdx) };
        }
        if (tick.high >= tpPrice) {
          return { exitPrice: tpPrice, exitTime: tick.time, exitReason: "TP", exitTfIdx: findTfIdx(tick.time, fromTfIdx) };
        }
      } else {
        if (tick.high >= slPrice) {
          return { exitPrice: slPrice, exitTime: tick.time, exitReason: "SL", exitTfIdx: findTfIdx(tick.time, fromTfIdx) };
        }
        if (tick.low <= tpPrice) {
          return { exitPrice: tpPrice, exitTime: tick.time, exitReason: "TP", exitTfIdx: findTfIdx(tick.time, fromTfIdx) };
        }
      }
    }
    return null;
  }

  /** Find the TF candle index that contains a given M1 timestamp */
  function findTfIdx(tickTime: number, fromIdx: number): number {
    for (let i = fromIdx; i < ohlcCandles.length; i++) {
      if (i + 1 >= ohlcCandles.length || ohlcCandles[i + 1].time > tickTime) return i;
    }
    return ohlcCandles.length - 1;
  }

  let openTrade: {
    direction: "buy" | "sell";
    entryPrice: number;
    entryTime: number;
    entryIdx: number;
    slPct: number;
    tpPct: number;
    atr: number;
  } | null = null;

  for (let i = 1; i < ohlcCandles.length; i++) {
    const candle = ohlcCandles[i];
    const prevCandle = ohlcCandles[i - 1];

    // Check SL/TP for open trade on this TF candle
    if (openTrade) {
      const entry = openTrade.entryPrice;
      const dir = openTrade.direction;

      let exitTriggered = false;
      let exitPrice = 0;
      let exitTime = candle.time;
      let exitReason: "SL" | "TP" = "SL";
      let exitTfIdx = i;

      // If we have M1 ticks and the trade was opened before this candle, check via tick already done
      // (tick-level exit is handled at entry time below). Here we fall back to TF-level check
      // for the case where no M1 data is available.
      if (dir === "buy") {
        const slPrice = entry * (1 - openTrade.slPct / 100);
        const tpPrice = entry * (1 + openTrade.tpPct / 100);
        if (candle.low <= slPrice) {
          exitTriggered = true;
          exitPrice = slPrice;
          exitReason = "SL";
        } else if (candle.high >= tpPrice) {
          exitTriggered = true;
          exitPrice = tpPrice;
          exitReason = "TP";
        }
      } else {
        const slPrice = entry * (1 + openTrade.slPct / 100);
        const tpPrice = entry * (1 - openTrade.tpPct / 100);
        if (candle.high >= slPrice) {
          exitTriggered = true;
          exitPrice = slPrice;
          exitReason = "SL";
        } else if (candle.low <= tpPrice) {
          exitTriggered = true;
          exitPrice = tpPrice;
          exitReason = "TP";
        }
      }

      if (exitTriggered) {
        const returnPct = dir === "buy"
          ? ((exitPrice - entry) / entry) * 100
          : ((entry - exitPrice) / entry) * 100;

        const returnR = openTrade.slPct > 0
          ? Math.round((returnPct / openTrade.slPct) * 10000) / 10000
          : 0;

        trades.push({
          entryTime: openTrade.entryTime,
          exitTime,
          direction: dir,
          entryPrice: entry,
          exitPrice,
          returnPct: Math.round(returnPct * 10000) / 10000,
          slPct: openTrade.slPct,
          tpPct: openTrade.tpPct,
          exitReason,
          durationCandles: exitTfIdx - openTrade.entryIdx,
          atr: openTrade.atr,
          positionMultiplier: openTrade.slPct > 0
            ? Math.round((riskValue / openTrade.slPct) * 100) / 100
            : 1,
          returnR,
        });
        openTrade = null;
      }
    }

    // Skip entry check if we have an open trade
    if (openTrade) {
      const cs = scoreByTime.get(candle.time);
      const ps = scoreByTime.get(prevCandle.time);
      if (cs !== undefined && ps !== undefined && ps < confidenceThreshold && cs >= confidenceThreshold) {
        skipped.push({ time: candle.time, reason: "in_trade" });
      }
      continue;
    }

    // Rising edge detection
    const currentScore = scoreByTime.get(candle.time);
    const prevScore = scoreByTime.get(prevCandle.time);
    if (currentScore === undefined || prevScore === undefined) {
      const cs = currentScore ?? scoreByTime.get(candle.time);
      if (cs !== undefined && cs >= confidenceThreshold) {
        skipped.push({ time: candle.time, reason: "no_score" });
      }
      continue;
    }
    if (!(prevScore < confidenceThreshold && currentScore >= confidenceThreshold)) {
      continue;
    }

    // Direction
    const dir = directions.get(candle.time);
    if (!dir || dir === "hold") {
      skipped.push({ time: candle.time, reason: "hold" });
      continue;
    }

    // Daily trade limit
    const dayKey = getDayKey(candle.time);
    const dayCount = tradesPerDayCount.get(dayKey) ?? 0;
    if (dayCount >= tradesPerDay) {
      skipped.push({ time: candle.time, reason: "max_trades" });
      continue;
    }

    // ATR from candles up to this point
    const candlesForATR = ohlcCandles.slice(0, i + 1);
    const atr = computeATR(candlesForATR);
    if (atr <= 0) continue;

    const slDistance = atr * ATR_MULTIPLIER;
    const slPct = Math.round(((slDistance / candle.close) * 100) * 10000) / 10000;
    const tpPct = Math.round((slPct * rewardRatio) * 10000) / 10000;

    tradesPerDayCount.set(dayKey, dayCount + 1);

    // If M1 ticks are available, immediately resolve this trade on tick data
    if (ticks) {
      const tradeInfo = { direction: dir as "buy" | "sell", entryPrice: candle.close, entryTime: candle.time, slPct, tpPct };
      const exit = checkSlTpOnTicks(tradeInfo, i);
      if (exit) {
        const entry = candle.close;
        const returnPct = (dir === "buy" || dir === "sell") && dir === "buy"
          ? ((exit.exitPrice - entry) / entry) * 100
          : ((entry - exit.exitPrice) / entry) * 100;
        const returnR = slPct > 0 ? Math.round((returnPct / slPct) * 10000) / 10000 : 0;

        trades.push({
          entryTime: candle.time,
          exitTime: exit.exitTime,
          direction: dir as "buy" | "sell",
          entryPrice: entry,
          exitPrice: exit.exitPrice,
          returnPct: Math.round(returnPct * 10000) / 10000,
          slPct,
          tpPct,
          exitReason: exit.exitReason,
          durationCandles: exit.exitTfIdx - i,
          atr: Math.round(atr * 1e6) / 1e6,
          positionMultiplier: slPct > 0 ? Math.round((riskValue / slPct) * 100) / 100 : 1,
          returnR,
        });
        // Skip TF candles that are within this trade's duration
        // (to detect skipped signals correctly)
        // We don't skip here; the main loop will see openTrade is null and check for signals normally
      } else {
        // Trade never closed by SL/TP — close at last tick
        const lastTick = ticks[ticks.length - 1];
        const entry = candle.close;
        const returnPct = dir === "buy"
          ? ((lastTick.close - entry) / entry) * 100
          : ((entry - lastTick.close) / entry) * 100;
        const returnR = slPct > 0 ? Math.round((returnPct / slPct) * 10000) / 10000 : 0;

        trades.push({
          entryTime: candle.time,
          exitTime: lastTick.time,
          direction: dir as "buy" | "sell",
          entryPrice: entry,
          exitPrice: lastTick.close,
          returnPct: Math.round(returnPct * 10000) / 10000,
          slPct,
          tpPct,
          exitReason: "end",
          durationCandles: ohlcCandles.length - 1 - i,
          atr: Math.round(atr * 1e6) / 1e6,
          positionMultiplier: slPct > 0 ? Math.round((riskValue / slPct) * 100) / 100 : 1,
          returnR,
        });
      }
      // Mark candles during the trade as skipped if they had a rising edge,
      // and advance the main loop past the trade exit
      const lastTradeExitTime = trades[trades.length - 1].exitTime;
      for (let j = i + 1; j < ohlcCandles.length; j++) {
        if (ohlcCandles[j].time > lastTradeExitTime) break;
        const cs = scoreByTime.get(ohlcCandles[j].time);
        const ps = scoreByTime.get(ohlcCandles[j - 1].time);
        if (cs !== undefined && ps !== undefined && ps < confidenceThreshold && cs >= confidenceThreshold) {
          skipped.push({ time: ohlcCandles[j].time, reason: "in_trade" });
        }
        i = j; // advance main loop past this candle
      }
      continue;
    }

    // No M1 ticks — use TF candles for SL/TP (legacy path)
    openTrade = {
      direction: dir as "buy" | "sell",
      entryPrice: candle.close,
      entryTime: candle.time,
      entryIdx: i,
      slPct,
      tpPct,
      atr: Math.round(atr * 1e6) / 1e6,
    };
  }

  // Close any remaining open trade at last candle close (TF-level fallback)
  if (openTrade) {
    const lastCandle = ohlcCandles[ohlcCandles.length - 1];
    const entry = openTrade.entryPrice;
    const dir = openTrade.direction;
    const returnPct = dir === "buy"
      ? ((lastCandle.close - entry) / entry) * 100
      : ((entry - lastCandle.close) / entry) * 100;

    const returnR = openTrade.slPct > 0
      ? Math.round((returnPct / openTrade.slPct) * 10000) / 10000
      : 0;

    trades.push({
      entryTime: openTrade.entryTime,
      exitTime: lastCandle.time,
      direction: dir,
      entryPrice: entry,
      exitPrice: lastCandle.close,
      returnPct: Math.round(returnPct * 10000) / 10000,
      slPct: openTrade.slPct,
      tpPct: openTrade.tpPct,
      exitReason: "end",
      durationCandles: ohlcCandles.length - 1 - openTrade.entryIdx,
      atr: openTrade.atr,
      positionMultiplier: openTrade.slPct > 0
        ? Math.round((riskValue / openTrade.slPct) * 100) / 100
        : 1,
      returnR,
    });
  }

  const totalReturn = trades.reduce((s, t) => s + t.returnPct, 0);
  const totalReturnR = trades.reduce((s, t) => s + t.returnR, 0);
  const winCount = trades.filter((t) => t.returnPct > 0).length;
  const lossCount = trades.filter((t) => t.returnPct <= 0).length;
  const totalDuration = trades.reduce((s, t) => s + t.durationCandles, 0);

  return {
    trades,
    skipped,
    totalReturn: Math.round(totalReturn * 10000) / 10000,
    totalReturnR: Math.round(totalReturnR * 100) / 100,
    winRate: trades.length > 0 ? (winCount / trades.length) * 100 : 0,
    winCount,
    lossCount,
    avgReturn: trades.length > 0 ? Math.round((totalReturn / trades.length) * 10000) / 10000 : 0,
    avgReturnR: trades.length > 0 ? Math.round((totalReturnR / trades.length) * 100) / 100 : 0,
    avgDurationCandles: trades.length > 0 ? Math.round(totalDuration / trades.length) : 0,
  };
}

// ─── Weight optimizer ────────────────────────────────────────────────────────

export interface OptimizeResult {
  weights: Record<string, number>;
  confidenceThreshold: number;
  backtest: BacktestResult;
  combinationsTested: number;
}

/**
 * Brute-force all weight × threshold combinations and return the one
 * with the highest totalReturnR.
 *
 * Weights: 5 values summing to 1.0 in `step` increments (~10,626 combos at 0.05).
 * Threshold: 0.30 → 0.90 in 0.05 steps (13 values).
 * Total: ~138K combos — stays under a few seconds thanks to precomputed ATRs
 * and a tight inline backtest that only tracks totalR.
 */
export function optimizeWeights(params: {
  domainScores: { key: string; data: { time: number; value: number }[] }[];
  ohlcCandles: OHLCCandle[];
  /** M1 candles for precise SL/TP in the final backtest (not used in the brute-force loop for perf). */
  m1Candles?: OHLCCandle[];
  riskMode: string;
  riskValue: number;
  rewardRatio: number;
  tradesPerDay: number;
  step?: number;
  thresholdMin?: number;
  thresholdMax?: number;
  thresholdStep?: number;
}): OptimizeResult | null {
  const {
    domainScores, ohlcCandles,
    riskMode, riskValue, rewardRatio, tradesPerDay, step = 0.05,
    thresholdMin = 0.30, thresholdMax = 0.90, thresholdStep = 0.05,
  } = params;

  const n = ohlcCandles.length;
  if (!domainScores.length || !domainScores[0].data.length || n < ATR_PERIOD + 2) return null;

  const scoreCount = domainScores[0].data.length;
  const dCount = domainScores.length;
  const steps = Math.round(1 / step);
  const keys = domainScores.map((d) => d.key);

  // Flat domain value arrays for fast inner-loop access
  const dVals = domainScores.map((d) => d.data.map((p) => p.value));
  const sTimes = domainScores[0].data.map((d) => d.time);

  // Map OHLC candle times → indices
  const ohlcTimeMap = new Map<number, number>();
  for (let i = 0; i < n; i++) ohlcTimeMap.set(ohlcCandles[i].time, i);

  // Build score→OHLC index mapping (set once, reused for all combos)
  const mapping: [number, number][] = []; // [ohlcIdx, scoreIdx]
  for (let si = 0; si < scoreCount; si++) {
    const oi = ohlcTimeMap.get(sTimes[si]);
    if (oi !== undefined) mapping.push([oi, si]);
  }

  // Typed arrays reused across combos
  const scores = new Float64Array(n);
  const hasScore = new Uint8Array(n);
  for (const [oi] of mapping) hasScore[oi] = 1;

  // Precompute ATR for every candle index (avoids repeated slicing in the hot loop)
  const atrs = new Float64Array(n);
  {
    const trs: number[] = [];
    for (let i = 1; i < n; i++) {
      const c = ohlcCandles[i];
      const pc = ohlcCandles[i - 1].close;
      trs.push(Math.max(c.high - c.low, Math.abs(c.high - pc), Math.abs(c.low - pc)));
      const start = Math.max(0, trs.length - ATR_PERIOD);
      let sum = 0;
      for (let j = start; j < trs.length; j++) sum += trs[j];
      atrs[i] = sum / (trs.length - start);
    }
  }

  // Build threshold candidates
  const thresholds: number[] = [];
  for (let t = thresholdMin; t <= thresholdMax + 1e-9; t += thresholdStep) {
    thresholds.push(Math.round(t * 100) / 100);
  }

  let bestW: number[] | null = null;
  let bestThreshold = 0;
  let bestR = -Infinity;
  let tested = 0;

  for (let a = 0; a <= steps; a++) {
    const wa = a / steps;
    for (let b = 0; b <= steps - a; b++) {
      const wb = b / steps;
      for (let c = 0; c <= steps - a - b; c++) {
        const wc = c / steps;
        for (let d = 0; d <= steps - a - b - c; d++) {
          const we = (steps - a - b - c - d) / steps;
          const wd = d / steps;

          // Fill OHLC-indexed score array (same for all thresholds)
          for (const [oi, si] of mapping) {
            let s = 0;
            for (let j = 0; j < dCount; j++) {
              s += dVals[j][si] * (j === 0 ? wa : j === 1 ? wb : j === 2 ? wc : j === 3 ? wd : we);
            }
            scores[oi] = s;
          }

          // Test each threshold with these weights
          for (const ct of thresholds) {
            tested++;

            // ── Fast inline backtest (only computes totalR) ──
            let totalR = 0;
            let inTrade = false;
            let tDir = 0;    // 1 = buy, -1 = sell
            let tEntry = 0;
            let tSlPct = 0;
            let tTpPct = 0;
            let lastDay = -1;
            let dayTrades = 0;

            for (let i = 1; i < n; i++) {
              const candle = ohlcCandles[i];

              // Check SL / TP
              if (inTrade) {
                let closed = false;
                if (tDir === 1) {
                  const sl = tEntry * (1 - tSlPct / 100);
                  const tp = tEntry * (1 + tTpPct / 100);
                  if (candle.low <= sl) {
                    totalR += tSlPct > 0 ? ((sl - tEntry) / tEntry * 100) / tSlPct : 0;
                    closed = true;
                  } else if (candle.high >= tp) {
                    totalR += tSlPct > 0 ? ((tp - tEntry) / tEntry * 100) / tSlPct : 0;
                    closed = true;
                  }
                } else {
                  const sl = tEntry * (1 + tSlPct / 100);
                  const tp = tEntry * (1 - tTpPct / 100);
                  if (candle.high >= sl) {
                    totalR += tSlPct > 0 ? ((tEntry - sl) / tEntry * 100) / tSlPct : 0;
                    closed = true;
                  } else if (candle.low <= tp) {
                    totalR += tSlPct > 0 ? ((tEntry - tp) / tEntry * 100) / tSlPct : 0;
                    closed = true;
                  }
                }
                if (closed) inTrade = false;
                else continue;
              }

              if (!hasScore[i] || !hasScore[i - 1]) continue;
              const cs = scores[i];
              const ps = scores[i - 1];
              if (!(ps < ct && cs >= ct)) continue;

              const dir = cs >= 0.66 ? 1 : cs <= 0.33 ? -1 : 0;
              if (dir === 0) continue;

              const dk = (candle.time / 86400) | 0;
              if (dk === lastDay) {
                if (dayTrades >= tradesPerDay) continue;
                dayTrades++;
              } else {
                lastDay = dk;
                dayTrades = 1;
              }

              const atr = atrs[i];
              if (atr <= 0) continue;
              const slPct = (atr * ATR_MULTIPLIER / candle.close) * 100;

              inTrade = true;
              tDir = dir;
              tEntry = candle.close;
              tSlPct = slPct;
              tTpPct = slPct * rewardRatio;
            }

            // Close remaining open trade at last candle
            if (inTrade) {
              const last = ohlcCandles[n - 1];
              const rp = tDir === 1
                ? ((last.close - tEntry) / tEntry) * 100
                : ((tEntry - last.close) / tEntry) * 100;
              totalR += tSlPct > 0 ? rp / tSlPct : 0;
            }

            if (totalR > bestR) {
              bestR = totalR;
              bestW = [wa, wb, wc, wd, we];
              bestThreshold = ct;
            }
          }
        }
      }
    }
  }

  if (!bestW) return null;

  // Run the full backtest once with the best weights + threshold for the complete result
  const overallScores: { time: number; value: number }[] = [];
  for (let i = 0; i < scoreCount; i++) {
    let s = 0;
    for (let j = 0; j < dCount; j++) s += dVals[j][i] * bestW[j];
    overallScores.push({ time: sTimes[i], value: Math.round(s * 1000) / 1000 });
  }
  const directions = new Map<number, string>();
  for (const o of overallScores) {
    directions.set(o.time, o.value >= 0.66 ? "buy" : o.value <= 0.33 ? "sell" : "hold");
  }
  const backtest = runBacktest({
    ohlcCandles, m1Candles: params.m1Candles, overallScores, directions,
    confidenceThreshold: bestThreshold, riskMode, riskValue, rewardRatio, tradesPerDay,
  });

  const weights: Record<string, number> = {};
  keys.forEach((k, idx) => { weights[k] = Math.round(bestW![idx] * 100) / 100; });

  return { weights, confidenceThreshold: bestThreshold, backtest, combinationsTested: tested };
}
