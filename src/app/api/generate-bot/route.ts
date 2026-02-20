import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canDeployAgent, hasCredits } from "@/lib/stripe/guards";
import { CREDIT_COSTS } from "@/lib/stripe/plans";

export const dynamic = "force-dynamic";

const NEXOW_API_URL =
  process.env.NEXOW_API_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { prompt } = body;

  if (!prompt || typeof prompt !== "string") {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  const deployCheck = await canDeployAgent(user.id, "bot");
  if (!deployCheck.allowed) {
    return NextResponse.json(
      { error: deployCheck.reason },
      { status: 403 }
    );
  }

  const hasCreds = await hasCredits(user.id, CREDIT_COSTS.agentGeneration);
  if (!hasCreds) {
    return NextResponse.json(
      { error: "Insufficient credits. Upgrade your plan for more credits." },
      { status: 403 }
    );
  }

  try {
    const resp = await fetch(`${NEXOW_API_URL}/api/bots/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return NextResponse.json({ error: errText }, { status: resp.status });
    }

    const generated = await resp.json();

    await (supabase.rpc as Function)("consume_credits", {
      p_user_id: user.id,
      p_amount: CREDIT_COSTS.agentGeneration,
      p_action: "bot_generation",
      p_agent_id: null,
      p_description: "Generated bot config",
    });

    return NextResponse.json(generated);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Generation failed" },
      { status: 500 }
    );
  }
}
