"use client";

import type { InstrumentConfig } from "@/lib/types/database";

const TIMEFRAMES = ["M1", "M5", "M15", "M30", "H1", "H4", "D"] as const;

interface ChartToolbarProps {
  instruments: InstrumentConfig[];
  activeInstrument: string;
  activeTimeframe: string;
  onInstrumentChange: (instrument: string) => void;
  onTimeframeChange: (timeframe: string) => void;
}

export function ChartToolbar({
  instruments,
  activeInstrument,
  activeTimeframe,
  onInstrumentChange,
  onTimeframeChange,
}: ChartToolbarProps) {
  return (
    <div className="flex items-center justify-between rounded-t-xl border border-zinc-800/60 bg-zinc-900/50 px-3 py-2">
      {/* Asset tabs */}
      <div className="flex items-center gap-1">
        {instruments.map((inst) => {
          const isActive = inst.instrument === activeInstrument;
          return (
            <button
              key={inst.instrument}
              onClick={() => onInstrumentChange(inst.instrument)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                isActive
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-300"
              }`}
            >
              {inst.instrument.replace("_", "/")}
            </button>
          );
        })}
      </div>

      {/* Timeframe buttons */}
      <div className="flex items-center gap-0.5 rounded-lg bg-zinc-900/80 p-0.5">
        {TIMEFRAMES.map((tf) => {
          const isActive = tf === activeTimeframe;
          return (
            <button
              key={tf}
              onClick={() => onTimeframeChange(tf)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all ${
                isActive
                  ? "bg-zinc-700/80 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {tf}
            </button>
          );
        })}
      </div>
    </div>
  );
}
