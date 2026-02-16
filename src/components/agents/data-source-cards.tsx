"use client";

import { cn } from "@/lib/utils";
import {
  BarChart3,
  Newspaper,
  CalendarClock,
  Globe,
  Activity,
  Radio,
  Check,
} from "lucide-react";

interface DataSource {
  id: string;
  label: string;
  description: string;
  icon: typeof BarChart3;
}

const DATA_SOURCES: DataSource[] = [
  {
    id: "technical_analysis",
    label: "Technical Analysis",
    description: "RSI, MACD, Bollinger Bands, moving averages on your timeframes",
    icon: BarChart3,
  },
  {
    id: "news_sentiment",
    label: "News Sentiment",
    description: "Real-time financial headlines scored for bullish/bearish sentiment",
    icon: Newspaper,
  },
  {
    id: "economic_calendar",
    label: "Economic Calendar",
    description: "Upcoming events: NFP, CPI, interest rate decisions and impacts",
    icon: CalendarClock,
  },
  {
    id: "web_search",
    label: "Web Search",
    description: "Live web research for market analysis, commentary and outlooks",
    icon: Globe,
  },
  {
    id: "price_action",
    label: "Price Action",
    description: "Raw candlestick patterns, support/resistance levels, key zones",
    icon: Activity,
  },
  {
    id: "order_flow",
    label: "Order Flow / COT",
    description: "Commitment of Traders positioning data and institutional flows",
    icon: Radio,
  },
];

interface DataSourceCardsProps {
  selected: Set<string>;
  onToggle: (id: string) => void;
}

export function DataSourceCards({ selected, onToggle }: DataSourceCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
      {DATA_SOURCES.map((source) => {
        const isActive = selected.has(source.id);
        const Icon = source.icon;
        return (
          <button
            key={source.id}
            type="button"
            onClick={() => onToggle(source.id)}
            className={cn(
              "group flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all duration-200",
              isActive
                ? "border-purple-500/30 bg-purple-500/5"
                : "border-zinc-800/50 bg-zinc-900/20 hover:border-zinc-700/60 hover:bg-zinc-900/40"
            )}
          >
            <div
              className={cn(
                "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                isActive
                  ? "border-purple-500 bg-purple-500"
                  : "border-zinc-600 group-hover:border-zinc-500"
              )}
            >
              {isActive && <Check className="h-2.5 w-2.5 text-white" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Icon
                  className={cn(
                    "h-3.5 w-3.5 shrink-0",
                    isActive ? "text-purple-400" : "text-zinc-500"
                  )}
                />
                <span
                  className={cn(
                    "text-xs font-semibold",
                    isActive ? "text-purple-300" : "text-zinc-300"
                  )}
                >
                  {source.label}
                </span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
                {source.description}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
