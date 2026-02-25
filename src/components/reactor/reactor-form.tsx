"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Activity,
  Brain,
  Check,
  Clock,
  DollarSign,
  Percent,
  Scale,
  SlidersHorizontal,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import type { ReactorConfig } from "@/hooks/use-reactor";

export const INSTRUMENTS = [
  { id: "EUR_USD", label: "EUR/USD", flag: "\u{1F1EA}\u{1F1FA}\u{1F1FA}\u{1F1F8}" },
] as const;

export const TIMEFRAMES = [
  { id: "M1", label: "1 min" },
  { id: "M15", label: "15 min" },
  { id: "H1", label: "1 hour" },
  { id: "H4", label: "4 hours" },
] as const;

export const WEIGHT_SECTIONS = [
  { key: "technical", label: "Technical", description: "RSI, MACD, Bollinger, EMA, ATR", color: "#10b981" },
  { key: "momentum", label: "Momentum", description: "Price changes, volatility, consecutive candles", color: "#06b6d4" },
  { key: "fundamental", label: "Fundamental", description: "Economic events, news sentiment", color: "#f59e0b" },
  { key: "structure", label: "Structure", description: "Trends, support/resistance, market phase", color: "#8b5cf6" },
  { key: "session", label: "Session", description: "Forex session timing, liquidity", color: "#f43f5e" },
] as const;

export type RiskMode = "percentage" | "fixed";
export type WeightKey = typeof WEIGHT_SECTIONS[number]["key"];

export const DEFAULT_WEIGHTS: Record<WeightKey, number> = {
  technical: 0.30,
  momentum: 0.20,
  fundamental: 0.20,
  structure: 0.20,
  session: 0.10,
};

export interface ReactorFormPayload {
  instrument: string;
  trades_per_day: number;
  risk_mode: RiskMode;
  risk_value: number;
  timeframe: string;
  weight_technical: number;
  weight_momentum: number;
  weight_fundamental: number;
  weight_structure: number;
  weight_session: number;
  confidence_threshold: number;
  reward_ratio: number;
  is_active: boolean;
}

interface ReactorFormProps {
  initialConfig?: ReactorConfig;
  onSave: (config: ReactorFormPayload) => Promise<void>;
  saving: boolean;
  error: string;
  onCancel: () => void;
}

export function ReactorForm({ initialConfig, onSave, saving, error, onCancel }: ReactorFormProps) {
  const [instrument, setInstrument] = useState(initialConfig?.instrument ?? "EUR_USD");
  const [tradesPerDay, setTradesPerDay] = useState(String(initialConfig?.trades_per_day ?? 3));
  const [riskMode, setRiskMode] = useState<RiskMode>(initialConfig?.risk_mode ?? "percentage");
  const [riskValue, setRiskValue] = useState(String(initialConfig?.risk_value ?? 1.0));
  const [timeframe, setTimeframe] = useState(initialConfig?.timeframe ?? "H1");
  const [weights, setWeights] = useState<Record<WeightKey, number>>({
    technical: initialConfig?.weight_technical ?? DEFAULT_WEIGHTS.technical,
    momentum: initialConfig?.weight_momentum ?? DEFAULT_WEIGHTS.momentum,
    fundamental: initialConfig?.weight_fundamental ?? DEFAULT_WEIGHTS.fundamental,
    structure: initialConfig?.weight_structure ?? DEFAULT_WEIGHTS.structure,
    session: initialConfig?.weight_session ?? DEFAULT_WEIGHTS.session,
  });
  const [confidenceThreshold, setConfidenceThreshold] = useState(
    initialConfig?.confidence_threshold ?? 0.60
  );
  const [rewardRatio, setRewardRatio] = useState(String(initialConfig?.reward_ratio ?? 2.0));
  const [validationError, setValidationError] = useState("");

  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  const totalPct = Math.round(totalWeight * 100);

  const updateWeight = (key: WeightKey, raw: number) => {
    setWeights((prev) => ({
      ...prev,
      [key]: Math.round(Math.min(1, Math.max(0, raw)) * 100) / 100,
    }));
  };

  const handleSubmit = async () => {
    setValidationError("");

    const trades = parseInt(tradesPerDay);
    const risk = parseFloat(riskValue);
    const rr = parseFloat(rewardRatio);

    if (isNaN(trades) || trades < 1 || trades > 50) {
      setValidationError("Trades per day must be between 1 and 50");
      return;
    }
    if (isNaN(risk) || risk <= 0) {
      setValidationError("Risk value must be greater than 0");
      return;
    }
    if (riskMode === "percentage" && risk > 100) {
      setValidationError("Risk percentage cannot exceed 100%");
      return;
    }
    if (isNaN(rr) || rr < 0.5 || rr > 10) {
      setValidationError("Reward ratio must be between 0.5 and 10");
      return;
    }
    if (totalPct !== 100) {
      setValidationError(`Weights must sum to 100% (currently ${totalPct}%)`);
      return;
    }

    await onSave({
      instrument,
      trades_per_day: trades,
      risk_mode: riskMode,
      risk_value: risk,
      timeframe,
      weight_technical: weights.technical,
      weight_momentum: weights.momentum,
      weight_fundamental: weights.fundamental,
      weight_structure: weights.structure,
      weight_session: weights.session,
      confidence_threshold: confidenceThreshold,
      reward_ratio: rr,
      is_active: initialConfig?.is_active ?? false,
    });
  };

  const displayError = validationError || error;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Instrument Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-400" />
              Instrument
            </CardTitle>
            <CardDescription>
              Select the currency pair to trade
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3">
              {INSTRUMENTS.map((inst) => (
                <button
                  key={inst.id}
                  onClick={() => setInstrument(inst.id)}
                  className={cn(
                    "flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium transition-all duration-200",
                    instrument === inst.id
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                      : "border-zinc-800/60 bg-zinc-900/30 text-zinc-400 hover:border-zinc-700/60 hover:text-zinc-300"
                  )}
                >
                  <span className="flex items-center gap-3">
                    <span className="text-lg">{inst.flag}</span>
                    {inst.label}
                  </span>
                  {instrument === inst.id && (
                    <Check className="h-4 w-4 text-emerald-400" />
                  )}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-zinc-600">
              More instruments coming soon
            </p>
          </CardContent>
        </Card>

        {/* Trading Parameters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              Trading Parameters
            </CardTitle>
            <CardDescription>
              Define your daily trading limits and risk appetite
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Input
              id="trades-per-day"
              label="Trades per day"
              type="number"
              min={1}
              max={50}
              value={tradesPerDay}
              onChange={(e) => setTradesPerDay(e.target.value)}
              placeholder="3"
            />

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-zinc-300">
                Risk per trade
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setRiskMode("percentage")}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all duration-200",
                    riskMode === "percentage"
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                      : "border-zinc-800/60 bg-zinc-900/30 text-zinc-500 hover:border-zinc-700/60 hover:text-zinc-300"
                  )}
                >
                  <Percent className="h-3.5 w-3.5" />
                  Percentage
                </button>
                <button
                  onClick={() => setRiskMode("fixed")}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all duration-200",
                    riskMode === "fixed"
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                      : "border-zinc-800/60 bg-zinc-900/30 text-zinc-500 hover:border-zinc-700/60 hover:text-zinc-300"
                  )}
                >
                  <DollarSign className="h-3.5 w-3.5" />
                  Fixed Amount
                </button>
              </div>
            </div>

            <Input
              id="risk-value"
              label={riskMode === "percentage" ? "Risk per trade (%)" : "Risk per trade (USD)"}
              type="number"
              min={0}
              step={riskMode === "percentage" ? "0.1" : "1"}
              value={riskValue}
              onChange={(e) => setRiskValue(e.target.value)}
              placeholder={riskMode === "percentage" ? "1.0" : "50"}
            />

            <p className="text-xs text-zinc-600">
              {riskMode === "percentage"
                ? `Each trade will risk ${riskValue || "0"}% of your portfolio balance`
                : `Each trade will risk $${riskValue || "0"} USD`}
            </p>

            <div className="flex flex-col gap-2 border-t border-zinc-800/60 pt-6">
              <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
                <Scale className="h-3.5 w-3.5 text-emerald-400" />
                Reward Ratio (R:R)
              </label>
              <Input
                id="reward-ratio"
                type="number"
                min={0.5}
                max={10}
                step={0.1}
                value={rewardRatio}
                onChange={(e) => setRewardRatio(e.target.value)}
                placeholder="2.0"
              />
              <p className="text-xs text-zinc-600">
                TP = SL × {rewardRatio || "0"}. A ratio of 2.0 means you target 2× the risk for each trade.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Timeframe */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-400" />
              Timeframe
            </CardTitle>
            <CardDescription>
              Primary analysis timeframe for trade signals
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf.id}
                  onClick={() => setTimeframe(tf.id)}
                  className={cn(
                    "flex flex-1 items-center justify-center rounded-xl border px-4 py-3 text-sm font-medium transition-all duration-200",
                    timeframe === tf.id
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                      : "border-zinc-800/60 bg-zinc-900/30 text-zinc-500 hover:border-zinc-700/60 hover:text-zinc-300"
                  )}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Confidence Threshold */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-emerald-400" />
              Confidence Threshold
            </CardTitle>
            <CardDescription>
              Minimum score required to trigger a trade signal
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              type="range"
              min={0.3}
              max={0.9}
              step={0.05}
              value={confidenceThreshold}
              onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
              className="w-full accent-emerald-500"
            />
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>Aggressive (0.30)</span>
              <span className="text-sm font-semibold text-emerald-400">
                {confidenceThreshold.toFixed(2)}
              </span>
              <span>Conservative (0.90)</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analysis Weights — full width */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-emerald-400" />
            Analysis Weights
          </CardTitle>
          <CardDescription>
            Adjust the importance of each analysis domain.{" "}
            <span className={cn(
              "font-semibold",
              totalPct === 100 ? "text-emerald-400" : "text-red-400"
            )}>
              {totalPct}%
            </span>
            {totalPct !== 100 && (
              <span className="text-red-400/70">
                {" "}— must be 100% to save
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {WEIGHT_SECTIONS.map((section) => {
              const w = weights[section.key];
              const pct = Math.round(w * 100);
              const isOff = w === 0;

              return (
                <div key={section.key} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: isOff ? "#3f3f46" : section.color }}
                      />
                      <span className={cn(
                        "text-sm font-medium",
                        isOff ? "text-zinc-600" : "text-zinc-200"
                      )}>
                        {section.label}
                      </span>
                      <span className="text-xs text-zinc-600">
                        {section.description}
                      </span>
                    </div>
                    <span
                      className="min-w-[3rem] text-right text-sm font-bold tabular-nums"
                      style={{ color: isOff ? "#52525b" : section.color }}
                    >
                      {pct}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={w}
                    onChange={(e) => updateWeight(section.key, parseFloat(e.target.value))}
                    className="w-full accent-emerald-500"
                    style={{ accentColor: section.color }}
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {displayError && (
        <p className="text-sm text-red-400">{displayError}</p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4">
        <Button
          variant="primary"
          size="lg"
          loading={saving}
          onClick={handleSubmit}
        >
          {initialConfig ? "Update Configuration" : "Save Configuration"}
        </Button>
        <Button variant="outline" size="lg" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
