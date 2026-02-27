import { Badge } from "@/components/ui/badge";
import { Activity, BarChart3, Clock, Pencil } from "lucide-react";
import Link from "next/link";
import type { ReactorConfig } from "@/hooks/use-reactor";

const INSTRUMENT_FLAGS: Record<string, string> = {
  EUR_USD: "\u{1F1EA}\u{1F1FA}\u{1F1FA}\u{1F1F8}",
};

const WEIGHT_KEYS = [
  { key: "weight_technical" as const, label: "Tech" },
  { key: "weight_momentum" as const, label: "Mom" },
  { key: "weight_fundamental" as const, label: "Fund" },
  { key: "weight_structure" as const, label: "Struct" },
  { key: "weight_session" as const, label: "Sess" },
];

interface ReactorCardProps {
  config: ReactorConfig;
}

export function ReactorCard({ config }: ReactorCardProps) {
  const flag = INSTRUMENT_FLAGS[config.instrument] ?? "";

  return (
    <Link href={`/reactor/${config.id}`}>
      <div className="group relative overflow-hidden rounded-2xl border border-zinc-800/40 bg-zinc-900/30 p-5 backdrop-blur-sm transition-all duration-300 hover:border-zinc-700/50 hover:bg-zinc-900/50 hover:shadow-lg hover:shadow-black/20">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        <div className="relative">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border-emerald-500/10">
                <Activity className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-semibold text-zinc-100 group-hover:text-white transition-colors">
                  {flag && <span className="mr-1.5">{flag}</span>}
                  {config.instrument.replace("_", "/")}
                </h3>
                <p className="text-xs text-zinc-600">
                  <Clock className="mr-1 inline h-3 w-3" />
                  {config.timeframe}
                </p>
              </div>
            </div>
            <Badge variant={config.is_active ? "success" : "default"}>
              {config.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>

          <div className="mt-4 flex items-center gap-3 text-xs">
            <span className="text-zinc-400">
              Risk:{" "}
              <span className="font-medium text-zinc-200">
                {config.risk_mode === "percentage"
                  ? `${config.risk_value}%`
                  : `$${config.risk_value}`}
              </span>
            </span>
            <span className="text-zinc-600">|</span>
            <span className="text-zinc-400">
              Confidence:{" "}
              <span className="font-medium text-zinc-200">
                {(config.confidence_threshold * 100).toFixed(0)}%
              </span>
            </span>
          </div>

          {/* Mini weight bars */}
          <div className="mt-4 space-y-1.5">
            {WEIGHT_KEYS.map(({ key, label }) => (
              <div key={key} className="flex items-center gap-2">
                <span className="w-10 text-[10px] text-zinc-600">{label}</span>
                <div className="h-1.5 flex-1 rounded-full bg-zinc-800/60">
                  <div
                    className="h-1.5 rounded-full bg-emerald-500/40"
                    style={{ width: `${(config[key] as number) * 100}%` }}
                  />
                </div>
                <span className="w-7 text-right text-[10px] text-zinc-500">
                  {((config[key] as number) * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="mt-4 flex items-center gap-2 pt-3 border-t border-zinc-800/40">
            <Link
              href={`/reactor/${config.id}?tab=edit`}
              onClick={(e) => e.stopPropagation()}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-zinc-800/60 bg-zinc-900/50 px-3 py-2 text-xs font-medium text-zinc-400 transition-all hover:border-zinc-700/60 hover:text-zinc-200"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Link>
            <Link
              href={`/reactor/${config.id}`}
              onClick={(e) => e.stopPropagation()}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-zinc-800/60 bg-zinc-900/50 px-3 py-2 text-xs font-medium text-zinc-400 transition-all hover:border-emerald-500/30 hover:text-emerald-400"
            >
              <BarChart3 className="h-3.5 w-3.5" />
              Insights
            </Link>
          </div>
        </div>
      </div>
    </Link>
  );
}
