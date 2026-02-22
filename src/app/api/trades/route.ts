import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const agentId = req.nextUrl.searchParams.get("agentId");
    const instrument = req.nextUrl.searchParams.get("instrument");

    const from = (supabase.from as Function).bind(supabase);
    let query = from("trades")
      .select("*")
      .order("opened_at", { ascending: false })
      .limit(500);
    if (agentId) query = query.eq("agent_id", agentId);
    if (instrument) query = query.eq("instrument", instrument);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ trades: data ?? [] });
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

    const { trades: tradesPayload } = (await req.json()) as {
      trades: unknown[];
    };
    if (!Array.isArray(tradesPayload) || tradesPayload.length === 0) {
      return NextResponse.json(
        { error: "trades array required" },
        { status: 400 }
      );
    }

    const from = (supabase.from as Function).bind(supabase);
    for (let i = 0; i < tradesPayload.length; i += 100) {
      const batch = tradesPayload.slice(i, i + 100);
      const { error } = await from("trades").insert(batch);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
