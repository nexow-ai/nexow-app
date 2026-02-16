"use client";

import { BacktestPanel } from "@/components/backtest/backtest-panel";
import { StrategyCard } from "@/components/labs/strategy-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { BacktestResult, BacktestState } from "@/hooks/use-backtest";
import type { LabPhase, LabStrategy } from "@/lib/types/labs";
import {
    BarChart3,
    FlaskConical,
    Play,
    Rocket,
    RotateCcw,
    Sparkles,
} from "lucide-react";

interface LabCanvasProps {
    strategy: LabStrategy | null;
    phase: LabPhase;
    backtestState: BacktestState | null;
    backtestResult: BacktestResult | null;
    onRunBacktest: () => void;
    onDeploy: () => void;
    onResetSession: () => void;
    deployLoading: boolean;
    creditsRemaining?: number;
}

export function LabCanvas({
    strategy,
    phase,
    backtestState,
    backtestResult,
    onRunBacktest,
    onDeploy,
    onResetSession,
    deployLoading,
    creditsRemaining,
}: LabCanvasProps) {
    return (
        <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-800/40 px-5 py-3.5">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10">
                        <BarChart3 className="h-4 w-4 text-emerald-400" />
                    </div>
                    <h2 className="text-sm font-semibold text-zinc-100">
                        Strategy Canvas
                    </h2>
                </div>
                <div className="flex items-center gap-2">
                    {creditsRemaining !== undefined && (
                        <div className="flex items-center gap-1.5 rounded-lg border border-zinc-800/60 bg-zinc-900/30 px-2.5 py-1">
                            <Sparkles className="h-3 w-3 text-purple-400" />
                            <span className="text-[11px] text-zinc-500">
                                {creditsRemaining} credits
                            </span>
                        </div>
                    )}
                    <button
                        onClick={onResetSession}
                        className="flex items-center gap-1.5 rounded-lg border border-zinc-800/60 px-2.5 py-1 text-[11px] text-zinc-500 transition-colors hover:border-zinc-700 hover:text-zinc-300"
                    >
                        <RotateCcw className="h-3 w-3" />
                        Reset
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* Empty state */}
                {!strategy && (
                    <div className="flex h-full flex-col items-center justify-center text-center">
                        <div className="mb-5 rounded-2xl bg-gradient-to-br from-purple-500/10 to-emerald-500/10 p-6">
                            <FlaskConical className="h-10 w-10 text-purple-400/70" />
                        </div>
                        <h3 className="text-base font-semibold text-zinc-300">
                            No strategy yet
                        </h3>
                        <p className="mt-2 max-w-xs text-xs leading-relaxed text-zinc-600">
                            Describe your trading idea in the conversation panel and I&apos;ll
                            build your strategy here in real-time.
                        </p>
                    </div>
                )}

                {/* Strategy card */}
                {strategy && <StrategyCard strategy={strategy} />}

                {/* Backtest section */}
                {strategy && strategy.completeness >= 70 && strategy.strategyCode && (
                    <div className="space-y-3">
                        {/* Run backtest CTA — only if code passed dry-run */}
                        {(!backtestState || backtestState.phase === "idle") &&
                            !backtestResult && (
                                <Card className="flex flex-col items-center py-8">
                                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${strategy.codeValidated
                                            ? "bg-purple-500/10 text-purple-400"
                                            : "bg-amber-500/10 text-amber-400"
                                        }`}>
                                        {strategy.codeValidated ? (
                                            <Play className="h-6 w-6" />
                                        ) : (
                                            <FlaskConical className="h-6 w-6" />
                                        )}
                                    </div>
                                    <h4 className="mt-3 text-sm font-semibold text-zinc-200">
                                        {strategy.codeValidated
                                            ? "Ready to Backtest"
                                            : "Code Not Validated"}
                                    </h4>
                                    <p className="mt-1.5 max-w-xs text-center text-xs text-zinc-500">
                                        {strategy.codeValidated
                                            ? "Test your strategy against 1 year of historical market data."
                                            : "The strategy code could not be verified. Try refining your strategy in the chat."}
                                    </p>
                                    <Button
                                        onClick={onRunBacktest}
                                        size="sm"
                                        className="mt-4"
                                        disabled={!strategy.codeValidated}
                                    >
                                        <Play className="h-3.5 w-3.5" />
                                        Run Backtest
                                    </Button>
                                </Card>
                            )}

                        {/* Live backtest progress */}
                        {backtestState &&
                            backtestState.phase !== "idle" &&
                            backtestState.phase !== "complete" &&
                            backtestState.phase !== "error" && (
                                <BacktestPanel
                                    state={backtestState}
                                    onRunBacktest={onRunBacktest}
                                    onDeploy={onDeploy}
                                    onBack={() => { }}
                                    onCancel={() => { }}
                                    deployLoading={deployLoading}
                                />
                            )}

                        {/* Backtest results */}
                        {backtestState?.phase === "complete" && backtestState.result && (
                            <BacktestPanel
                                state={backtestState}
                                onRunBacktest={onRunBacktest}
                                onDeploy={onDeploy}
                                onBack={() => { }}
                                onCancel={() => { }}
                                deployLoading={deployLoading}
                            />
                        )}

                        {/* Backtest error */}
                        {backtestState?.phase === "error" && (
                            <BacktestPanel
                                state={backtestState}
                                onRunBacktest={onRunBacktest}
                                onDeploy={onDeploy}
                                onBack={() => { }}
                                onCancel={() => { }}
                                deployLoading={deployLoading}
                            />
                        )}
                    </div>
                )}

                {/* Deploy CTA - when strategy ready and backtest done */}
                {strategy &&
                    strategy.completeness >= 80 &&
                    backtestResult &&
                    !backtestState?.phase?.match(/fetching|simulating/) && (
                        <Card className="relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-purple-500/5" />
                            <div className="relative flex items-center justify-between p-5">
                                <div>
                                    <p className="text-sm font-medium text-zinc-200">
                                        {backtestResult.stats.total_return_pct >= 0
                                            ? "Strategy looks promising!"
                                            : "Consider refining before deploying."}
                                    </p>
                                    <p className="mt-1 text-[11px] text-zinc-600">
                                        Past performance does not guarantee future results.
                                    </p>
                                </div>
                                <Button onClick={onDeploy} loading={deployLoading} size="sm">
                                    <Rocket className="h-3.5 w-3.5" />
                                    Deploy
                                </Button>
                            </div>
                        </Card>
                    )}
            </div>
        </div>
    );
}
