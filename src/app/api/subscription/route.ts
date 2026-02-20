import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const from = (supabase.from as Function).bind(supabase);

    const [
      subResult,
      creditsResult,
      botResult,
      activeBotResult,
      agentResult,
      activeAgentResult,
    ] = await Promise.all([
      from("subscriptions")
        .select("tier, status, cancel_at_period_end, current_period_end")
        .eq("user_id", user.id)
        .single(),
      from("ai_credits")
        .select("credits_limit, credits_used")
        .eq("user_id", user.id)
        .single(),
      from("agents")
        .select("id", { count: "exact", head: true })
        .eq("creator_id", user.id)
        .eq("type", "bot")
        .neq("status", "killed"),
      from("agents")
        .select("id", { count: "exact", head: true })
        .eq("creator_id", user.id)
        .eq("type", "bot")
        .eq("status", "active"),
      from("agents")
        .select("id", { count: "exact", head: true })
        .eq("creator_id", user.id)
        .eq("type", "agent")
        .neq("status", "killed"),
      from("agents")
        .select("id", { count: "exact", head: true })
        .eq("creator_id", user.id)
        .eq("type", "agent")
        .eq("status", "active"),
    ]);

    const sub = subResult.data as { tier: string; status: string; cancel_at_period_end: boolean; current_period_end: string | null } | null;
    const credits = creditsResult.data as { credits_limit: number; credits_used: number } | null;

    return NextResponse.json({
      tier: sub?.tier ?? "free",
      status: sub?.status ?? "active",
      creditsLimit: credits?.credits_limit ?? 100,
      creditsUsed: credits?.credits_used ?? 0,
      cancelAtPeriodEnd: sub?.cancel_at_period_end ?? false,
      currentPeriodEnd: sub?.current_period_end ?? null,
      botCount: botResult.count ?? 0,
      activeBotCount: activeBotResult.count ?? 0,
      agentCount: agentResult.count ?? 0,
      activeAgentCount: activeAgentResult.count ?? 0,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
