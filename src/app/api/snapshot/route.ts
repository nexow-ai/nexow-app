import { NextRequest, NextResponse } from "next/server";

const NEXOW_API_URL = process.env.NEXOW_API_URL || "http://localhost:8000";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const instrument = searchParams.get("instrument") || "EUR_USD";

  try {
    const resp = await fetch(
      `${NEXOW_API_URL}/api/data/snapshot/${instrument}`,
      { cache: "no-store" }
    );

    if (!resp.ok) {
      const data = await resp.json().catch(() => ({}));
      return NextResponse.json(
        { detail: data.detail || `Backend returned ${resp.status}` },
        { status: resp.status }
      );
    }

    return NextResponse.json(await resp.json());
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Failed to fetch snapshot" },
      { status: 500 }
    );
  }
}
