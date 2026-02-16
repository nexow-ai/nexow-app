"use client";

import { cn } from "@/lib/utils";
import { Check, Shield, Scale, Flame } from "lucide-react";

export type TradingStyle = "conservative" | "balanced" | "aggressive";

interface StyleOption {
  id: TradingStyle;
  label: string;
  description: string;
  detail: string;
  icon: typeof Shield;
  color: string;
  selectedBorder: string;
  selectedBg: string;
  iconColor: string;
}

const STYLES: StyleOption[] = [
  {
    id: "conservative",
    label: "Conservative",
    description: "High confidence only",
    detail: "Fewer trades, strictly risk-averse. Only acts on strong conviction signals above 70% confidence.",
    icon: Shield,
    color: "text-blue-400",
    selectedBorder: "border-blue-500/50",
    selectedBg: "bg-blue-500/5",
    iconColor: "text-blue-400",
  },
  {
    id: "balanced",
    label: "Balanced",
    description: "Moderate confidence",
    detail: "Balanced approach between risk and reward. Takes trades with 50%+ confidence when analysis aligns.",
    icon: Scale,
    color: "text-purple-400",
    selectedBorder: "border-purple-500/50",
    selectedBg: "bg-purple-500/5",
    iconColor: "text-purple-400",
  },
  {
    id: "aggressive",
    label: "Aggressive",
    description: "Lower threshold",
    detail: "More frequent trades with 30%+ confidence. Higher risk tolerance, captures more opportunities.",
    icon: Flame,
    color: "text-amber-400",
    selectedBorder: "border-amber-500/50",
    selectedBg: "bg-amber-500/5",
    iconColor: "text-amber-400",
  },
];

interface TradingStyleSelectorProps {
  selected: TradingStyle;
  onSelect: (style: TradingStyle) => void;
}

export function TradingStyleSelector({ selected, onSelect }: TradingStyleSelectorProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {STYLES.map((style) => {
        const isSelected = selected === style.id;
        const Icon = style.icon;
        return (
          <button
            key={style.id}
            type="button"
            onClick={() => onSelect(style.id)}
            className={cn(
              "relative flex flex-col items-start gap-2.5 rounded-xl border p-4 text-left transition-all duration-200",
              isSelected
                ? `${style.selectedBorder} ${style.selectedBg} shadow-lg`
                : "border-zinc-800/60 bg-zinc-900/30 hover:border-zinc-700/60 hover:bg-zinc-900/50"
            )}
          >
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg border",
                    isSelected
                      ? `${style.selectedBorder} ${style.selectedBg}`
                      : "border-zinc-700/40 bg-zinc-800/50"
                  )}
                >
                  <Icon className={cn("h-4 w-4", isSelected ? style.iconColor : "text-zinc-500")} />
                </div>
                <div>
                  <p className={cn("text-sm font-semibold", isSelected ? "text-zinc-100" : "text-zinc-300")}>
                    {style.label}
                  </p>
                  <p className={cn("text-[10px]", isSelected ? style.color : "text-zinc-600")}>
                    {style.description}
                  </p>
                </div>
              </div>
              {isSelected && (
                <div className={cn("flex h-5 w-5 items-center justify-center rounded-full", style.selectedBg, style.selectedBorder, "border")}>
                  <Check className={cn("h-3 w-3", style.color)} />
                </div>
              )}
            </div>
            <p className="text-xs leading-relaxed text-zinc-500">{style.detail}</p>
          </button>
        );
      })}
    </div>
  );
}
