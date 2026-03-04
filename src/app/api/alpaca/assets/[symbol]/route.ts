import { NextRequest, NextResponse } from "next/server";
import {
  alpacaFetch,
  getBrokerApiUrl,
  getPaperApiUrl,
  hasAlpacaConfig,
  hasBrokerConfig,
} from "@/lib/alpaca";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  if (!hasAlpacaConfig()) {
    return NextResponse.json(
      { error: "Alpaca is not configured" },
      { status: 503 }
    );
  }
  const symbol = (await params).symbol;
  if (!symbol) {
    return NextResponse.json(
      { error: "symbol is required" },
      { status: 400 }
    );
  }

  const path = hasBrokerConfig() ? "/v1/assets" : "/v2/assets";
  const url = hasBrokerConfig()
    ? getBrokerApiUrl(`${path}/${encodeURIComponent(symbol)}`)
    : getPaperApiUrl(`${path}/${encodeURIComponent(symbol)}`);
  try {
    const res = await alpacaFetch(url, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: (data as { message?: string }).message ?? "Asset not found" },
        { status: res.status }
      );
    }
    return NextResponse.json(data);
  } catch (e) {
    console.error("Alpaca asset error:", e);
    return NextResponse.json(
      { error: "Could not reach Alpaca" },
      { status: 502 }
    );
  }
}
