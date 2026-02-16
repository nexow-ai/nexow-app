"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { useSubscription } from "@/hooks/use-subscription";
import { createClient } from "@/lib/supabase/client";
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
  Bot,
  Brain,
  Check,
  ChevronDown,
  ChevronRight,
  Globe,
  Loader2,
  Lock,
  Newspaper,
  Rocket,
  Search,
  Shield,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X,
  BarChart3,
  Activity,
  DollarSign,
  CalendarClock,
  Radio,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type WizardStep = "assets" | "entry" | "exit" | "review";

const STEPS: { key: WizardStep; label: string }[] = [
  { key: "assets", label: "Assets" },
  { key: "entry", label: "Data & Logic" },
  { key: "exit", label: "Exit" },
  { key: "review", label: "Review" },
];

interface ExitConfig {
  stop_loss_pct: string;
  take_profit_pct: string;
  trailing_stop: boolean;
  trailing_stop_pct: string;
  max_daily_loss_pct: string;
  daily_profit_target_pct: string;
  market_conditions: string;
  event_based: string;
}

const DATA_PROVIDERS = [
  { id: "technical_analysis", label: "Technical Analysis", icon: BarChart3 },
  { id: "news_sentiment", label: "News Sentiment", icon: Newspaper },
  { id: "economic_calendar", label: "Economic Calendar", icon: CalendarClock },
  { id: "web_search", label: "Web Search", icon: Globe },
  { id: "price_action", label: "Price Action", icon: Activity },
  { id: "order_flow", label: "Order Flow / COT", icon: Radio },
];

const ENTRY_EXAMPLES = [
  "Analyze macro sentiment and Gold correlation before entering USD pairs",
  "Read latest news and economic releases, trade only when sentiment is clear",
  "Combine technical levels with fundamental analysis for high-conviction trades",
  "Monitor multiple timeframes and enter only when all align in the same direction",
];

const SCHEDULE_OPTIONS = [
  { id: "every_tick", label: "Every tick" },
  { id: "5m", label: "Every 5 minutes" },
  { id: "15m", label: "Every 15 minutes" },
  { id: "30m", label: "Every 30 minutes" },
  { id: "hourly", label: "Hourly" },
  { id: "4h", label: "Every 4 hours" },
  { id: "daily", label: "Daily" },
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
  const { data: subscription, plan, loading: subLoading } = useSubscription();

  // Wizard state
  const [step, setStep] = useState<WizardStep>("assets");
  const stepIndex = STEPS.findIndex((s) => s.key === step);

  // Instruments from Oanda API (with hardcoded fallback)
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
        // Keep fallback data
      } finally {
        if (!cancelled) setLoadingInstruments(false);
      }
    }
    fetchInstruments();
    return () => { cancelled = true; };
  }, []);

  // Step 1: Assets
  const [selectedInstruments, setSelectedInstruments] = useState<Set<string>>(
    new Set()
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(["forex_major"])
  );

  // Step 2: Entry (agent-specific)
  const [entryDescription, setEntryDescription] = useState("");
  const [dataProviders, setDataProviders] = useState<Set<string>>(
    new Set(["technical_analysis"])
  );
  const [evaluationSchedule, setEvaluationSchedule] = useState("hourly");

  // Step 3: Exit
  const [exitConfig, setExitConfig] = useState<ExitConfig>({
    stop_loss_pct: "",
    take_profit_pct: "",
    trailing_stop: false,
    trailing_stop_pct: "",
    max_daily_loss_pct: "",
    daily_profit_target_pct: "",
    market_conditions: "",
    event_based: "",
  });

  // Step 4: Review / Deploy
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
    prompt += `Agent type: agent\n\n`;
    prompt += `Data providers: ${Array.from(dataProviders).join(", ")}\n`;
    prompt += `Evaluation schedule: ${evaluationSchedule}\n`;
    prompt += `Analysis logic:\n${entryDescription}\n\n`;

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
    if (exitConfig.event_based.trim())
      prompt += `- Event-based: ${exitConfig.event_based}\n`;

    return prompt;
  }

  async function handleGenerate() {
    setError("");
    setGenerating(true);

    try {
      const res = await fetch("/api/generate-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: buildPrompt(),
        }),
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
    if (!generated) return;
    setError("");
    setDeploying(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const config = { ...generated.config };
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

      const { data, error: insertError } = await (
        supabase.from as Function
      )("agents")
        .insert({
          creator_id: user.id,
          name: generated.name,
          description: generated.description,
          type: "agent",
          config,
          prompt: buildPrompt(),
          instrument: primaryInstrument,
          instruments: uniqueInstruments,
          timeframe: primaryTimeframe,
          llm_provider:
            (config as Record<string, unknown>).llm_provider ?? "openai",
          llm_model:
            (config as Record<string, unknown>).llm_model ?? "gpt-4o-mini",
          evaluation_schedule: evaluationSchedule,
          status: "active",
        })
        .select()
        .single();

      if (insertError) throw insertError;
      router.push(`/agents/${(data as { id: string }).id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deploy failed");
      setDeploying(false);
    }
  }

  // Validation
  const canProceedFromAssets = selectedInstruments.size > 0;
  const canProceedFromEntry = entryDescription.trim().length > 0;
  const canProceedFromExit =
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

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
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
              Agent limit reached ({subscription.agentCount}/{plan.limits.maxAgents}).{" "}
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
              Low credits ({subscription.creditsRemaining} remaining, {CREDIT_COSTS.agentGeneration} needed).{" "}
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
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <button
              onClick={() => {
                if (i < stepIndex) setStep(s.key);
              }}
              disabled={i > stepIndex}
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                step === s.key
                  ? "bg-purple-600 text-white"
                  : i < stepIndex
                    ? "bg-purple-900/50 text-purple-400 hover:bg-purple-900/70 cursor-pointer"
                    : "bg-zinc-800 text-zinc-500"
              }`}
            >
              {i < stepIndex ? <Check className="h-4 w-4" /> : i + 1}
            </button>
            <span
              className={`hidden text-xs font-medium sm:inline ${
                step === s.key ? "text-zinc-200" : "text-zinc-500"
              }`}
            >
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <div className="h-px w-6 bg-zinc-800 sm:w-12" />
            )}
          </div>
        ))}
      </div>

      {/* ================================================================== */}
      {/* STEP 1: ASSETS                                                     */}
      {/* ================================================================== */}
      {step === "assets" && (
        <div className="space-y-4">
          <div>
            <h1 className="text-xl font-semibold text-zinc-100">
              Select Trading Assets
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Choose the instruments your agent will monitor and trade.
            </p>
          </div>

          {selectedInstruments.size > 0 && (
            <Card className="!p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Selected ({selectedInstruments.size})
                </span>
                <button
                  onClick={() => setSelectedInstruments(new Set())}
                  className="text-xs text-zinc-500 hover:text-red-400 transition-colors"
                >
                  Clear all
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {Array.from(selectedInstruments).map((id) => (
                  <div
                    key={id}
                    className="flex items-center gap-1.5 rounded-lg border border-purple-500/30 bg-purple-500/5 px-2.5 py-1.5"
                  >
                    <span className="text-xs font-semibold text-purple-300">
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
            </Card>
          )}

          <div className="relative">
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
              <span className="text-sm text-zinc-400">Loading instruments from Oanda...</span>
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
                    className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-zinc-800/30"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-zinc-200">
                        {group.label}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {group.instruments.length} instruments
                      </span>
                      {selectedCount > 0 && (
                        <Badge variant="success">{selectedCount} selected</Badge>
                      )}
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-zinc-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-zinc-500" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="border-t border-zinc-800/40 px-4 py-3">
                      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4">
                        {group.instruments.map((inst) => {
                          const isSelected = selectedInstruments.has(inst.id);
                          return (
                            <button
                              key={inst.id}
                              onClick={() => toggleInstrument(inst.id)}
                              className={`group flex items-center gap-2 rounded-lg px-3 py-2 text-left transition-all ${
                                isSelected
                                  ? "border border-purple-500/40 bg-purple-500/10"
                                  : "border border-transparent hover:border-zinc-700/60 hover:bg-zinc-800/40"
                              }`}
                            >
                              <div
                                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                                  isSelected
                                    ? "border-purple-500 bg-purple-500"
                                    : "border-zinc-600 group-hover:border-zinc-500"
                                }`}
                              >
                                {isSelected && (
                                  <Check className="h-2.5 w-2.5 text-white" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p
                                  className={`text-xs font-semibold ${isSelected ? "text-purple-300" : "text-zinc-300"}`}
                                >
                                  {inst.id.replace("_", "/")}
                                </p>
                                <p className="truncate text-[10px] text-zinc-500">
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

          <div className="flex justify-end pt-2">
            <Button
              onClick={() => setStep("entry")}
              disabled={!canProceedFromAssets || agentBlocked}
            >
              Data & Logic
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* STEP 2: DATA FEEDS & ANALYSIS LOGIC                                */}
      {/* ================================================================== */}
      {step === "entry" && (
        <div className="space-y-5">
          <div>
            <h1 className="text-xl font-semibold text-zinc-100">
              Data Feeds & Analysis Logic
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Configure the data sources your agent will use and describe how it should analyze the market.
            </p>
          </div>

          {/* Data providers */}
          <Card className="!p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Data Providers
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {DATA_PROVIDERS.map((dp) => {
                const isActive = dataProviders.has(dp.id);
                const Icon = dp.icon;
                return (
                  <button
                    key={dp.id}
                    onClick={() => toggleDataProvider(dp.id)}
                    className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-all ${
                      isActive
                        ? "border-purple-500/30 bg-purple-500/5"
                        : "border-zinc-800/40 hover:border-zinc-700/60"
                    }`}
                  >
                    <div
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                        isActive
                          ? "border-purple-500 bg-purple-500"
                          : "border-zinc-600"
                      }`}
                    >
                      {isActive && (
                        <Check className="h-2.5 w-2.5 text-white" />
                      )}
                    </div>
                    <Icon
                      className={`h-3.5 w-3.5 ${isActive ? "text-purple-400" : "text-zinc-500"}`}
                    />
                    <span
                      className={`text-xs font-medium ${isActive ? "text-purple-300" : "text-zinc-400"}`}
                    >
                      {dp.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Evaluation schedule */}
          <Card className="!p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Evaluation Schedule
            </p>
            <p className="mb-3 text-xs text-zinc-500">
              How often the agent will evaluate the market and decide on trades.
            </p>
            <div className="flex flex-wrap gap-2">
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
          </Card>

          {/* Analysis logic */}
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">
              Describe the analysis logic
            </label>
            <textarea
              value={entryDescription}
              onChange={(e) => setEntryDescription(e.target.value)}
              placeholder="e.g. Check the D1 trend direction first, then look for H1 setups. Analyze macro sentiment and news, only enter when multiple timeframes and data sources align..."
              rows={5}
              className="w-full rounded-xl border border-zinc-800/60 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 transition-all focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            />
          </div>

          {/* Examples */}
          <div>
            <p className="mb-2 text-xs text-zinc-500">Examples:</p>
            <div className="flex flex-wrap gap-2">
              {ENTRY_EXAMPLES.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => setEntryDescription(example)}
                  className="rounded-full border border-zinc-800 px-3 py-1 text-xs text-zinc-400 transition-colors hover:border-purple-800 hover:text-purple-400"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setStep("assets")}>
              <ArrowLeft className="h-4 w-4" />
              Assets
            </Button>
            <Button
              className="flex-1"
              onClick={() => setStep("exit")}
              disabled={!canProceedFromEntry}
            >
              Exit Strategy
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* STEP 3: EXIT STRATEGY                                              */}
      {/* ================================================================== */}
      {step === "exit" && (
        <div className="space-y-5">
          <div>
            <h1 className="text-xl font-semibold text-zinc-100">
              Define Exit Strategy
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Configure how and when your agent closes positions. You need at
              least a stop loss or take profit.
            </p>
          </div>

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
              <span className="text-xs text-zinc-500">(optional)</span>
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
              <span className="text-xs text-zinc-500">(optional)</span>
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

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setStep("entry")}>
              <ArrowLeft className="h-4 w-4" />
              Data & Logic
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                setGenerated(null);
                setStep("review");
              }}
              disabled={!canProceedFromExit}
            >
              Review & Generate
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* STEP 4: REVIEW & DEPLOY                                            */}
      {/* ================================================================== */}
      {step === "review" && (
        <div className="space-y-5">
          <div>
            <h1 className="text-xl font-semibold text-zinc-100">
              Review & Deploy
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Review your configuration and generate the agent.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Card className="!p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Instruments
              </p>
              <div className="flex flex-wrap gap-1.5">
                {Array.from(selectedInstruments).map((id) => (
                  <span
                    key={id}
                    className="rounded-md border border-zinc-700/50 bg-zinc-800/50 px-2 py-0.5 text-xs text-zinc-300"
                  >
                    {id.replace("_", "/")}
                  </span>
                ))}
              </div>
            </Card>

            <Card className="!p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Type & Schedule
              </p>
              <div className="flex items-center gap-2">
                <Badge variant="warning">
                  <Brain className="mr-1 h-3 w-3" /> Agent
                </Badge>
                <span className="text-xs text-zinc-500">
                  {SCHEDULE_OPTIONS.find((s) => s.id === evaluationSchedule)?.label}
                </span>
              </div>
              {dataProviders.size > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {Array.from(dataProviders).map((dp) => (
                    <span
                      key={dp}
                      className="rounded bg-zinc-800/60 px-1.5 py-0.5 text-[10px] text-zinc-500"
                    >
                      {dp.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              )}
            </Card>

            <Card className="!p-4 sm:col-span-2">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Analysis Logic
              </p>
              <p className="text-sm leading-relaxed text-zinc-300">
                {entryDescription}
              </p>
            </Card>

            <Card className="!p-4 sm:col-span-2">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Exit Strategy
              </p>
              <div className="flex flex-wrap gap-3 text-sm text-zinc-300">
                {exitConfig.stop_loss_pct && (
                  <span className="flex items-center gap-1">
                    <TrendingDown className="h-3 w-3 text-red-400" />
                    SL: {exitConfig.stop_loss_pct}%
                  </span>
                )}
                {exitConfig.take_profit_pct && (
                  <span className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-emerald-400" />
                    TP: {exitConfig.take_profit_pct}%
                  </span>
                )}
                {exitConfig.trailing_stop && exitConfig.trailing_stop_pct && (
                  <span className="text-zinc-400">
                    Trail: {exitConfig.trailing_stop_pct}%
                  </span>
                )}
              </div>
            </Card>
          </div>

          {!generated ? (
            <>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <Button
                onClick={handleGenerate}
                loading={generating}
                disabled={!!atAgentLimit || !!noCredits || agentBlocked}
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
            </>
          ) : (
            <div className="space-y-4">
              <Card>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-purple-400" />
                  {generated.name}
                </CardTitle>
                <CardDescription className="mt-1">
                  {generated.description}
                </CardDescription>

                <div className="mt-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
                      <p className="text-xs text-zinc-500">Exit Levels</p>
                      <p className="mt-1 text-sm text-zinc-200">
                        SL: {generatedExitConfig?.stop_loss_pct ?? "—"}% · TP:{" "}
                        {generatedExitConfig?.take_profit_pct ?? "—"}%
                      </p>
                    </div>
                    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
                      <p className="text-xs text-zinc-500">Portfolio</p>
                      <p className="mt-1 text-sm text-zinc-200">
                        {generated.portfolio_summary ||
                          `${selectedInstruments.size} instrument${selectedInstruments.size > 1 ? "s" : ""}`}
                      </p>
                    </div>
                  </div>

                  <details className="rounded-2xl border border-zinc-800/40 bg-zinc-900/30">
                    <summary className="cursor-pointer px-4 py-3 text-xs font-medium text-zinc-600 hover:text-zinc-400">
                      View raw config JSON
                    </summary>
                    <pre className="max-h-48 overflow-auto px-4 pb-3 text-xs text-zinc-500">
                      {JSON.stringify(generated.config, null, 2)}
                    </pre>
                  </details>
                </div>
              </Card>

              <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-3">
                <p className="text-xs text-purple-400">
                  Agents use AI to analyze market conditions and make trading decisions.
                  They run on a schedule and cannot be backtested. No real money is involved.
                </p>
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setGenerated(null);
                    setError("");
                  }}
                >
                  <Sparkles className="h-4 w-4" />
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

          {!generated && (
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("exit")}>
                <ArrowLeft className="h-4 w-4" />
                Exit Strategy
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
