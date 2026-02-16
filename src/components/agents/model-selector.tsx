"use client";

import { cn } from "@/lib/utils";
import { Check, Zap, Brain, Sparkles } from "lucide-react";

export interface LLMModel {
  id: string;
  provider: string;
  name: string;
  description: string;
  speed: number;
  intelligence: number;
  cost: number;
  recommended?: boolean;
}

const MODELS: LLMModel[] = [
  {
    id: "gpt-4o-mini",
    provider: "openai",
    name: "GPT-4o Mini",
    description: "Fast and cost-effective. Great for high-frequency evaluation schedules.",
    speed: 5,
    intelligence: 3,
    cost: 1,
    recommended: true,
  },
  {
    id: "gpt-4o",
    provider: "openai",
    name: "GPT-4o",
    description: "More capable reasoning. Better for complex multi-factor strategies.",
    speed: 3,
    intelligence: 5,
    cost: 3,
  },
  {
    id: "claude-sonnet-4-20250514",
    provider: "anthropic",
    name: "Claude Sonnet",
    description: "Strong analytical reasoning. Excels at nuanced market interpretation.",
    speed: 3,
    intelligence: 5,
    cost: 3,
  },
];

function RatingDots({ value, max = 5, color }: { value: number; max?: number; color: string }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <div
          key={i}
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            i < value ? color : "bg-zinc-700/60"
          )}
        />
      ))}
    </div>
  );
}

interface ModelSelectorProps {
  selectedProvider: string;
  selectedModel: string;
  onSelect: (provider: string, model: string) => void;
}

export function ModelSelector({ selectedProvider, selectedModel, onSelect }: ModelSelectorProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {MODELS.map((model) => {
        const isSelected = selectedProvider === model.provider && selectedModel === model.id;
        return (
          <button
            key={model.id}
            type="button"
            onClick={() => onSelect(model.provider, model.id)}
            className={cn(
              "relative flex flex-col items-start gap-3 rounded-xl border p-4 text-left transition-all duration-200",
              isSelected
                ? "border-purple-500/50 bg-purple-500/5 shadow-lg shadow-purple-500/5"
                : "border-zinc-800/60 bg-zinc-900/30 hover:border-zinc-700/60 hover:bg-zinc-900/50"
            )}
          >
            {model.recommended && (
              <span className="absolute -top-2 right-3 rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] font-semibold text-purple-400">
                Recommended
              </span>
            )}

            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg border",
                    isSelected
                      ? "border-purple-500/30 bg-purple-500/10"
                      : "border-zinc-700/40 bg-zinc-800/50"
                  )}
                >
                  {model.provider === "openai" ? (
                    <Sparkles className={cn("h-4 w-4", isSelected ? "text-purple-400" : "text-zinc-400")} />
                  ) : (
                    <Brain className={cn("h-4 w-4", isSelected ? "text-purple-400" : "text-zinc-400")} />
                  )}
                </div>
                <div>
                  <p className={cn("text-sm font-semibold", isSelected ? "text-purple-200" : "text-zinc-200")}>
                    {model.name}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                    {model.provider}
                  </p>
                </div>
              </div>
              {isSelected && (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-500">
                  <Check className="h-3 w-3 text-white" />
                </div>
              )}
            </div>

            <p className="text-xs leading-relaxed text-zinc-500">
              {model.description}
            </p>

            <div className="mt-auto flex w-full items-center gap-4 border-t border-zinc-800/30 pt-3">
              <div className="flex items-center gap-1.5">
                <Zap className="h-3 w-3 text-amber-400/70" />
                <span className="text-[10px] text-zinc-600">Speed</span>
                <RatingDots value={model.speed} color="bg-amber-400" />
              </div>
              <div className="flex items-center gap-1.5">
                <Brain className="h-3 w-3 text-blue-400/70" />
                <span className="text-[10px] text-zinc-600">Intel</span>
                <RatingDots value={model.intelligence} color="bg-blue-400" />
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
