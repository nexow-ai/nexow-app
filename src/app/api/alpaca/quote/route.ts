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
    const res = await alpacaFetch(url, { cache: "no-store" });
    const data = (await res.json()) as {
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
    };
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
