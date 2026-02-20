"use client";

import { LabCanvas } from "@/components/labs/lab-canvas";
import { LabConversation } from "@/components/labs/lab-conversation";
import { useBacktest } from "@/hooks/use-backtest";
import { useLabConversation } from "@/hooks/use-lab-conversation";
import { useSession } from "@/hooks/use-session";
import { useSubscription } from "@/hooks/use-subscription";
import type { LabTemplate } from "@/lib/types/labs";
import { FlaskConical, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

export default function StrategyLabsPage() {
    const router = useRouter();
    const { user } = useSession();
    const { data: subscription } = useSubscription();
    const {
        session,
        sendMessage,
        startFromTemplate,
        updateStrategy,
        updateBacktestState,
        setPhase,
        resetSession,
        retryLastMessage,
        clearError,
        templates,
        provider,
        model,
        setProvider,
        setModel,
        streamingStatus,
    } = useLabConversation();

    const { state: backtestState, runBacktest, reset: resetBacktest } = useBacktest();
    const [deployLoading, setDeployLoading] = useState(false);
    const [mobilePanel, setMobilePanel] = useState<"conversation" | "canvas">(
        "conversation"
    );

    // ── Template selection ───────────────────────────────────────────────
    const handleSelectTemplate = useCallback(
        (template: LabTemplate) => {
            const starterMsg = startFromTemplate(template);
            if (starterMsg) {
                // Small delay to allow state reset before sending
                setTimeout(() => sendMessage(starterMsg), 100);
            }
        },
        [startFromTemplate, sendMessage]
    );

    // ── Run backtest ────────────────────────────────────────────────────
    const handleRunBacktest = useCallback(async () => {
        if (!session.strategy) return;
        if (!session.strategy.strategyCode) {
            console.error("No strategy code available for backtest");
            return;
        }

        setPhase("backtesting");

        const instruments = session.strategy.instruments.map((i) => ({
            instrument: i.instrument,
            timeframe: i.timeframe,
        }));

        const exitConfig = {
            stop_loss_pct: session.strategy.exitConfig.stop_loss_pct,
            take_profit_pct: session.strategy.exitConfig.take_profit_pct,
        };

        await runBacktest({
            config: {
                ...session.strategy.config,
                ...(session.strategy.strategyCode
                    ? { strategy_code: session.strategy.strategyCode }
                    : {}),
            },
            instruments,
            exit_config: exitConfig,
            period_start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
            period_end: new Date().toISOString(),
        });
    }, [session.strategy, runBacktest, setPhase]);

    // ── Deploy bot ─────────────────────────────────────────────────────
    const handleDeploy = useCallback(async () => {
        if (!session.strategy || !user) return;
        setDeployLoading(true);

        try {
            const strategy = session.strategy;
            const config = {
                ...strategy.config,
                ...(strategy.strategyCode
                    ? { strategy_code: strategy.strategyCode }
                    : {}),
            };

            const instruments = strategy.instruments.map((i) => ({
                instrument: i.instrument,
                timeframe: i.timeframe,
            }));

            const agentRes = await fetch("/api/agents", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: strategy.name,
                    description: strategy.description,
                    type: "bot",
                    config,
                    prompt: strategy.entryRules,
                    instrument: instruments[0]?.instrument ?? "EUR_USD",
                    instruments,
                    timeframe: instruments[0]?.timeframe ?? "H1",
                    status: "active",
                }),
            });
            const botData = await agentRes.json();
            if (!agentRes.ok) throw new Error(botData.error ?? "Deploy failed");
            const botId = botData.agent?.id ?? botData.id;

            if (
                backtestState.phase === "complete" &&
                backtestState.result
            ) {
                const bt = backtestState.result;
                const btRes = await fetch("/api/backtests", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        agent_id: botId,
                        config,
                        instruments,
                        exit_config: {
                            stop_loss_pct: strategy.exitConfig.stop_loss_pct,
                            take_profit_pct: strategy.exitConfig.take_profit_pct,
                        },
                        period_start: new Date(
                            Date.now() - 365 * 24 * 60 * 60 * 1000
                        ).toISOString(),
                        period_end: new Date().toISOString(),
                        status: "completed",
                        progress_pct: 100,
                        total_trades: bt.stats.total_trades,
                        total_return_pct: bt.stats.total_return_pct,
                        win_rate: bt.stats.win_rate,
                        max_drawdown: bt.stats.max_drawdown,
                        sharpe_ratio: bt.stats.sharpe_ratio,
                        profit_factor: bt.stats.profit_factor,
                        equity_curve: bt.equity_curve,
                    }),
                });
                const btData = await btRes.json();
                if (btRes.ok && bt.trades.length > 0) {
                    const backtestId = btData.backtest?.id ?? btData.id;
                    const tradeRecords = bt.trades.map((t) => ({
                        agent_id: botId,
                        backtest_id: backtestId,
                        instrument: t.instrument,
                        direction: t.direction,
                        entry_price: t.entry_price,
                        exit_price: t.exit_price,
                        return_pct: t.return_pct,
                        stop_loss_pct: t.stop_loss_pct,
                        take_profit_pct: t.take_profit_pct,
                        status: t.status,
                        opened_at: t.entry_time,
                        closed_at: t.exit_time,
                    }));
                    await fetch("/api/trades", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ trades: tradeRecords }),
                    });
                }
            }

            router.push(`/bots/${botId}`);
        } catch (err) {
            console.error("Deploy failed:", err);
            setDeployLoading(false);
        }
    }, [session.strategy, backtestState, router, user]);

    return (
        <div className="flex h-[calc(100vh-8rem)] flex-col">
            {/* Page header */}
            <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/20 to-emerald-500/20">
                        <FlaskConical className="h-5 w-5 text-purple-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-white">
                            Strategy Labs
                        </h1>
                        <p className="text-xs text-zinc-500">
                            Build, test, and deploy trading strategies with AI
                        </p>
                    </div>
                </div>

                {/* Mobile panel toggle */}
                <div className="flex items-center gap-1 lg:hidden">
                    <button
                        onClick={() => setMobilePanel("conversation")}
                        className={`rounded-lg p-2 text-xs transition-colors ${mobilePanel === "conversation"
                            ? "bg-purple-500/10 text-purple-400"
                            : "text-zinc-500 hover:text-zinc-300"
                            }`}
                    >
                        <PanelLeftOpen className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => setMobilePanel("canvas")}
                        className={`rounded-lg p-2 text-xs transition-colors ${mobilePanel === "canvas"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "text-zinc-500 hover:text-zinc-300"
                            }`}
                    >
                        <PanelLeftClose className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Split panel */}
            <div className="flex flex-1 gap-4 overflow-hidden rounded-2xl border border-zinc-800/40 bg-zinc-950/40 backdrop-blur-sm">
                {/* Conversation panel */}
                <div
                    className={`flex-1 border-r border-zinc-800/40 ${mobilePanel === "canvas" ? "hidden lg:flex lg:flex-col" : "flex flex-col"
                        }`}
                >
                    <LabConversation
                        messages={session.messages}
                        templates={templates}
                        isStreaming={session.isStreaming}
                        streamingStatus={streamingStatus}
                        showTemplates={session.phase === "welcome"}
                        error={session.error}
                        onSendMessage={sendMessage}
                        onSelectTemplate={handleSelectTemplate}
                        onRetry={retryLastMessage}
                        onDismissError={clearError}
                        provider={provider}
                        model={model}
                        onProviderChange={setProvider}
                        onModelChange={setModel}
                    />
                </div>

                {/* Canvas panel */}
                <div
                    className={`flex-1 ${mobilePanel === "conversation"
                        ? "hidden lg:flex lg:flex-col"
                        : "flex flex-col"
                        }`}
                >
                    <LabCanvas
                        strategy={session.strategy}
                        phase={session.phase}
                        isStreaming={session.isStreaming}
                        backtestState={backtestState}
                        backtestResult={backtestState.result}
                        onRunBacktest={handleRunBacktest}
                        onDeploy={handleDeploy}
                        onResetSession={() => {
                            resetSession();
                            resetBacktest();
                        }}
                        deployLoading={deployLoading}
                        creditsRemaining={subscription?.creditsRemaining}
                    />
                </div>
            </div>
        </div>
    );
}
