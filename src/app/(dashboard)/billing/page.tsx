"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { useSubscription } from "@/hooks/use-subscription";
import {
  CREDIT_COSTS,
  formatCredits,
  isUnlimited,
} from "@/lib/stripe/plans";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowUpRight,
  Bot,
  Brain,
  CalendarClock,
  CreditCard,
  Loader2,
  Sparkles,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

interface UsageLogEntry {
  id: string;
  action: string;
  credits_used: number;
  description: string | null;
  created_at: string;
}

export default function BillingPage() {
  const searchParams = useSearchParams();
  const success = searchParams.get("success") === "true";

  const { data: subscription, plan, loading, refresh } = useSubscription();
  const [usageLog, setUsageLog] = useState<UsageLogEntry[]>([]);
  const [loadingPortal, setLoadingPortal] = useState(false);

  useEffect(() => {
    if (success) refresh();
  }, [success, refresh]);

  useEffect(() => {
    async function fetchUsage() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await (supabase.from as Function)("credit_usage_log")
        .select("id, action, credits_used, description, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (data) setUsageLog(data as UsageLogEntry[]);
    }
    fetchUsage();
  }, []);

  async function handleManageBilling() {
    setLoadingPortal(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error("Portal error:", err);
    } finally {
      setLoadingPortal(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (!subscription) return null;

  const creditsPercent =
    subscription.creditsLimit > 0
      ? Math.round(
          (subscription.creditsUsed / subscription.creditsLimit) * 100
        )
      : 0;

  const agentPercent =
    plan.limits.maxAgents > 0
      ? Math.round(
          (subscription.agentCount / plan.limits.maxAgents) * 100
        )
      : 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      {/* Success banner */}
      {success && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <p className="text-sm font-medium text-emerald-400">
            Subscription activated successfully! Your plan is now active.
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50">
            Billing & Subscription
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Manage your plan, credits, and billing details
          </p>
        </div>
        {subscription.tier !== "free" && (
          <Button
            variant="outline"
            onClick={handleManageBilling}
            loading={loadingPortal}
          >
            <CreditCard className="h-4 w-4" />
            Manage Billing
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Current plan overview */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Plan card */}
        <Card className="!p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Current Plan
            </span>
            <Badge
              variant={
                subscription.tier === "free"
                  ? "default"
                  : subscription.tier === "elite"
                    ? "warning"
                    : "success"
              }
            >
              {plan.name}
            </Badge>
          </div>
          <p className="text-2xl font-bold text-zinc-100">
            {plan.price === 0 ? (
              "Free"
            ) : (
              <>
                ${plan.price}
                <span className="text-sm font-normal text-zinc-500">/mo</span>
              </>
            )}
          </p>
          {subscription.cancelAtPeriodEnd && (
            <p className="mt-2 text-xs text-amber-400">
              Cancels at end of period
            </p>
          )}
          {subscription.currentPeriodEnd && (
            <p className="mt-1 text-xs text-zinc-600">
              <CalendarClock className="mr-1 inline h-3 w-3" />
              Renews{" "}
              {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
            </p>
          )}
          {subscription.tier === "free" && (
            <Link href="/pricing">
              <Button className="mt-4 w-full" size="sm">
                <Sparkles className="h-3.5 w-3.5" />
                Upgrade
              </Button>
            </Link>
          )}
        </Card>

        {/* AI Credits card */}
        <Card className="!p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              AI Credits
            </span>
            <Sparkles className="h-4 w-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-zinc-100">
            {formatCredits(subscription.creditsRemaining)}
            <span className="text-sm font-normal text-zinc-500">
              {" "}
              / {formatCredits(subscription.creditsLimit)}
            </span>
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
            <div
              className={`h-full rounded-full transition-all ${
                creditsPercent > 90
                  ? "bg-red-500"
                  : creditsPercent > 70
                    ? "bg-amber-500"
                    : "bg-emerald-500"
              }`}
              style={{ width: `${Math.min(creditsPercent, 100)}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-zinc-600">
            {creditsPercent}% used this period
          </p>
        </Card>

        {/* Agent usage card */}
        <Card className="!p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Agents
            </span>
            <Bot className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-zinc-100">
            {subscription.agentCount}
            <span className="text-sm font-normal text-zinc-500">
              {" "}
              /{" "}
              {isUnlimited(plan.limits.maxAgents) ? (
                <span className="text-emerald-400">unlimited</span>
              ) : (
                plan.limits.maxAgents
              )}
            </span>
          </p>
          {!isUnlimited(plan.limits.maxAgents) && (
            <>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className={`h-full rounded-full transition-all ${
                    agentPercent > 90
                      ? "bg-red-500"
                      : agentPercent > 70
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.min(agentPercent, 100)}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-zinc-600">
                {subscription.activeAgentCount} currently active
              </p>
            </>
          )}
        </Card>
      </div>

      {/* Plan features */}
      <Card className="!p-6">
        <CardTitle className="mb-4 text-sm">Plan Features</CardTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <FeatureItem
            icon={<Bot className="h-4 w-4" />}
            label="Max Agents"
            value={
              isUnlimited(plan.limits.maxAgents)
                ? "Unlimited"
                : plan.limits.maxAgents.toString()
            }
          />
          <FeatureItem
            icon={<Zap className="h-4 w-4" />}
            label="Concurrent Active"
            value={
              isUnlimited(plan.limits.maxConcurrentAgents)
                ? "Unlimited"
                : plan.limits.maxConcurrentAgents.toString()
            }
          />
          <FeatureItem
            icon={<Sparkles className="h-4 w-4" />}
            label="Monthly Credits"
            value={formatCredits(plan.limits.monthlyCredits)}
          />
          <FeatureItem
            icon={<Brain className="h-4 w-4" />}
            label="AI Agents"
            value={plan.limits.discretionaryAgents ? "Yes" : "No"}
            enabled={plan.limits.discretionaryAgents}
          />
          <FeatureItem
            icon={<CreditCard className="h-4 w-4" />}
            label="Copy Trading"
            value={plan.limits.copyTrading ? "Yes" : "No"}
            enabled={plan.limits.copyTrading}
          />
          <FeatureItem
            icon={<Zap className="h-4 w-4" />}
            label="Priority Execution"
            value={plan.limits.priorityExecution ? "Yes" : "No"}
            enabled={plan.limits.priorityExecution}
          />
        </div>
        {subscription.tier !== "elite" && (
          <div className="mt-4 border-t border-zinc-800/40 pt-4">
            <Link href="/pricing">
              <Button variant="outline" size="sm">
                <ArrowUpRight className="h-3.5 w-3.5" />
                {subscription.tier === "free"
                  ? "Upgrade Plan"
                  : "Change Plan"}
              </Button>
            </Link>
          </div>
        )}
      </Card>

      {/* Credit usage log */}
      <Card className="!p-6">
        <CardTitle className="mb-4 text-sm">Recent Credit Usage</CardTitle>
        {usageLog.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-600">
            No credit usage yet
          </p>
        ) : (
          <div className="space-y-2">
            {usageLog.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between rounded-lg border border-zinc-800/40 bg-zinc-900/30 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800/80">
                    {entry.action === "agent_generation" ? (
                      <Sparkles className="h-4 w-4 text-emerald-400" />
                    ) : entry.action === "discretionary_evaluation" ? (
                      <Brain className="h-4 w-4 text-purple-400" />
                    ) : (
                      <Zap className="h-4 w-4 text-blue-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-200">
                      {entry.action.replace(/_/g, " ")}
                    </p>
                    {entry.description && (
                      <p className="text-xs text-zinc-500">
                        {entry.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-red-400">
                    −{entry.credits_used}
                  </p>
                  <p className="text-xs text-zinc-600">
                    {new Date(entry.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function FeatureItem({
  icon,
  label,
  value,
  enabled = true,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  enabled?: boolean;
}) {
  return (
    <div className="rounded-lg border border-zinc-800/40 bg-zinc-900/30 p-3">
      <div className="mb-1 flex items-center gap-2 text-zinc-500">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p
        className={`text-sm font-semibold ${
          enabled ? "text-zinc-200" : "text-zinc-600"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
