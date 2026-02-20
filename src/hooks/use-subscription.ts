"use client";

import { getPlan, type PlanId } from "@/lib/stripe/plans";
import { useCallback, useEffect, useState } from "react";
import { useSession } from "./use-session";

export interface SubscriptionData {
  tier: PlanId;
  status: string;
  creditsLimit: number;
  creditsUsed: number;
  creditsRemaining: number;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  botCount: number;
  activeBotCount: number;
  agentCount: number;
  activeAgentCount: number;
}

export function useSubscription() {
  const { user } = useSession();
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setData(null);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/subscription");
      if (!res.ok) {
        setData(null);
        return;
      }
      const raw = await res.json();
      const creditsLimit = raw.creditsLimit ?? 100;
      const creditsUsed = raw.creditsUsed ?? 0;
      setData({
        tier: (raw.tier ?? "free") as PlanId,
        status: raw.status ?? "active",
        creditsLimit,
        creditsUsed,
        creditsRemaining: Math.max(0, creditsLimit - creditsUsed),
        cancelAtPeriodEnd: raw.cancelAtPeriodEnd ?? false,
        currentPeriodEnd: raw.currentPeriodEnd ?? null,
        botCount: raw.botCount ?? 0,
        activeBotCount: raw.activeBotCount ?? 0,
        agentCount: raw.agentCount ?? 0,
        activeAgentCount: raw.activeAgentCount ?? 0,
      });
    } catch (err) {
      console.error("Failed to fetch subscription:", err);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const plan = data ? getPlan(data.tier) : getPlan("free");

  return { data, plan, loading, refresh };
}
