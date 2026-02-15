"use client";

import { createClient } from "@/lib/supabase/client";
import { getPlan, type PlanId } from "@/lib/stripe/plans";
import { useCallback, useEffect, useState } from "react";

export interface SubscriptionData {
  tier: PlanId;
  status: string;
  creditsLimit: number;
  creditsUsed: number;
  creditsRemaining: number;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  agentCount: number;
  activeAgentCount: number;
}

interface SubRow {
  tier: string;
  status: string;
  cancel_at_period_end: boolean;
  current_period_end: string | null;
}

interface CreditRow {
  credits_limit: number;
  credits_used: number;
}

export function useSubscription() {
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const from = supabase.from as Function;

      const [subResult, creditsResult, agentResult, activeResult] =
        await Promise.all([
          from("subscriptions")
            .select(
              "tier, status, cancel_at_period_end, current_period_end"
            )
            .eq("user_id", user.id)
            .single(),
          from("ai_credits")
            .select("credits_limit, credits_used")
            .eq("user_id", user.id)
            .single(),
          from("agents")
            .select("id", { count: "exact", head: true })
            .eq("creator_id", user.id)
            .neq("status", "killed"),
          from("agents")
            .select("id", { count: "exact", head: true })
            .eq("creator_id", user.id)
            .eq("status", "active"),
        ]);

      const sub = subResult.data as SubRow | null;
      const credits = creditsResult.data as CreditRow | null;

      const tier = (sub?.tier ?? "free") as PlanId;
      const creditsLimit = credits?.credits_limit ?? 100;
      const creditsUsed = credits?.credits_used ?? 0;

      setData({
        tier,
        status: sub?.status ?? "active",
        creditsLimit,
        creditsUsed,
        creditsRemaining: Math.max(0, creditsLimit - creditsUsed),
        cancelAtPeriodEnd: sub?.cancel_at_period_end ?? false,
        currentPeriodEnd: sub?.current_period_end ?? null,
        agentCount: agentResult.count ?? 0,
        activeAgentCount: activeResult.count ?? 0,
      });
    } catch (err) {
      console.error("Failed to fetch subscription:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const plan = data ? getPlan(data.tier) : getPlan("free");

  return { data, plan, loading, refresh };
}
