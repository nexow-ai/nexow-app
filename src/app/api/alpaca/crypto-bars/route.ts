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

  const cryptoSymbol = symbol.includes("/") ? symbol.trim() : `${symbol.trim()}/USD`;
  const params = new URLSearchParams();
  params.set("symbols", cryptoSymbol);
  params.set("timeframe", timeframe);
  if (start) params.set("start", start);
  if (end) params.set("end", end);
  params.set("limit", limit);

  const url = getDataApiUrl("/v1beta3/crypto/us/bars", params.toString());
  try {
    const res = await alpacaDataFetch(url, { cache: "no-store" });
    const text = await res.text();
    const data = parseJsonSafe<{
      bars?: Record<string, Array<{ t: string; o: number; h: number; l: number; c: number; v: number }>>;
      message?: string;
    }>(text);

    if (!data) {
      console.error("Alpaca crypto bars non-JSON response:", text.slice(0, 200));
      return NextResponse.json(
        {
          error:
            "Market data returned an invalid response. Add ALPACA_API_KEY and ALPACA_SECRET_KEY (Paper Trading keys) for crypto charts.",
        },
        { status: 502 }
      );
    }
    if (!res.ok) {
      return NextResponse.json(
        { error: data.message ?? "Failed to load crypto bars" },
        { status: res.status }
      );
    }
    const key = Object.keys(data.bars ?? {}).find(
      (k) => k.toUpperCase() === cryptoSymbol.toUpperCase()
    ) ?? cryptoSymbol;
    const bars = data.bars?.[key] ?? [];
    return NextResponse.json({ bars, symbol: cryptoSymbol });
  } catch (e) {
    console.error("Alpaca crypto bars error:", e);
    return NextResponse.json(
      { error: "Could not reach Alpaca" },
      { status: 502 }
    );
  }
}
