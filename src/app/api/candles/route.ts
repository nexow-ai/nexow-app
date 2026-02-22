import { NextRequest, NextResponse } from "next/server";

const NEXOW_API_URL = process.env.NEXOW_API_URL || "http://localhost:8000";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const instrument = searchParams.get("instrument") || "EUR_USD";
  const granularity = searchParams.get("granularity") || "M5";
  const count = searchParams.get("count") || "200";

  try {
    const url = `${NEXOW_API_URL}/api/data/candles?instrument=${instrument}&granularity=${granularity}&count=${count}`;

    const resp = await fetch(url, { cache: "no-store" });

    if (!resp.ok) {
      const text = await resp.text();
      return NextResponse.json(
        { error: text || `Backend returned ${resp.status}` },
        { status: resp.status }
      );
    }

    return NextResponse.json(await resp.json());
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch candles" },
      { status: 500 }
    );
  }
}
