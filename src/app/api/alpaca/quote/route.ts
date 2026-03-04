import { NextRequest, NextResponse } from "next/server";
import { alpacaDataFetch, getDataApiUrl, hasAlpacaConfig } from "@/lib/alpaca";

export const dynamic = "force-dynamic";

function parseJsonSafe<T>(text: string): T | null {
  const t = text.trim();
  if (t.startsWith("{") || t.startsWith("[")) {
    try {
      return JSON.parse(text) as T;
    } catch {
      return null;
    }
  }
  return null;
}

export async function GET(request: NextRequest) {
  if (!hasAlpacaConfig()) {
    return NextResponse.json(
      { error: "Alpaca is not configured" },
      { status: 503 }
    );
  }
  const symbol = request.nextUrl.searchParams.get("symbol");
  if (!symbol?.trim()) {
    return NextResponse.json(
      { error: "symbol is required" },
      { status: 400 }
    );
  }

  const params = new URLSearchParams({ symbols: symbol.trim() });
  const url = getDataApiUrl("/v2/stocks/quotes/latest", params.toString());
  try {
    const res = await alpacaDataFetch(url, { cache: "no-store" });
    const text = await res.text();
    const data = parseJsonSafe<{
      quotes?: Record<
        string,
        {
          ap?: number;
          as?: number;
          bp?: number;
          bs?: number;
          t?: string;
        }
      >;
      message?: string;
    }>(text);

    if (!data) {
      console.error("Alpaca quote non-JSON response:", text.slice(0, 200));
      return NextResponse.json(
        {
          error:
            "Market data returned an invalid response. For quotes, add ALPACA_API_KEY and ALPACA_SECRET_KEY (Paper Trading keys) to .env; Broker API alone may not have Data API access.",
        },
        { status: 502 }
      );
    }
    if (!res.ok) {
      return NextResponse.json(
        { error: data.message ?? "Failed to load quote" },
        { status: res.status }
      );
    }
    const q = data.quotes?.[symbol.trim()];
    return NextResponse.json({
      symbol: symbol.trim(),
      bid: q?.bp ?? null,
      ask: q?.ap ?? null,
      bidSize: q?.bs ?? null,
      askSize: q?.as ?? null,
      timestamp: q?.t ?? null,
    });
  } catch (e) {
    console.error("Alpaca quote error:", e);
    return NextResponse.json(
      { error: "Could not reach Alpaca" },
      { status: 502 }
    );
  }
}
