"use client";

import { Badge } from "@/components/ui/badge";
import { ArrowDown, ArrowUp, Circle, GitBranch } from "lucide-react";

interface Condition {
  type: string;
  params?: Record<string, unknown>;
  operator?: string;
  conditions?: Condition[];
}

interface RuleGroup {
  operator: string;
  conditions?: Condition[];
}

interface TradingRules {
  buy_rules?: RuleGroup;
  sell_rules?: RuleGroup;
  close_rules?: RuleGroup;
}

const CONDITION_LABELS: Record<string, string> = {
  every_candle: "Every candle (DCA)",
  every_n_candles: "Every N candles",
  candle_is_green: "Candle is green (bullish)",
  candle_is_red: "Candle is red (bearish)",
  candle_body_gt: "Candle body size >",
  consecutive_green: "Consecutive green candles",
  consecutive_red: "Consecutive red candles",
  doji: "Doji pattern (indecision)",
  engulfing_bullish: "Bullish engulfing pattern",
  engulfing_bearish: "Bearish engulfing pattern",
  rsi_above: "RSI above",
  rsi_below: "RSI below",
  macd_cross_up: "MACD bullish crossover",
  macd_cross_down: "MACD bearish crossover",
  macd_positive: "MACD histogram positive",
  macd_negative: "MACD histogram negative",
  ema_cross_up: "EMA bullish crossover",
  ema_cross_down: "EMA bearish crossover",
  price_above_ema: "Price above EMA",
  price_below_ema: "Price below EMA",
  price_above_bb_upper: "Price above Bollinger upper",
  price_below_bb_lower: "Price below Bollinger lower",
  bb_squeeze: "Bollinger Band squeeze",
  price_above: "Price above",
  price_below: "Price below",
  price_change_pct_up: "Price up by %",
  price_change_pct_down: "Price down by %",
  price_dropped_pct: "Price dropped by %",
  price_near_high: "Price near recent high",
  price_near_low: "Price near recent low",
  volume_above_avg: "Volume above average",
  volume_below_avg: "Volume below average",
  volume_spike: "Volume spike",
  has_no_open_trades: "No open trades",
  has_open_trades: "Has open trades",
};

function formatParams(params: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, val] of Object.entries(params)) {
    if (key === "threshold") parts.push(`${val}`);
    else if (key === "period") parts.push(`period: ${val}`);
    else if (key === "pct") parts.push(`${val}%`);
    else if (key === "lookback") parts.push(`over ${val} candles`);
    else if (key === "count") parts.push(`${val} candles`);
    else if (key === "pips") parts.push(`${val} pips`);
    else if (key === "fast" || key === "slow") parts.push(`${key}: ${val}`);
    else if (key === "multiplier") parts.push(`${val}x`);
    else if (key === "n") parts.push(`every ${val}`);
    else parts.push(`${key}=${val}`);
  }
  return parts.join(", ");
}

function ConditionNode({ condition }: { condition: Condition }) {
  // Nested rule group
  if (condition.operator) {
    return <RuleGroupNode group={condition as RuleGroup} />;
  }

  const label = CONDITION_LABELS[condition.type] || condition.type;
  const paramStr = condition.params ? formatParams(condition.params) : "";

  return (
    <div className="flex items-center gap-2 rounded-lg border border-zinc-800/40 bg-zinc-900/30 px-3 py-2">
      <Circle className="h-2 w-2 text-zinc-600" />
      <span className="text-sm text-zinc-300">{label}</span>
      {paramStr && (
        <span className="text-xs text-zinc-500">{paramStr}</span>
      )}
    </div>
  );
}

function RuleGroupNode({ group }: { group: RuleGroup }) {
  if (group.operator === "always") {
    return (
      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
        <span className="text-sm font-medium text-emerald-400">Always (every tick)</span>
      </div>
    );
  }

  if (group.operator === "never") {
    return (
      <div className="rounded-lg border border-zinc-800/40 bg-zinc-900/30 px-3 py-2">
        <span className="text-sm text-zinc-600">Never</span>
      </div>
    );
  }

  const conditions = group.conditions || [];

  return (
    <div className="space-y-2">
      {conditions.map((c, i) => (
        <div key={i}>
          <ConditionNode condition={c} />
          {i < conditions.length - 1 && (
            <div className="flex items-center gap-2 py-1 pl-4">
              <GitBranch className="h-3 w-3 text-zinc-600" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-600">
                {group.operator}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function RuleDisplay({ rules }: { rules: TradingRules }) {
  return (
    <div className="space-y-4">
      {/* Buy rules */}
      {rules.buy_rules && (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <ArrowUp className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Buy when</span>
          </div>
          <RuleGroupNode group={rules.buy_rules} />
        </div>
      )}

      {/* Sell rules */}
      {rules.sell_rules && (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <ArrowDown className="h-4 w-4 text-red-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-red-400">Sell when</span>
          </div>
          <RuleGroupNode group={rules.sell_rules} />
        </div>
      )}

      {/* Close rules */}
      {rules.close_rules && (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="warning">CLOSE</Badge>
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">Close all when</span>
          </div>
          <RuleGroupNode group={rules.close_rules} />
        </div>
      )}
    </div>
  );
}
