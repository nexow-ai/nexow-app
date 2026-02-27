import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface M1Row {
  ts: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  ai_technical: number | null;
  ai_momentum: number | null;
  ai_fundamental: number | null;
  ai_structure: number | null;
  ai_session: number | null;
  ai_overall: number | null;
  ai_direction: string | null;
  ai_analyzed_at: string | null;
}

const TF_MINUTES: Record<string, number> = {
  M1: 1,
  M5: 5,
  M15: 15,
  H1: 60,
  H4: 240,
  D1: 1440,
};

function aggregateToTimeframe(rows: M1Row[], tfMinutes: number): M1Row[] {
  if (tfMinutes <= 1 || rows.length === 0) return rows;

  const bucketMs = tfMinutes * 60 * 1000;
  const result: M1Row[] = [];
  let bucket: M1Row[] = [];
  let currentBucketStart = -1;

  for (const row of rows) {
    const ts = new Date(row.ts).getTime();
    const bucketStart = Math.floor(ts / bucketMs) * bucketMs;

    if (bucketStart !== currentBucketStart) {
      if (bucket.length > 0) {
        result.push(mergeBucket(bucket, currentBucketStart));
      }
      bucket = [row];
      currentBucketStart = bucketStart;
    } else {
      bucket.push(row);
    }
  }
  if (bucket.length > 0) {
    result.push(mergeBucket(bucket, currentBucketStart));
  }

  return result;
}

const AI_SCORE_KEYS = [
  "ai_technical", "ai_momentum", "ai_fundamental", "ai_structure", "ai_session", "ai_overall",
] as const;

function avgNonNull(bars: M1Row[], key: keyof M1Row): number | null {
  let sum = 0;
  let count = 0;
  for (const b of bars) {
    const v = b[key];
    if (v !== null && v !== undefined) {
      sum += Number(v);
      count++;
    }
  }
  return count > 0 ? Math.round((sum / count) * 1000) / 1000 : null;
}

function mergeBucket(bars: M1Row[], bucketTs: number): M1Row {
  // Direction: majority vote among analyzed bars
  let buyCount = 0, sellCount = 0;
  let lastAnalyzedAt: string | null = null;
  for (const b of bars) {
    if (b.ai_direction === "buy") buyCount++;
    else if (b.ai_direction === "sell") sellCount++;
    if (b.ai_analyzed_at) lastAnalyzedAt = b.ai_analyzed_at;
  }
  const direction = buyCount + sellCount === 0
    ? null
    : buyCount > sellCount ? "buy" : sellCount > buyCount ? "sell" : "hold";

  return {
    ts: new Date(bucketTs).toISOString(),
    open: bars[0].open,
    high: Math.max(...bars.map((b) => Number(b.high))),
    low: Math.min(...bars.map((b) => Number(b.low))),
    close: bars[bars.length - 1].close,
    volume: bars.reduce((s, b) => s + Number(b.volume), 0),
    ai_technical: avgNonNull(bars, "ai_technical"),
    ai_momentum: avgNonNull(bars, "ai_momentum"),
    ai_fundamental: avgNonNull(bars, "ai_fundamental"),
    ai_structure: avgNonNull(bars, "ai_structure"),
    ai_session: avgNonNull(bars, "ai_session"),
    ai_overall: avgNonNull(bars, "ai_overall"),
    ai_direction: direction,
    ai_analyzed_at: lastAnalyzedAt,
  };
}

/**
 * GET /api/reactor/overview?instrument=EUR_USD&timeframe=M15&range=72
 *
 * Returns forex_prices_1m rows aggregated to the requested timeframe.
 * `range` is in hours (default 3, max 8760).
 * Ordered ASC by ts for charting.
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
    const timeframe = searchParams.get("timeframe") || "M1";
    const rangeHours = Math.min(
      Math.max(Number(searchParams.get("range") || "3"), 1),
      8760
    );

    // Fetch M1 rows: order DESC + limit, then reverse — avoids gte timestamp issues
    const m1Needed = Math.min(rangeHours * 60, 50000);
    const dbFrom = (supabase.from as Function).bind(supabase);

    // Supabase default max_rows may be 1000; paginate if needed
    let allRows: M1Row[] = [];
    const pageSize = 1000;
    let fetched = 0;

    while (fetched < m1Needed) {
      const batchLimit = Math.min(pageSize, m1Needed - fetched);
      const { data, error } = await dbFrom("forex_prices_1m")
        .select(
          "ts, open, high, low, close, volume, ai_technical, ai_momentum, ai_fundamental, ai_structure, ai_session, ai_overall, ai_direction, ai_analyzed_at"
        )
        .eq("instrument", instrument)
        .order("ts", { ascending: false })
        .range(fetched, fetched + batchLimit - 1);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const batch = (data as M1Row[]) ?? [];
      allRows = allRows.concat(batch);
      fetched += batchLimit;

      // If we got fewer rows than requested, no more data
      if (batch.length < batchLimit) break;
    }

    // Reverse to ASC for charting
    allRows.reverse();

    const tfMinutes = TF_MINUTES[timeframe] || 1;
    const rows = aggregateToTimeframe(allRows, tfMinutes);

    return NextResponse.json({ rows });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
