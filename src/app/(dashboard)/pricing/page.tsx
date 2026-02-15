"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSubscription } from "@/hooks/use-subscription";
import {
  PLANS,
  CREDIT_COSTS,
  formatCredits,
  isUnlimited,
  type PlanId,
} from "@/lib/stripe/plans";
import {
  Bot,
  Brain,
  Check,
  CreditCard,
  Infinity,
  Loader2,
  Sparkles,
  Zap,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function PricingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const canceled = searchParams.get("canceled") === "true";

  const { data: subscription, loading } = useSubscription();
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);

  async function handleSelectPlan(planId: PlanId) {
    if (planId === "free") return;
    setLoadingPlan(planId);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, billing }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("No checkout URL returned");
      }
    } catch (err) {
      console.error("Checkout error:", err);
    } finally {
      setLoadingPlan(null);
    }
  }

  function handleManage() {
    router.push("/billing");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-12">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-50">
          Choose Your Plan
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Scale your trading with AI-powered agents. Upgrade anytime.
        </p>

        {canceled && (
          <div className="mx-auto mt-4 max-w-md rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
            <p className="text-sm text-amber-400">
              Checkout was canceled. You can try again anytime.
            </p>
          </div>
        )}
      </div>

      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => setBilling("monthly")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            billing === "monthly"
              ? "bg-zinc-800 text-zinc-100"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => setBilling("yearly")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            billing === "yearly"
              ? "bg-zinc-800 text-zinc-100"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Yearly
          <span className="ml-1.5 text-xs text-emerald-400">Save 17%</span>
        </button>
      </div>

      {/* Plans grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan) => {
            const isCurrentPlan = subscription?.tier === plan.id;
            const price =
              billing === "yearly" ? plan.yearlyPrice : plan.price;
            const monthlyEquivalent =
              billing === "yearly" && plan.yearlyPrice > 0
                ? Math.round(plan.yearlyPrice / 12)
                : plan.price;

            return (
              <Card
                key={plan.id}
                className={`relative flex flex-col !p-0 ${
                  plan.popular
                    ? "border-emerald-500/40 ring-1 ring-emerald-500/20"
                    : ""
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge variant="success">Most Popular</Badge>
                  </div>
                )}

                <div className="flex flex-1 flex-col p-6">
                  {/* Plan name */}
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-zinc-100">
                      {plan.name}
                    </h3>
                    <p className="mt-1 text-xs text-zinc-500">
                      {plan.description}
                    </p>
                  </div>

                  {/* Price */}
                  <div className="mb-6">
                    {plan.price === 0 ? (
                      <div className="text-3xl font-bold text-zinc-100">
                        Free
                      </div>
                    ) : (
                      <>
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-bold text-zinc-100">
                            ${monthlyEquivalent}
                          </span>
                          <span className="text-sm text-zinc-500">/mo</span>
                        </div>
                        {billing === "yearly" && (
                          <p className="mt-1 text-xs text-zinc-500">
                            ${price}/year billed annually
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  {/* Features */}
                  <div className="mb-6 flex-1 space-y-3">
                    <Feature
                      icon={<Bot className="h-3.5 w-3.5" />}
                      text={
                        isUnlimited(plan.limits.maxAgents)
                          ? "Unlimited agents"
                          : `Up to ${plan.limits.maxAgents} agents`
                      }
                    />
                    <Feature
                      icon={<Zap className="h-3.5 w-3.5" />}
                      text={
                        isUnlimited(plan.limits.maxConcurrentAgents)
                          ? "Unlimited concurrent agents"
                          : `${plan.limits.maxConcurrentAgents} concurrent active`
                      }
                    />
                    <Feature
                      icon={<Sparkles className="h-3.5 w-3.5" />}
                      text={`${formatCredits(plan.limits.monthlyCredits)} AI credits/month`}
                    />
                    <Feature
                      icon={<Brain className="h-3.5 w-3.5" />}
                      text="Discretionary (AI) agents"
                      enabled={plan.limits.discretionaryAgents}
                    />
                    <Feature
                      icon={<CreditCard className="h-3.5 w-3.5" />}
                      text="Copy trading"
                      enabled={plan.limits.copyTrading}
                    />
                    {plan.limits.priorityExecution && (
                      <Feature
                        icon={<Zap className="h-3.5 w-3.5" />}
                        text="Priority execution"
                        highlight
                      />
                    )}
                  </div>

                  {/* CTA */}
                  {isCurrentPlan ? (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleManage}
                    >
                      Current Plan
                    </Button>
                  ) : plan.id === "free" ? (
                    <Button
                      variant="ghost"
                      className="w-full"
                      disabled
                    >
                      Free Forever
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      variant={plan.popular ? "primary" : "secondary"}
                      onClick={() => handleSelectPlan(plan.id)}
                      loading={loadingPlan === plan.id}
                    >
                      {subscription?.tier !== "free"
                        ? "Switch Plan"
                        : "Get Started"}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Credit costs explanation */}
      <Card className="!p-6">
        <h3 className="mb-4 text-sm font-semibold text-zinc-200">
          How AI Credits Work
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-4">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                <Sparkles className="h-4 w-4 text-emerald-400" />
              </div>
              <span className="text-sm font-medium text-zinc-200">
                Agent Generation
              </span>
            </div>
            <p className="text-2xl font-bold text-zinc-100">
              {CREDIT_COSTS.agentGeneration}
              <span className="ml-1 text-sm font-normal text-zinc-500">
                credits
              </span>
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              One-time cost when creating any agent
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-4">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10">
                <Brain className="h-4 w-4 text-purple-400" />
              </div>
              <span className="text-sm font-medium text-zinc-200">
                AI Evaluation
              </span>
            </div>
            <p className="text-2xl font-bold text-zinc-100">
              {CREDIT_COSTS.discretionaryEvaluation}
              <span className="ml-1 text-sm font-normal text-zinc-500">
                credit/eval
              </span>
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Each time a discretionary agent analyzes the market
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-4">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
                <Zap className="h-4 w-4 text-blue-400" />
              </div>
              <span className="text-sm font-medium text-zinc-200">
                Systematic Agents
              </span>
            </div>
            <p className="text-2xl font-bold text-zinc-100">
              0
              <span className="ml-1 text-sm font-normal text-zinc-500">
                credits/eval
              </span>
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Rule-based agents run for free after creation
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Feature({
  icon,
  text,
  enabled = true,
  highlight = false,
}: {
  icon: React.ReactNode;
  text: string;
  enabled?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2.5 ${
        enabled ? "text-zinc-300" : "text-zinc-600 line-through"
      }`}
    >
      <div
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
          highlight
            ? "bg-emerald-500/20 text-emerald-400"
            : enabled
              ? "bg-zinc-800 text-zinc-400"
              : "bg-zinc-900 text-zinc-700"
        }`}
      >
        {enabled ? (
          icon
        ) : (
          <span className="text-[10px]">—</span>
        )}
      </div>
      <span className="text-xs">{text}</span>
    </div>
  );
}
