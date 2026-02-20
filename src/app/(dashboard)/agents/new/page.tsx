"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ModelSelector } from "@/components/agents/model-selector";
import {
  TradingStyleSelector,
  type TradingStyle,
} from "@/components/agents/trading-style-selector";
import { DataSourceCards } from "@/components/agents/data-source-cards";
import { useSession } from "@/hooks/use-session";
import { useSubscription } from "@/hooks/use-subscription";
import {
  CREDIT_COSTS,
  formatCredits,
  isUnlimited,
} from "@/lib/stripe/plans";
import {
  INSTRUMENT_GROUPS as FALLBACK_GROUPS,
  type InstrumentGroup,
} from "@/lib/oanda-instruments";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Brain,
  Check,
  ChevronDown,
  ChevronRight,
  Loader2,
  Lock,
  Rocket,
  Search,
  Shield,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X,
  DollarSign,
  Activity,
  Zap,
  Scale,
  Flame,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type WizardStep = "brain" | "intelligence" | "risk";

const STEPS: { key: WizardStep; label: string; icon: typeof Brain }[] = [
  { key: "brain", label: "Agent Brain", icon: Brain },
  { key: "intelligence", label: "Market Intelligence", icon: Zap },
  { key: "risk", label: "Risk & Deploy", icon: Shield },
];

interface ExitConfig {
  stop_loss_pct: string;
  take_profit_pct: string;
  trailing_stop: boolean;
  trailing_stop_pct: string;
  max_daily_loss_pct: string;
  daily_profit_target_pct: string;
  market_conditions: string;
}

const SCHEDULE_OPTIONS = [
  { id: "every_tick", label: "Every tick" },
  { id: "5m", label: "5 min" },
  { id: "15m", label: "15 min" },
  { id: "30m", label: "30 min" },
  { id: "hourly", label: "Hourly" },
  { id: "4h", label: "4 hours" },
  { id: "daily", label: "Daily" },
];

const STRATEGY_TEMPLATES = [
  {
    id: "trend",
    label: "Trend Follower",
    prompt:
      "Follow the dominant trend on the daily timeframe. Enter on pullbacks to key moving averages (20/50 EMA) when momentum aligns. Only trade in the direction of the higher timeframe trend. Exit when trend structure breaks.",
  },
  {
    id: "reversion",
    label: "Mean Reversion",
    prompt:
      "Look for overextended moves using RSI and Bollinger Bands. Enter counter-trend when RSI hits extreme levels (below 25 or above 75) and price touches the outer Bollinger Band. Target a return to the mean (20-period SMA).",
  },
  {
    id: "news",
    label: "News Reactive",
    prompt:
      "Monitor financial news and economic calendar for high-impact events. Analyze sentiment shifts and position before or after major releases. Prioritize clear directional catalysts over technical setups.",
  },
  {
    id: "multi_tf",
    label: "Multi-Timeframe",
    prompt:
      "Use a top-down approach: identify the trend on D1, find setups on H4, and time entries on H1. All three timeframes must align before entering. Use the higher timeframe structure for stop placement.",
  },
  {
    id: "free",
    label: "Free Running",
    prompt: "",
  },
];

interface GeneratedAgent {
  agent_type: string;
  name: string;
  description: string;
  portfolio_summary: string;
  config: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function NewAgentPage() {
  const router = useRouter();
  const { user } = useSession();
  const { data: subscription, plan, loading: subLoading } = useSubscription();

  // Wizard state
  const [step, setStep] = useState<WizardStep>("brain");
  const stepIndex = STEPS.findIndex((s) => s.key === step);

  // Instruments from Oanda API
  const [instrumentGroups, setInstrumentGroups] =
    useState<InstrumentGroup[]>(FALLBACK_GROUPS);
  const [loadingInstruments, setLoadingInstruments] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchInstruments() {
      try {
        const res = await fetch("/api/instruments");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        if (!cancelled && Array.isArray(data.groups) && data.groups.length > 0) {
          setInstrumentGroups(data.groups);
        }
      } catch {
        /* keep fallback */
      } finally {
        if (!cancelled) setLoadingInstruments(false);
      }
    }
    fetchInstruments();
    return () => {
      cancelled = true;
    };
  }, []);

  // Phase 1: Agent Brain
  const [agentName, setAgentName] = useState("");
  const [llmProvider, setLlmProvider] = useState("openai");
  const [llmModel, setLlmModel] = useState("gpt-4o-mini");
  const [tradingStyle, setTradingStyle] = useState<TradingStyle>("balanced");
  const [selectedInstruments, setSelectedInstruments] = useState<Set<string>>(
    new Set()
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(["forex_major"])
  );

  // Phase 2: Market Intelligence
  const [dataProviders, setDataProviders] = useState<Set<string>>(
    new Set(["technical_analysis"])
  );
  const [evaluationSchedule, setEvaluationSchedule] = useState("hourly");
  const [strategyPrompt, setStrategyPrompt] = useState("");

  // Phase 3: Risk & Deploy
  const [exitConfig, setExitConfig] = useState<ExitConfig>({
    stop_loss_pct: "",
    take_profit_pct: "",
    trailing_stop: false,
    trailing_stop_pct: "",
    max_daily_loss_pct: "",
    daily_profit_target_pct: "",
    market_conditions: "",
  });

  // Generation / Deploy
  const [generating, setGenerating] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [generated, setGenerated] = useState<GeneratedAgent | null>(null);
  const [error, setError] = useState("");

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  function toggleInstrument(id: string) {
    setSelectedInstruments((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function removeInstrument(id: string) {
    setSelectedInstruments((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  function toggleGroup(type: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  function toggleDataProvider(id: string) {
    setDataProviders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function updateExit(field: keyof ExitConfig, value: string | boolean) {
    setExitConfig((prev) => ({ ...prev, [field]: value }));
  }

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return instrumentGroups;
    const q = searchQuery.toLowerCase();
    return instrumentGroups
      .map((g) => ({
        ...g,
        instruments: g.instruments.filter(
          (i) =>
            i.id.toLowerCase().includes(q) || i.name.toLowerCase().includes(q)
        ),
      }))
      .filter((g) => g.instruments.length > 0);
  }, [searchQuery, instrumentGroups]);

  function buildPrompt(): string {
    const instrumentsArr = Array.from(selectedInstruments);
    const instrumentsStr = instrumentsArr
      .map((id) => id.replace("_", "/"))
      .join(", ");

    let prompt = `Trading instruments: ${instrumentsStr}\n\n`;
    prompt += `Agent type: agent\n`;
    prompt += `LLM: ${llmProvider} / ${llmModel}\n`;
    prompt += `Trading style: ${tradingStyle}\n\n`;
    prompt += `Data providers: ${Array.from(dataProviders).join(", ")}\n`;
    prompt += `Evaluation schedule: ${evaluationSchedule}\n`;
    prompt += `Analysis logic:\n${strategyPrompt}\n\n`;

    prompt += "Exit strategy:\n";
    if (exitConfig.stop_loss_pct)
      prompt += `- Stop loss: ${exitConfig.stop_loss_pct}%\n`;
    if (exitConfig.take_profit_pct)
      prompt += `- Take profit: ${exitConfig.take_profit_pct}%\n`;
    if (exitConfig.trailing_stop && exitConfig.trailing_stop_pct)
      prompt += `- Trailing stop: ${exitConfig.trailing_stop_pct}%\n`;
    if (exitConfig.max_daily_loss_pct)
      prompt += `- Max daily loss: ${exitConfig.max_daily_loss_pct}%\n`;
    if (exitConfig.daily_profit_target_pct)
      prompt += `- Daily profit target: ${exitConfig.daily_profit_target_pct}%\n`;
    if (exitConfig.market_conditions.trim())
      prompt += `- Market conditions: ${exitConfig.market_conditions}\n`;

    return prompt;
  }

  async function handleGenerate() {
    setError("");
    setGenerating(true);

    try {
      const res = await fetch("/api/generate-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: buildPrompt() }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Generation failed");
      }

      const data: GeneratedAgent = await res.json();
      setGenerated(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setGenerating(false);
    }
  }

  async function handleDeploy() {
    if (!generated || !user) return;
    setError("");
    setDeploying(true);

    try {
      const config = {
        ...generated.config,
        personality: tradingStyle,
        llm_provider: llmProvider,
        llm_model: llmModel,
      };
      const instrumentsArr = Array.from(selectedInstruments);
      const primaryInstrument = instrumentsArr[0] ?? "EUR_USD";

      const portfolio = (config as Record<string, unknown>).portfolio as
        | Record<string, unknown>
        | undefined;
      const configInstruments = (portfolio?.instruments ?? []) as Array<
        Record<string, unknown>
      >;
      const primaryTimeframe =
        (configInstruments[0]?.timeframe as string) ?? "H1";

      const uniqueInstruments = instrumentsArr.map((id) => {
        const match = configInstruments.find(
          (ci) => ci.instrument === id
        );
        return {
          instrument: id,
          timeframe: (match?.timeframe as string) ?? "H1",
        };
      });

      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: agentName || generated.name,
          description: generated.description,
          type: "agent",
          config,
          prompt: buildPrompt(),
          instrument: primaryInstrument,
          instruments: uniqueInstruments,
          timeframe: primaryTimeframe,
          llm_provider: llmProvider,
          llm_model: llmModel,
          evaluation_schedule: evaluationSchedule,
          status: "active",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Deploy failed");
      router.push(`/agents/${data.agent?.id ?? data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deploy failed");
      setDeploying(false);
    }
  }

  // Validation
  const canProceedFromBrain =
    selectedInstruments.size > 0;
  const canProceedFromIntelligence =
    strategyPrompt.trim().length > 0 || STRATEGY_TEMPLATES.find((t) => t.id === "free" && strategyPrompt === "");
  const canProceedFromRisk =
    exitConfig.stop_loss_pct !== "" || exitConfig.take_profit_pct !== "";

  const generatedExitConfig = generated?.config?.exit as
    | Record<string, number>
    | undefined;

  // Plan limit checks
  const atAgentLimit =
    subscription &&
    !isUnlimited(plan.limits.maxAgents) &&
    subscription.agentCount >= plan.limits.maxAgents;
  const noCredits =
    subscription && subscription.creditsRemaining < CREDIT_COSTS.agentGeneration;
  const agentBlocked = !plan.limits.aiAgents;

  const styleIcons: Record<TradingStyle, typeof Shield> = {
    conservative: Shield,
    balanced: Scale,
    aggressive: Flame,
  };
  const StyleIcon = styleIcons[tradingStyle];

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      {/* Plan limit banners */}
      {agentBlocked && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-amber-400" />
            <p className="text-sm font-medium text-amber-400">
              Agents require a Starter plan or higher.{" "}
              <Link href="/pricing" className="underline hover:text-amber-300">
                Upgrade your plan
              </Link>
            </p>
          </div>
        </div>
      )}

      {subscription && atAgentLimit && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-red-400" />
            <p className="text-sm font-medium text-red-400">
              Agent limit reached ({subscription.agentCount}/
              {plan.limits.maxAgents}).{" "}
              <Link href="/pricing" className="underline hover:text-red-300">
                Upgrade your plan
              </Link>{" "}
              to create more.
            </p>
          </div>
        </div>
      )}

      {subscription && noCredits && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <p className="text-sm font-medium text-amber-400">
              Low credits ({subscription.creditsRemaining} remaining,{" "}
              {CREDIT_COSTS.agentGeneration} needed).{" "}
              <Link href="/pricing" className="underline hover:text-amber-300">
                Upgrade
              </Link>{" "}
              for more credits.
            </p>
          </div>
        </div>
      )}

      {/* Credits indicator */}
      {subscription && !subLoading && (
        <div className="flex items-center justify-end gap-3">
          <div className="flex items-center gap-1.5 rounded-lg border border-zinc-800/60 bg-zinc-900/30 px-3 py-1.5">
            <Sparkles className="h-3.5 w-3.5 text-purple-400" />
            <span className="text-xs text-zinc-400">
              {formatCredits(subscription.creditsRemaining)} credits
            </span>
          </div>
        </div>
      )}

      {/* Step indicator */}
      <div className="flex items-center gap-1 rounded-xl border border-zinc-800/60 bg-zinc-900/20 p-1">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = step === s.key;
          const isCompleted = i < stepIndex;
          return (
            <button
              key={s.key}
              onClick={() => {
                if (i < stepIndex) setStep(s.key);
              }}
              disabled={i > stepIndex}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium transition-all ${
                isActive
                  ? "bg-purple-500/15 text-purple-300"
                  : isCompleted
                    ? "text-zinc-400 hover:bg-zinc-800/40 cursor-pointer"
                    : "text-zinc-600 cursor-not-allowed"
              }`}
            >
              {isCompleted ? (
                <Check className="h-3.5 w-3.5 text-purple-400" />
              ) : (
                <Icon className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">{s.label}</span>
            </button>
          );
        })}
      </div>

      {/* ================================================================== */}
      {/* PHASE 1: AGENT BRAIN                                               */}
      {/* ================================================================== */}
      {step === "brain" && (
        <div className="space-y-6">
          <div>
            <h1 className="text-xl font-semibold text-zinc-100">
              Configure Your Agent&apos;s Brain
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Choose the AI model, trading personality, and instruments for your
              agent.
            </p>
          </div>

          {/* Agent name */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Agent Name
              <span className="ml-1 text-zinc-700">(optional)</span>
            </label>
            <input
              type="text"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              placeholder="Auto-generated if left empty"
              className="w-full rounded-xl border border-zinc-800/60 bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 transition-all focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            />
          </div>

          {/* LLM Model */}
          <div>
            <label className="mb-3 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
              AI Model
            </label>
            <ModelSelector
              selectedProvider={llmProvider}
              selectedModel={llmModel}
              onSelect={(provider, model) => {
                setLlmProvider(provider);
                setLlmModel(model);
              }}
            />
          </div>

          {/* Trading Style */}
          <div>
            <label className="mb-3 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Trading Style
            </label>
            <TradingStyleSelector
              selected={tradingStyle}
              onSelect={setTradingStyle}
            />
          </div>

          {/* Instruments */}
          <div>
            <label className="mb-3 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Trading Instruments
            </label>

            {selectedInstruments.size > 0 && (
              <div className="mb-3 rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                    Selected ({selectedInstruments.size})
                  </span>
                  <button
                    onClick={() => setSelectedInstruments(new Set())}
                    className="text-[10px] text-zinc-600 hover:text-red-400 transition-colors"
                  >
                    Clear all
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {Array.from(selectedInstruments).map((id) => (
                    <div
                      key={id}
                      className="flex items-center gap-1 rounded-lg border border-purple-500/30 bg-purple-500/5 px-2 py-1"
                    >
                      <span className="text-[11px] font-semibold text-purple-300">
                        {id.replace("_", "/")}
                      </span>
                      <button
                        onClick={() => removeInstrument(id)}
                        className="text-zinc-500 hover:text-red-400 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search instruments... (e.g. Gold, EUR, Nasdaq)"
                className="w-full rounded-xl border border-zinc-800/60 bg-zinc-900/50 py-2.5 pl-10 pr-4 text-sm text-zinc-100 placeholder:text-zinc-600 transition-all focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              />
            </div>

            {loadingInstruments && (
              <div className="flex items-center gap-2 rounded-xl border border-zinc-800/60 bg-zinc-900/30 px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
                <span className="text-sm text-zinc-400">
                  Loading instruments from Oanda...
                </span>
              </div>
            )}

            <div className="space-y-2">
              {filteredGroups.map((group) => {
                const isExpanded =
                  expandedGroups.has(group.type) || searchQuery.trim() !== "";
                const selectedCount = group.instruments.filter((i) =>
                  selectedInstruments.has(i.id)
                ).length;

                return (
                  <div
                    key={group.type}
                    className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 overflow-hidden"
                  >
                    <button
                      onClick={() => toggleGroup(group.type)}
                      className="flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-zinc-800/30"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-zinc-200">
                          {group.label}
                        </span>
                        <span className="text-[10px] text-zinc-600">
                          {group.instruments.length}
                        </span>
                        {selectedCount > 0 && (
                          <Badge variant="success">{selectedCount}</Badge>
                        )}
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-zinc-500" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-zinc-500" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="border-t border-zinc-800/40 px-4 py-2.5">
                        <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 md:grid-cols-4">
                          {group.instruments.map((inst) => {
                            const isSelected = selectedInstruments.has(inst.id);
                            return (
                              <button
                                key={inst.id}
                                onClick={() => toggleInstrument(inst.id)}
                                className={`group flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition-all ${
                                  isSelected
                                    ? "border border-purple-500/40 bg-purple-500/10"
                                    : "border border-transparent hover:border-zinc-700/60 hover:bg-zinc-800/40"
                                }`}
                              >
                                <div
                                  className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition-colors ${
                                    isSelected
                                      ? "border-purple-500 bg-purple-500"
                                      : "border-zinc-600 group-hover:border-zinc-500"
                                  }`}
                                >
                                  {isSelected && (
                                    <Check className="h-2 w-2 text-white" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p
                                    className={`text-[11px] font-semibold ${isSelected ? "text-purple-300" : "text-zinc-300"}`}
                                  >
                                    {inst.id.replace("_", "/")}
                                  </p>
                                  <p className="truncate text-[9px] text-zinc-600">
                                    {inst.name}
                                  </p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={() => setStep("intelligence")}
              disabled={!canProceedFromBrain || agentBlocked}
            >
              Market Intelligence
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* PHASE 2: MARKET INTELLIGENCE                                       */}
      {/* ================================================================== */}
      {step === "intelligence" && (
        <div className="space-y-6">
          <div>
            <h1 className="text-xl font-semibold text-zinc-100">
              Market Intelligence
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Configure the data your agent sees and describe how it should think
              about the market.
            </p>
          </div>

          {/* Data Sources */}
          <div>
            <label className="mb-3 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Data Sources
            </label>
            <DataSourceCards
              selected={dataProviders}
              onToggle={toggleDataProvider}
            />
          </div>

          {/* Evaluation Schedule */}
          <div>
            <label className="mb-3 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Evaluation Schedule
            </label>
            <p className="mb-3 text-xs text-zinc-500">
              How often the agent evaluates the market and makes decisions.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SCHEDULE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setEvaluationSchedule(opt.id)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                    evaluationSchedule === opt.id
                      ? "border-purple-500/40 bg-purple-500/10 text-purple-300"
                      : "border-zinc-800/40 text-zinc-400 hover:border-zinc-700/60"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Strategy Prompt */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Strategy Logic
            </label>
            <p className="mb-3 text-xs text-zinc-500">
              Describe how your agent should analyze and trade. Be as specific or
              as open as you want — the agent will reason within these guidelines.
            </p>

            {/* Quick-start templates */}
            <div className="mb-3 flex flex-wrap gap-1.5">
              {STRATEGY_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => setStrategyPrompt(tpl.prompt)}
                  className={`rounded-full border px-3 py-1 text-[11px] font-medium transition-colors ${
                    strategyPrompt === tpl.prompt && tpl.prompt !== ""
                      ? "border-purple-500/30 bg-purple-500/10 text-purple-300"
                      : "border-zinc-800 text-zinc-500 hover:border-purple-800 hover:text-purple-400"
                  }`}
                >
                  {tpl.label}
                </button>
              ))}
            </div>

            <textarea
              value={strategyPrompt}
              onChange={(e) => setStrategyPrompt(e.target.value)}
              placeholder={
                dataProviders.has("news_sentiment")
                  ? "e.g. Monitor financial news for sentiment shifts. Combine with technical analysis for confirmation. Only enter trades when news sentiment and price action align..."
                  : "e.g. Check the D1 trend direction first, then look for H1 pullback setups. Enter when momentum confirms the pullback is complete..."
              }
              rows={5}
              className="w-full rounded-xl border border-zinc-800/60 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 transition-all focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setStep("brain")}>
              <ArrowLeft className="h-4 w-4" />
              Agent Brain
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                setGenerated(null);
                setStep("risk");
              }}
              disabled={!canProceedFromIntelligence}
            >
              Risk & Deploy
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* PHASE 3: RISK & DEPLOY                                             */}
      {/* ================================================================== */}
      {step === "risk" && (
        <div className="space-y-6">
          <div>
            <h1 className="text-xl font-semibold text-zinc-100">
              Risk Management & Deploy
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Configure exit rules and review your agent before deploying.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            {/* Left: Risk Controls */}
            <div className="space-y-4 lg:col-span-3">
              <Card className="!p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-purple-400" />
                  <span className="text-sm font-semibold text-zinc-200">
                    Static Levels
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                      Stop Loss (%)
                    </label>
                    <div className="relative">
                      <TrendingDown className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-red-400/60" />
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={exitConfig.stop_loss_pct}
                        onChange={(e) =>
                          updateExit("stop_loss_pct", e.target.value)
                        }
                        placeholder="e.g. 2.0"
                        className="w-full rounded-lg border border-zinc-800/60 bg-zinc-900/50 py-2.5 pl-10 pr-4 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-red-500/50 focus:outline-none focus:ring-1 focus:ring-red-500/20"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                      Take Profit (%)
                    </label>
                    <div className="relative">
                      <TrendingUp className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400/60" />
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={exitConfig.take_profit_pct}
                        onChange={(e) =>
                          updateExit("take_profit_pct", e.target.value)
                        }
                        placeholder="e.g. 4.0"
                        className="w-full rounded-lg border border-zinc-800/60 bg-zinc-900/50 py-2.5 pl-10 pr-4 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 border-t border-zinc-800/40 pt-4">
                  <label className="flex cursor-pointer items-center gap-3">
                    <div
                      className={`relative h-5 w-9 rounded-full transition-colors ${exitConfig.trailing_stop ? "bg-purple-500" : "bg-zinc-700"}`}
                      onClick={() =>
                        updateExit("trailing_stop", !exitConfig.trailing_stop)
                      }
                    >
                      <div
                        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${exitConfig.trailing_stop ? "translate-x-4" : "translate-x-0.5"}`}
                      />
                    </div>
                    <span className="text-xs font-medium text-zinc-300">
                      Trailing Stop
                    </span>
                  </label>
                  {exitConfig.trailing_stop && (
                    <div className="mt-3 max-w-xs">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={exitConfig.trailing_stop_pct}
                        onChange={(e) =>
                          updateExit("trailing_stop_pct", e.target.value)
                        }
                        placeholder="Trail distance (%)"
                        className="w-full rounded-lg border border-zinc-800/60 bg-zinc-900/50 px-4 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-500/20"
                      />
                    </div>
                  )}
                </div>
              </Card>

              <Card className="!p-5">
                <div className="mb-4 flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-amber-400" />
                  <span className="text-sm font-semibold text-zinc-200">
                    PnL-Based Limits
                  </span>
                  <span className="text-xs text-zinc-600">(optional)</span>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                      Max Daily Loss (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={exitConfig.max_daily_loss_pct}
                      onChange={(e) =>
                        updateExit("max_daily_loss_pct", e.target.value)
                      }
                      placeholder="e.g. 5.0"
                      className="w-full rounded-lg border border-zinc-800/60 bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/20"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                      Daily Profit Target (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={exitConfig.daily_profit_target_pct}
                      onChange={(e) =>
                        updateExit("daily_profit_target_pct", e.target.value)
                      }
                      placeholder="e.g. 3.0"
                      className="w-full rounded-lg border border-zinc-800/60 bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/20"
                    />
                  </div>
                </div>
              </Card>

              <Card className="!p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-blue-400" />
                  <span className="text-sm font-semibold text-zinc-200">
                    Market Conditions
                  </span>
                  <span className="text-xs text-zinc-600">(optional)</span>
                </div>
                <textarea
                  value={exitConfig.market_conditions}
                  onChange={(e) =>
                    updateExit("market_conditions", e.target.value)
                  }
                  placeholder="e.g. Close all positions if VIX spikes above 30, close if trend reversal on H4..."
                  rows={3}
                  className="w-full rounded-lg border border-zinc-800/60 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
                />
              </Card>
            </div>

            {/* Right: Preview card */}
            <div className="lg:col-span-2">
              <div className="sticky top-6 space-y-4">
                <Card className="!p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <Brain className="h-4 w-4 text-purple-400" />
                    <span className="text-sm font-semibold text-zinc-200">
                      Agent Preview
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                        Name
                      </p>
                      <p className="text-sm text-zinc-300">
                        {agentName || "Auto-generated"}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                        Model
                      </p>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <Sparkles className="h-3 w-3 text-purple-400" />
                        <span className="text-xs text-zinc-300">{llmModel}</span>
                        <span className="text-[10px] text-zinc-600">
                          ({llmProvider})
                        </span>
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                        Style
                      </p>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <StyleIcon className="h-3 w-3 text-zinc-400" />
                        <span className="text-xs capitalize text-zinc-300">
                          {tradingStyle}
                        </span>
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                        Instruments ({selectedInstruments.size})
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {Array.from(selectedInstruments)
                          .slice(0, 6)
                          .map((id) => (
                            <span
                              key={id}
                              className="rounded bg-zinc-800/60 px-1.5 py-0.5 text-[10px] text-zinc-400"
                            >
                              {id.replace("_", "/")}
                            </span>
                          ))}
                        {selectedInstruments.size > 6 && (
                          <span className="rounded bg-zinc-800/60 px-1.5 py-0.5 text-[10px] text-zinc-500">
                            +{selectedInstruments.size - 6} more
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                        Data Sources ({dataProviders.size})
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {Array.from(dataProviders).map((dp) => (
                          <span
                            key={dp}
                            className="rounded bg-zinc-800/60 px-1.5 py-0.5 text-[10px] text-zinc-400"
                          >
                            {dp.replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                        Schedule
                      </p>
                      <span className="text-xs text-zinc-300">
                        {SCHEDULE_OPTIONS.find(
                          (s) => s.id === evaluationSchedule
                        )?.label ?? evaluationSchedule}
                      </span>
                    </div>

                    {(exitConfig.stop_loss_pct || exitConfig.take_profit_pct) && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                          Risk
                        </p>
                        <div className="mt-0.5 flex items-center gap-2 text-xs">
                          {exitConfig.stop_loss_pct && (
                            <span className="flex items-center gap-1">
                              <TrendingDown className="h-3 w-3 text-red-400/70" />
                              SL: {exitConfig.stop_loss_pct}%
                            </span>
                          )}
                          {exitConfig.take_profit_pct && (
                            <span className="flex items-center gap-1">
                              <TrendingUp className="h-3 w-3 text-emerald-400/70" />
                              TP: {exitConfig.take_profit_pct}%
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Generate / Deploy section */}
                {!generated ? (
                  <div className="space-y-3">
                    {error && (
                      <p className="text-sm text-red-400">{error}</p>
                    )}
                    <Button
                      onClick={handleGenerate}
                      loading={generating}
                      disabled={
                        !canProceedFromRisk ||
                        !!atAgentLimit ||
                        !!noCredits ||
                        agentBlocked
                      }
                      className="w-full"
                      size="lg"
                    >
                      {generating ? (
                        "Generating agent..."
                      ) : atAgentLimit ? (
                        <>
                          <Lock className="h-4 w-4" />
                          Limit Reached
                        </>
                      ) : noCredits ? (
                        <>
                          <AlertTriangle className="h-4 w-4" />
                          Insufficient Credits
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          Generate Agent ({CREDIT_COSTS.agentGeneration} credits)
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Card className="!p-4">
                      <div className="flex items-center gap-2">
                        <Brain className="h-5 w-5 text-purple-400" />
                        <div>
                          <p className="text-sm font-semibold text-zinc-100">
                            {generated.name}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {generated.description}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-2">
                          <p className="text-[10px] text-zinc-600">Exit</p>
                          <p className="text-xs text-zinc-300">
                            SL: {generatedExitConfig?.stop_loss_pct ?? "—"}% / TP:{" "}
                            {generatedExitConfig?.take_profit_pct ?? "—"}%
                          </p>
                        </div>
                        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-2">
                          <p className="text-[10px] text-zinc-600">Portfolio</p>
                          <p className="text-xs text-zinc-300">
                            {generated.portfolio_summary ||
                              `${selectedInstruments.size} instrument${selectedInstruments.size > 1 ? "s" : ""}`}
                          </p>
                        </div>
                      </div>

                      <details className="mt-3 rounded-lg border border-zinc-800/40 bg-zinc-900/30">
                        <summary className="cursor-pointer px-3 py-2 text-[10px] font-medium text-zinc-600 hover:text-zinc-400">
                          View raw config
                        </summary>
                        <pre className="max-h-32 overflow-auto px-3 pb-2 text-[10px] text-zinc-500">
                          {JSON.stringify(generated.config, null, 2)}
                        </pre>
                      </details>
                    </Card>

                    <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-3">
                      <p className="text-[11px] text-purple-400">
                        Agents use AI to analyze market conditions and make
                        trading decisions. They run on a schedule and cannot be
                        backtested. No real money is involved.
                      </p>
                    </div>

                    {error && (
                      <p className="text-sm text-red-400">{error}</p>
                    )}

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setGenerated(null);
                          setError("");
                        }}
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Regenerate
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={handleDeploy}
                        loading={deploying}
                        size="lg"
                      >
                        <Rocket className="h-4 w-4" />
                        Deploy Agent
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {!generated && (
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("intelligence")}>
                <ArrowLeft className="h-4 w-4" />
                Market Intelligence
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
