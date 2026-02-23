"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/hooks/use-session";
import {
  Activity,
  Brain,
  Check,
  Clock,
  DollarSign,
  Percent,
  SlidersHorizontal,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useState } from "react";

const INSTRUMENTS = [
  { id: "EUR_USD", label: "EUR/USD", flag: "🇪🇺🇺🇸" },
] as const;

const TIMEFRAMES = [
  { id: "M15", label: "15 min" },
  { id: "H1", label: "1 hour" },
  { id: "H4", label: "4 hours" },
] as const;

const WEIGHT_SECTIONS = [
  { key: "technical", label: "Technical", description: "RSI, MACD, Bollinger, EMA, ATR" },
  { key: "momentum", label: "Momentum", description: "Price changes, volatility, consecutive candles" },
  { key: "fundamental", label: "Fundamental", description: "Economic events, news sentiment" },
  { key: "structure", label: "Structure", description: "Trends, support/resistance, market phase" },
  { key: "session", label: "Session", description: "Forex session timing, liquidity" },
] as const;

type RiskMode = "percentage" | "fixed";
type WeightKey = typeof WEIGHT_SECTIONS[number]["key"];

interface ReactorConfig {
  id?: string;
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
  is_active: boolean;
}

const DEFAULT_WEIGHTS: Record<WeightKey, number> = {
  technical: 0.30,
  momentum: 0.20,
  fundamental: 0.20,
  structure: 0.20,
  session: 0.10,
};

export default function ReactorPage() {
  const { user, loading: sessionLoading } = useSession();

  // Form state
  const [instrument, setInstrument] = useState("EUR_USD");
  const [tradesPerDay, setTradesPerDay] = useState("3");
  const [riskMode, setRiskMode] = useState<RiskMode>("percentage");
  const [riskValue, setRiskValue] = useState("1.0");
  const [timeframe, setTimeframe] = useState("H1");
  const [weights, setWeights] = useState<Record<WeightKey, number>>({ ...DEFAULT_WEIGHTS });
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.60);

  // UI state
  const [saving, setSaving] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [existingConfig, setExistingConfig] = useState<ReactorConfig | null>(null);
  const [snapshotData, setSnapshotData] = useState<string | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [snapshotError, setSnapshotError] = useState("");

  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);

  const updateWeight = (key: WeightKey, value: number) => {
    setWeights((prev) => ({ ...prev, [key]: value }));
  };

  const loadConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/reactor");
      const data = await res.json();
      if (res.ok && data.configs?.length > 0) {
        const c = data.configs[0];
        setExistingConfig(c);
        setInstrument(c.instrument);
        setTradesPerDay(String(c.trades_per_day));
        setRiskMode(c.risk_mode);
        setRiskValue(String(c.risk_value));
        setTimeframe(c.timeframe || "H1");
        setWeights({
          technical: c.weight_technical ?? 0.30,
          momentum: c.weight_momentum ?? 0.20,
          fundamental: c.weight_fundamental ?? 0.20,
          structure: c.weight_structure ?? 0.20,
          session: c.weight_session ?? 0.10,
        });
        setConfidenceThreshold(c.confidence_threshold ?? 0.60);
      }
    } catch {
      // No config yet — use defaults
    } finally {
      setLoadingConfig(false);
    }
  }, []);

  useEffect(() => {
    if (user) loadConfig();
  }, [user, loadConfig]);

  const handleSave = async () => {
    setError("");
    setSaved(false);

    const trades = parseInt(tradesPerDay);
    const risk = parseFloat(riskValue);

    if (isNaN(trades) || trades < 1 || trades > 50) {
      setError("Trades per day must be between 1 and 50");
      return;
    }
    if (isNaN(risk) || risk <= 0) {
      setError("Risk value must be greater than 0");
      return;
    }
    if (riskMode === "percentage" && risk > 100) {
      setError("Risk percentage cannot exceed 100%");
      return;
    }
    if (Math.abs(totalWeight - 1.0) > 0.05) {
      setError(`Weights must sum to 1.00 (currently ${totalWeight.toFixed(2)})`);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/reactor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
          is_active: existingConfig?.is_active ?? false,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save configuration");
      }

      const data = await res.json();
      setExistingConfig(data.config);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  if (sessionLoading || loadingConfig) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Forex Reactor</h1>
          <p className="text-sm text-zinc-500">Loading configuration...</p>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-48 rounded-2xl bg-zinc-800/40" />
          <div className="h-48 rounded-2xl bg-zinc-800/40" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Forex Reactor</h1>
          <p className="text-sm text-zinc-500">
            Configure your automated trading parameters
          </p>
        </div>
        {existingConfig && (
          <Badge variant={existingConfig.is_active ? "success" : "default"}>
            {existingConfig.is_active ? "Active" : "Inactive"}
          </Badge>
        )}
      </div>

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
            Adjust the importance of each analysis section. Weights must sum to 1.00.
            {" "}
            <span className={cn(
              "font-semibold",
              Math.abs(totalWeight - 1.0) > 0.05 ? "text-red-400" : "text-emerald-400"
            )}>
              Current total: {totalWeight.toFixed(2)}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-5">
            {WEIGHT_SECTIONS.map((section) => (
              <div key={section.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-zinc-200">
                      {section.label}
                    </span>
                    <span className="ml-2 text-xs text-zinc-600">
                      {section.description}
                    </span>
                  </div>
                  <span className="w-12 text-right text-sm font-semibold text-emerald-400">
                    {(weights[section.key] * 100).toFixed(0)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={0.6}
                  step={0.05}
                  value={weights[section.key]}
                  onChange={(e) => updateWeight(section.key, parseFloat(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4">
        <Button
          variant="primary"
          size="lg"
          loading={saving}
          onClick={handleSave}
        >
          {saved ? (
            <>
              <Check className="h-4 w-4" />
              Saved
            </>
          ) : existingConfig ? (
            "Update Configuration"
          ) : (
            "Save Configuration"
          )}
        </Button>
        <Button
          variant="outline"
          size="lg"
          loading={snapshotLoading}
          onClick={async () => {
            setSnapshotLoading(true);
            setSnapshotError("");
            setSnapshotData(null);
            try {
              const res = await fetch(`/api/snapshot?instrument=${instrument}`);
              if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || "Snapshot unavailable");
              }
              const data = await res.json();
              setSnapshotData(JSON.stringify(data, null, 2));
            } catch (err) {
              setSnapshotError(err instanceof Error ? err.message : "Failed to fetch snapshot");
            } finally {
              setSnapshotLoading(false);
            }
          }}
        >
          Test Snapshot
        </Button>
        {saved && (
          <span className="text-sm text-emerald-400">
            Configuration saved successfully
          </span>
        )}
      </div>

      {/* Snapshot test result */}
      {snapshotError && (
        <p className="text-sm text-red-400">{snapshotError}</p>
      )}
      {snapshotData && (
        <Card>
          <CardContent className="py-4">
            <pre className="max-h-[600px] overflow-auto text-xs leading-relaxed text-zinc-400">
              {snapshotData}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
