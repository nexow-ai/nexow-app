import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/reactor/analyses?instrument=EUR_USD&limit=3000&from=2026-02-25
 *
 * Returns M1 rows from forex_prices_1m that have ai_direction set (analyzed).
 * Ordered ASC by ts for charting.
 * Supports optional `from` date filter and pagination for large datasets.
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
    const limit = Math.min(Number(searchParams.get("limit") || "3000"), 50000);
    const from = searchParams.get("from"); // ISO date string, e.g. "2026-02-25"

    const dbFrom = (supabase.from as Function).bind(supabase);

    // Paginate to bypass PostgREST default row limit
    const pageSize = 1000;
    let allRows: unknown[] = [];
    let offset = 0;

    while (offset < limit) {
      const batchSize = Math.min(pageSize, limit - offset);
      let query = dbFrom("forex_prices_1m")
        .select(
          "ts, open, high, low, close, ai_technical, ai_momentum, ai_fundamental, ai_structure, ai_session, ai_overall, ai_direction, ai_reasoning"
        )
        .eq("instrument", instrument)
        .not("ai_direction", "is", null)
        .order("ts", { ascending: true });

      if (from) {
        query = query.gte("ts", from);
      }

      query = query.range(offset, offset + batchSize - 1);

      const { data, error } = await query;

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const batch = (data as unknown[]) ?? [];
      allRows = allRows.concat(batch);
      offset += batchSize;

      if (batch.length < batchSize) break;
    }

    return NextResponse.json({ analyses: allRows });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
