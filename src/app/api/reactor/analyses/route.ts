import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/reactor/analyses?instrument=EUR_USD&limit=500
 *
 * Returns M1 rows from forex_prices_1m that have ai_direction set (analyzed).
 * Ordered DESC by ts.  The frontend aggregates into the user's timeframe.
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
    const instrument = searchParams.get("instrument") || "EUR_USD";
    const limit = Math.min(Number(searchParams.get("limit") || "3000"), 5000);

    const from = (supabase.from as Function).bind(supabase);
    const { data, error } = await from("forex_prices_1m")
      .select(
        "ts, ai_technical, ai_momentum, ai_fundamental, ai_structure, ai_session, ai_overall, ai_direction"
      )
      .eq("instrument", instrument)
      .not("ai_direction", "is", null)
      .order("ts", { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ analyses: data ?? [] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
