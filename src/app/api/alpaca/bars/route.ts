import { NextRequest, NextResponse } from "next/server";
import { alpacaFetch, getDataApiUrl, hasAlpacaConfig } from "@/lib/alpaca";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!hasAlpacaConfig()) {
    return NextResponse.json(
      { error: "Alpaca is not configured" },
      { status: 503 }
    );
  }
  const { searchParams } = request.nextUrl;
  const symbol = searchParams.get("symbol");
  const timeframe = searchParams.get("timeframe") ?? "1Hour";
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const limit = searchParams.get("limit") ?? "100";

  if (!symbol?.trim()) {
    return NextResponse.json(
      { error: "symbol is required" },
      { status: 400 }
    );
  }

  const params = new URLSearchParams();
  params.set("symbols", symbol.trim());
  params.set("timeframe", timeframe);
  if (start) params.set("start", start);
  if (end) params.set("end", end);
  params.set("limit", limit);

  const url = getDataApiUrl("/v2/stocks/bars", params.toString());
  try {
    const res = await alpacaFetch(url, { cache: "no-store" });
    const data = (await res.json()) as {
      bars?: Record<string, Array<{ t: string; o: number; h: number; l: number; c: number; v: number }>>;
      message?: string;
    };
    if (!res.ok) {
      return NextResponse.json(
        { error: data.message ?? "Failed to load bars" },
        { status: res.status }
      );
    }
    const bars = data.bars?.[symbol.trim()] ?? [];
    return NextResponse.json({ bars, symbol: symbol.trim() });
  } catch (e) {
    console.error("Alpaca bars error:", e);
    return NextResponse.json(
      { error: "Could not reach Alpaca" },
      { status: 502 }
    );
  }
}
