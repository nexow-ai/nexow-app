"use client";

import { useCallback, useRef, useState } from "react";

// ------------------------------------------------------------------
// Types matching the engine's SSE payload
// ------------------------------------------------------------------

export interface BacktestTrade {
  instrument: string;
  direction: "buy" | "sell";
  entry_price: number;
  entry_time: string;
  exit_price: number | null;
  exit_time: string | null;
  return_pct: number | null;
  stop_loss_pct: number | null;
  take_profit_pct: number | null;
  status: "open" | "closed";
}

export interface BacktestStats {
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number;
  total_return_pct: number;
  avg_return_pct: number;
  max_drawdown: number;
  sharpe_ratio: number;
  profit_factor: number;
  best_trade_pct: number;
  worst_trade_pct: number;
  avg_trade_duration_hours: number;
}

export interface EquityPoint {
  time: string;
  equity: number;
}

export interface BacktestResult {
  stats: BacktestStats;
  trades: BacktestTrade[];
  equity_curve: EquityPoint[];
}

export type BacktestPhase = "idle" | "fetching" | "simulating" | "complete" | "error";

export interface BacktestState {
  phase: BacktestPhase;
  progressPct: number;
  message: string;
  result: BacktestResult | null;
  /** Equity curve that grows in real-time during simulation */
  liveEquityCurve: EquityPoint[];
}

interface BacktestRequestPayload {
  config: Record<string, unknown>;
  instruments: { instrument: string; timeframe: string }[];
  exit_config: { stop_loss_pct?: number | null; take_profit_pct?: number | null };
  period_days?: number;
}

// ------------------------------------------------------------------
// Hook
// ------------------------------------------------------------------

export function useBacktest() {
  const [state, setState] = useState<BacktestState>({
    phase: "idle",
    progressPct: 0,
    message: "",
    result: null,
    liveEquityCurve: [],
  });

  const abortRef = useRef<AbortController | null>(null);
  // Accumulate equity points across SSE events
  const equityAccRef = useRef<EquityPoint[]>([]);

  const runBacktest = useCallback(async (payload: BacktestRequestPayload) => {
    // Abort any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    equityAccRef.current = [];

    setState({
      phase: "fetching",
      progressPct: 0,
      message: "Starting backtest...",
      result: null,
      liveEquityCurve: [],
    });

    try {
      const response = await fetch("/api/backtest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errText = await response.text();
        setState({
          phase: "error",
          progressPct: 0,
          message: `Server error: ${errText}`,
          result: null,
          liveEquityCurve: [],
        });
        return;
      }

      // Parse the SSE stream
      const reader = response.body?.getReader();
      if (!reader) {
        setState({
          phase: "error",
          progressPct: 0,
          message: "No response stream",
          result: null,
          liveEquityCurve: [],
        });
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events from the buffer
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith("data:")) {
            const jsonStr = line.slice(5).trim();
            if (!jsonStr) continue;

            try {
              const event = JSON.parse(jsonStr);
              const phase = event.phase as BacktestPhase;

              // Accumulate streamed equity curve points
              if (event.equity_curve && Array.isArray(event.equity_curve)) {
                equityAccRef.current = [
                  ...equityAccRef.current,
                  ...event.equity_curve,
                ];
              }

              setState({
                phase,
                progressPct: event.progress_pct ?? 0,
                message: event.message ?? "",
                result: event.result ?? null,
                liveEquityCurve: [...equityAccRef.current],
              });
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return; // User cancelled
      }
      setState({
        phase: "error",
        progressPct: 0,
        message: `Connection error: ${err instanceof Error ? err.message : "Unknown"}`,
        result: null,
        liveEquityCurve: [],
      });
    }
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    equityAccRef.current = [];
    setState({
      phase: "idle",
      progressPct: 0,
      message: "",
      result: null,
      liveEquityCurve: [],
    });
  }, []);

  return { state, runBacktest, reset };
}
