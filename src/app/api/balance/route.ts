import { NextResponse } from "next/server";

const NEXOW_API_URL = process.env.NEXOW_API_URL || "http://localhost:8000";

export async function GET() {
  try {
    const resp = await fetch(`${NEXOW_API_URL}/api/data/balance`, {
      cache: "no-store",
    });

    if (!resp.ok) {
      const text = await resp.text();
      return NextResponse.json(
        { error: text || `Backend returned ${resp.status}` },
        { status: resp.status },
      );
    }

    return NextResponse.json(await resp.json());
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch balance" },
      { status: 500 },
    );
  }
}
