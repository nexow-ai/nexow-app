"use client";

import { Card } from "@/components/ui/card";
import type { LabStrategy } from "@/lib/types/labs";
import {
    Bot,
    Brain,
    Check,
    ChevronDown,
    ChevronUp,
    Code2,
    Copy,
    Shield,
    ShieldCheck,
    Target,
    TrendingDown,
    TrendingUp,
} from "lucide-react";
import { useCallback, useState } from "react";

interface StrategyCardProps {
    strategy: LabStrategy;
}

function ProgressRing({
    value,
    size = 32,
    strokeWidth = 3,
}: {
    value: number;
    size?: number;
    strokeWidth?: number;
}) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (value / 100) * circumference;

    const color =
        value >= 80 ? "#34d399" : value >= 50 ? "#fbbf24" : "#52525b";

    return (
        <svg width={size} height={size} className="shrink-0 -rotate-90">
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="rgba(63,63,70,0.3)"
                strokeWidth={strokeWidth}
            />
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
            />
            <text
                x={size / 2}
                y={size / 2}
                textAnchor="middle"
                dominantBaseline="central"
                className="rotate-90 origin-center fill-zinc-400 text-[9px] font-medium"
            >
                {value}%
            </text>
        </svg>
    );
}

export function StrategyCard({ strategy }: StrategyCardProps) {
    const [showCode, setShowCode] = useState(false);
    const [codeCopied, setCodeCopied] = useState(false);

    const handleCopyCode = useCallback(() => {
        navigator.clipboard.writeText(strategy.strategyCode);
        setCodeCopied(true);
        setTimeout(() => setCodeCopied(false), 2000);
    }, [strategy.strategyCode]);

    return (
        <Card className="overflow-hidden animate-slide-up">
            {/* Gradient accent bar */}
            <div className="h-1 bg-gradient-to-r from-purple-500 via-emerald-500 to-cyan-500" />

            <div className="p-5 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
                            {strategy.type === "bot" ? (
                                <Bot className="h-5 w-5" />
                            ) : (
                                <Brain className="h-5 w-5" />
                            )}
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-zinc-50">
                                {strategy.name || "Untitled Strategy"}
                            </h3>
                            <p className="text-xs text-zinc-500">
                                {strategy.type === "bot"
                                    ? "Rule-Based Bot"
                                    : "AI Agent"}
                            </p>
                        </div>
                    </div>
                    <ProgressRing value={strategy.completeness} />
                </div>

                {/* Description */}
                {strategy.description && (
                    <p className="text-xs leading-relaxed text-zinc-400">
                        {strategy.description}
                    </p>
                )}

                {/* Details grid */}
                <div className="grid grid-cols-1 gap-3 text-xs">
                    {strategy.instruments.length > 0 && (
                        <div className="flex items-start gap-2">
                            <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-500" />
                            <div>
                                <span className="text-zinc-500">Assets: </span>
                                <span className="text-zinc-200">
                                    {strategy.instruments
                                        .map(
                                            (i) =>
                                                `${i.instrument.replace("_", "/")} (${i.timeframe})`
                                        )
                                        .join(", ")}
                                </span>
                            </div>
                        </div>
                    )}

                    {strategy.entryRules && (
                        <div className="flex items-start gap-2">
                            <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400/60" />
                            <div>
                                <span className="text-zinc-500">Entry: </span>
                                <span className="text-zinc-200">
                                    {strategy.entryRules}
                                </span>
                            </div>
                        </div>
                    )}

                    {(strategy.exitConfig.stop_loss_pct ||
                        strategy.exitConfig.take_profit_pct) && (
                        <div className="flex items-start gap-2">
                            <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-purple-400/60" />
                            <div className="flex items-center gap-3">
                                {strategy.exitConfig.stop_loss_pct && (
                                    <span className="flex items-center gap-1">
                                        <TrendingDown className="h-3 w-3 text-red-400/60" />
                                        <span className="text-red-400/80">
                                            SL{" "}
                                            {strategy.exitConfig.stop_loss_pct}%
                                        </span>
                                    </span>
                                )}
                                {strategy.exitConfig.take_profit_pct && (
                                    <span className="flex items-center gap-1">
                                        <TrendingUp className="h-3 w-3 text-emerald-400/60" />
                                        <span className="text-emerald-400/80">
                                            TP{" "}
                                            {
                                                strategy.exitConfig
                                                    .take_profit_pct
                                            }
                                            %
                                        </span>
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Validated badge */}
                {strategy.codeValidated && (
                    <div className="flex items-center gap-1.5 animate-fade-in">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-[11px] font-medium text-emerald-400">
                            Code tested in sandbox
                        </span>
                    </div>
                )}

                {/* Strategy code (collapsible) */}
                {strategy.strategyCode && (
                    <div>
                        <div className="flex items-center justify-between">
                            <button
                                onClick={() => setShowCode(!showCode)}
                                className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                            >
                                <Code2 className="h-3.5 w-3.5" />
                                Strategy Code
                                {showCode ? (
                                    <ChevronUp className="h-3 w-3" />
                                ) : (
                                    <ChevronDown className="h-3 w-3" />
                                )}
                            </button>
                            {showCode && (
                                <button
                                    onClick={handleCopyCode}
                                    className="flex items-center gap-1 rounded-md border border-zinc-800/60 px-2 py-1 text-[10px] text-zinc-500 transition-colors hover:border-zinc-700 hover:text-zinc-300"
                                >
                                    {codeCopied ? (
                                        <>
                                            <Check className="h-3 w-3 text-emerald-400" />
                                            <span className="text-emerald-400">
                                                Copied
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="h-3 w-3" />
                                            Copy
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                        {showCode && (
                            <pre className="mt-2 max-h-60 overflow-auto rounded-xl border border-zinc-800/60 bg-zinc-950/60 p-3 text-[11px] leading-relaxed text-emerald-300/80 font-mono animate-scale-in">
                                {strategy.strategyCode}
                            </pre>
                        )}
                    </div>
                )}
            </div>
        </Card>
    );
}
