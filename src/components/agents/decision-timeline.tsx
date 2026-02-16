"use client";

import { cn } from "@/lib/utils";
import type { Database } from "@/lib/types/database";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  ChevronRight,
  Coins,
  Clock,
  BarChart3,
  Newspaper,
  CalendarClock,
  Globe,
  Activity,
  Radio,
} from "lucide-react";
import { useState } from "react";

type Evaluation = Database["public"]["Tables"]["agent_evaluations"]["Row"];

const ACTION_STYLES: Record<
  string,
  { label: string; variant: "success" | "danger" | "default" | "info"; bg: string }
> = {
  buy: { label: "BUY", variant: "success", bg: "border-l-emerald-500" },
  sell: { label: "SELL", variant: "danger", bg: "border-l-red-500" },
  hold: { label: "HOLD", variant: "default", bg: "border-l-zinc-700" },
  close: { label: "CLOSE", variant: "info", bg: "border-l-blue-500" },
};

const SOURCE_ICONS: Record<string, typeof BarChart3> = {
  technical_analysis: BarChart3,
  news_sentiment: Newspaper,
  economic_calendar: CalendarClock,
  web_search: Globe,
  price_action: Activity,
  order_flow: Radio,
};

const SOURCE_LABELS: Record<string, string> = {
  technical_analysis: "Technical",
  news_sentiment: "News",
  economic_calendar: "Calendar",
  web_search: "Web",
  price_action: "Price Action",
  order_flow: "COT",
};

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    month: "short",
    day: "numeric",
  });
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-zinc-800">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-zinc-600"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] tabular-nums text-zinc-500">{pct}%</span>
    </div>
  );
}

function EvaluationCard({ evaluation }: { evaluation: Evaluation }) {
  const [expanded, setExpanded] = useState(false);
  const style = ACTION_STYLES[evaluation.action] ?? ACTION_STYLES.hold;
  const isHold = evaluation.action === "hold";
  const sources = (evaluation.data_sources_used ?? []) as string[];

  return (
    <div
      className={cn(
        "border-l-2 rounded-r-xl border border-zinc-800/40 bg-zinc-900/20 transition-all duration-200",
        style.bg,
        isHold ? "opacity-60 hover:opacity-100" : ""
      )}
    >
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 p-3 text-left"
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Badge variant={style.variant} className="shrink-0">
            {style.label}
          </Badge>
          <span className="text-xs font-medium text-zinc-300">
            {evaluation.instrument.replace("_", "/")}
          </span>
          <ConfidenceBar value={evaluation.confidence} />
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {evaluation.total_tokens > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-zinc-600">
              <Coins className="h-3 w-3" />
              {evaluation.total_tokens}
            </span>
          )}
          <span className="text-[10px] tabular-nums text-zinc-600">
            {formatTime(evaluation.created_at)}
          </span>
          {expanded ? (
            <ChevronDown className="h-3 w-3 text-zinc-600" />
          ) : (
            <ChevronRight className="h-3 w-3 text-zinc-600" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-zinc-800/30 px-3 pb-3 pt-2.5 space-y-2.5">
          {evaluation.reasoning && (
            <p className="text-xs leading-relaxed text-zinc-400">
              {evaluation.reasoning}
            </p>
          )}

          {sources.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {sources.map((src) => {
                const Icon = SOURCE_ICONS[src];
                return (
                  <span
                    key={src}
                    className="inline-flex items-center gap-1 rounded-md bg-zinc-800/60 px-1.5 py-0.5 text-[10px] text-zinc-500"
                  >
                    {Icon && <Icon className="h-2.5 w-2.5" />}
                    {SOURCE_LABELS[src] ?? src}
                  </span>
                );
              })}
            </div>
          )}

          <div className="flex items-center gap-4 text-[10px] text-zinc-600">
            {evaluation.llm_model && (
              <span>{evaluation.llm_model}</span>
            )}
            {evaluation.duration_ms != null && (
              <span className="flex items-center gap-0.5">
                <Clock className="h-2.5 w-2.5" />
                {(evaluation.duration_ms / 1000).toFixed(1)}s
              </span>
            )}
            {evaluation.prompt_tokens > 0 && (
              <span>
                {evaluation.prompt_tokens}p / {evaluation.completion_tokens}c tokens
              </span>
            )}
          </div>

          {evaluation.technical_summary && (
            <details className="rounded-lg border border-zinc-800/30 bg-zinc-900/30">
              <summary className="cursor-pointer px-2.5 py-1.5 text-[10px] font-medium text-zinc-600 hover:text-zinc-400">
                Technical Analysis
              </summary>
              <pre className="whitespace-pre-wrap px-2.5 pb-2 text-[10px] text-zinc-500">
                {evaluation.technical_summary}
              </pre>
            </details>
          )}

          {evaluation.sentiment_summary && evaluation.sentiment_summary !== "No external data available." && (
            <details className="rounded-lg border border-zinc-800/30 bg-zinc-900/30">
              <summary className="cursor-pointer px-2.5 py-1.5 text-[10px] font-medium text-zinc-600 hover:text-zinc-400">
                Sentiment Analysis
              </summary>
              <pre className="whitespace-pre-wrap px-2.5 pb-2 text-[10px] text-zinc-500">
                {evaluation.sentiment_summary}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

interface DecisionTimelineProps {
  evaluations: Evaluation[];
  loading?: boolean;
  className?: string;
}

export function DecisionTimeline({ evaluations, loading, className }: DecisionTimelineProps) {
  if (loading) {
    return (
      <div className={cn("flex items-center justify-center py-8", className)}>
        <span className="text-xs text-zinc-600">Loading evaluations...</span>
      </div>
    );
  }

  if (evaluations.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-8 text-center", className)}>
        <p className="text-xs text-zinc-600">No evaluations yet.</p>
        <p className="mt-1 text-[10px] text-zinc-700">
          Decisions will appear here as the agent evaluates the market.
        </p>
      </div>
    );
  }

  let currentDate = "";

  return (
    <div className={cn("space-y-1.5 overflow-y-auto", className)}>
      {evaluations.map((evaluation) => {
        const date = formatDate(evaluation.created_at);
        const showDate = date !== currentDate;
        currentDate = date;

        return (
          <div key={evaluation.id}>
            {showDate && (
              <div className="sticky top-0 z-10 mb-1 bg-zinc-950/80 px-1 py-1 backdrop-blur-sm">
                <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">
                  {date}
                </span>
              </div>
            )}
            <EvaluationCard evaluation={evaluation} />
          </div>
        );
      })}
    </div>
  );
}
