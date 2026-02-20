import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const type = req.nextUrl.searchParams.get("type") as "bot" | "agent" | null;
    const from = (supabase.from as Function).bind(supabase);
    let query = from("agents").select("*").eq("creator_id", user.id);
    if (type) query = query.eq("type", type);
    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ agents: data ?? [] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const from = (supabase.from as Function).bind(supabase);
    const insertPayload = {
      creator_id: user.id,
      name: body.name ?? "Unnamed",
      description: body.description ?? null,
      type: body.type ?? "agent",
      config: body.config ?? {},
      prompt: body.prompt ?? null,
      instrument: body.instrument ?? "EUR_USD",
      instruments: body.instruments ?? [],
      timeframe: body.timeframe ?? "H1",
      llm_provider: body.llm_provider ?? "",
      llm_model: body.llm_model ?? "",
      evaluation_schedule: body.evaluation_schedule ?? "",
      status: body.status ?? "active",
    };

    const { data, error } = await from("agents")
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ agent: data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
