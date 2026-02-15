import { NextRequest, NextResponse } from "next/server";

const OANDA_API_URL = process.env.OANDA_API_URL || "https://api-fxpractice.oanda.com";
const OANDA_ACCOUNT_ID = process.env.OANDA_ACCOUNT_ID || "";
const OANDA_API_TOKEN = process.env.OANDA_API_TOKEN || "";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const instrument = searchParams.get("instrument") || "EUR_USD";
  const granularity = searchParams.get("granularity") || "M5";
  const count = searchParams.get("count") || "200";

  if (!OANDA_ACCOUNT_ID || !OANDA_API_TOKEN) {
    return NextResponse.json({ error: "Oanda credentials not configured" }, { status: 500 });
  }

  try {
    const url = `${OANDA_API_URL}/v3/accounts/${OANDA_ACCOUNT_ID}/instruments/${instrument}/candles?granularity=${granularity}&count=${count}&price=M`;

    const resp = await fetch(url, {
      headers: {
        Authorization: `Bearer ${OANDA_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 5 },
    });

    if (!resp.ok) {
      const text = await resp.text();
      return NextResponse.json({ error: text }, { status: resp.status });
    }

    const data = await resp.json();

    const candles = (data.candles || [])
      .filter((c: { complete: boolean }) => c.complete)
      .map((c: { time: string; mid: { o: string; h: string; l: string; c: string }; volume: string }) => ({
        time: Math.floor(new Date(c.time).getTime() / 1000),
        open: parseFloat(c.mid.o),
        high: parseFloat(c.mid.h),
        low: parseFloat(c.mid.l),
        close: parseFloat(c.mid.c),
        volume: parseInt(c.volume),
      }));

    return NextResponse.json({ candles, instrument });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch candles" },
      { status: 500 }
    );
  }
}
