import { NextRequest, NextResponse } from "next/server";

const OANDA_API_URL = process.env.OANDA_API_URL || "https://api-fxpractice.oanda.com";
const OANDA_ACCOUNT_ID = process.env.OANDA_ACCOUNT_ID || "";
const OANDA_API_TOKEN = process.env.OANDA_API_TOKEN || "";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const instrument = searchParams.get("instrument") || "EUR_USD";

  if (!OANDA_ACCOUNT_ID || !OANDA_API_TOKEN) {
    return NextResponse.json({ error: "Oanda credentials not configured" }, { status: 500 });
  }

  try {
    const url = `${OANDA_API_URL}/v3/accounts/${OANDA_ACCOUNT_ID}/pricing?instruments=${instrument}`;

    const resp = await fetch(url, {
      headers: {
        Authorization: `Bearer ${OANDA_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!resp.ok) {
      const text = await resp.text();
      return NextResponse.json({ error: text }, { status: resp.status });
    }

    const data = await resp.json();
    const priceData = data.prices?.[0];

    if (!priceData) {
      return NextResponse.json({ error: "No price data available" }, { status: 404 });
    }

    const bid = parseFloat(priceData.bids[0].price);
    const ask = parseFloat(priceData.asks[0].price);
    const mid = (bid + ask) / 2;
    const time = Math.floor(new Date(priceData.time).getTime() / 1000);

    return NextResponse.json({ bid, ask, mid, time, instrument });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch price" },
      { status: 500 }
    );
  }
}
