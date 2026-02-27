import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/reactor/signal-log?configId=xxx&limit=50
 *
 * Returns recent reactor signal evaluations (trades + skips) for a config.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const configId = searchParams.get("configId");
    const limit = Math.min(Number(searchParams.get("limit") || "50"), 200);

    if (!configId) {
      return NextResponse.json({ error: "configId required" }, { status: 400 });
    }

    const dbFrom = (supabase.from as Function).bind(supabase);
    const { data, error } = await dbFrom("reactor_signal_log")
      .select("id, signal_type, confidence, reason, candle_ts, created_at, timeframe")
      .eq("reactor_config_id", configId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ logs: data ?? [] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
