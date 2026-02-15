import { createClient } from "@/lib/supabase/server";
import { getPlan, type PlanId } from "./plans";

export interface UserSubscription {
  tier: PlanId;
  status: string;
  creditsLimit: number;
  creditsUsed: number;
  creditsRemaining: number;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
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

/**
 * Get the current user's subscription and credit info (server-side).
 */
export async function getUserSubscription(
  userId: string
): Promise<UserSubscription> {
  const supabase = await createClient();

  const [subResult, creditsResult] = await Promise.all([
    (supabase.from as Function)("subscriptions")
      .select("tier, status, cancel_at_period_end, current_period_end")
      .eq("user_id", userId)
      .single(),
    (supabase.from as Function)("ai_credits")
      .select("credits_limit, credits_used")
      .eq("user_id", userId)
      .single(),
  ]);

  const sub = subResult.data as SubRow | null;
  const credits = creditsResult.data as CreditRow | null;

  const tier = (sub?.tier ?? "free") as PlanId;
  const creditsLimit = credits?.credits_limit ?? 100;
  const creditsUsed = credits?.credits_used ?? 0;

  return {
    tier,
    status: sub?.status ?? "active",
    creditsLimit,
    creditsUsed,
    creditsRemaining: Math.max(0, creditsLimit - creditsUsed),
    cancelAtPeriodEnd: sub?.cancel_at_period_end ?? false,
    currentPeriodEnd: sub?.current_period_end ?? null,
  };
}

/**
 * Check if user can deploy a new agent based on their plan limits.
 */
export async function canDeployAgent(
  userId: string,
  agentType: "systematic" | "discretionary"
): Promise<{ allowed: boolean; reason?: string }> {
  const supabase = await createClient();
  const subscription = await getUserSubscription(userId);
  const plan = getPlan(subscription.tier);

  // Check if discretionary agents are allowed
  if (agentType === "discretionary" && !plan.limits.discretionaryAgents) {
    return {
      allowed: false,
      reason: "Discretionary agents require a Starter plan or higher",
    };
  }

  // Check agent count limit
  if (plan.limits.maxAgents !== -1) {
    const { count } = await (supabase.from as Function)("agents")
      .select("id", { count: "exact", head: true })
      .eq("creator_id", userId)
      .neq("status", "killed");

    if ((count ?? 0) >= plan.limits.maxAgents) {
      return {
        allowed: false,
        reason: `You've reached the maximum of ${plan.limits.maxAgents} agents on the ${plan.name} plan`,
      };
    }
  }

  // Check concurrent active agents
  if (plan.limits.maxConcurrentAgents !== -1) {
    const { count } = await (supabase.from as Function)("agents")
      .select("id", { count: "exact", head: true })
      .eq("creator_id", userId)
      .eq("status", "active");

    if ((count ?? 0) >= plan.limits.maxConcurrentAgents) {
      return {
        allowed: false,
        reason: `You've reached the maximum of ${plan.limits.maxConcurrentAgents} active agents on the ${plan.name} plan`,
      };
    }
  }

  return { allowed: true };
}

/**
 * Check if user has enough credits for an operation.
 */
export async function hasCredits(
  userId: string,
  amount: number
): Promise<boolean> {
  const subscription = await getUserSubscription(userId);
  return subscription.creditsRemaining >= amount;
}
