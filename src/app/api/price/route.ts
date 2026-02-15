import { NextRequest, NextResponse } from "next/server";

const NEXOW_SERVER_URL =
  process.env.NEXOW_SERVER_URL || "http://localhost:8000";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const instrument = searchParams.get("instrument") || "EUR_USD";

  try {
    const resp = await fetch(
      `${NEXOW_SERVER_URL}/api/data/prices/${instrument}`,
      { cache: "no-store" }
    );

    if (!resp.ok) {
      const text = await resp.text();
      return NextResponse.json({ error: text }, { status: resp.status });
    }

    return NextResponse.json(await resp.json());
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch price" },
      { status: 500 }
    );
  }
}
