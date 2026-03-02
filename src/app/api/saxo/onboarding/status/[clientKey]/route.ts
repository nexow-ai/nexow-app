import { NextResponse } from "next/server";

const NEXOW_API_URL = process.env.NEXOW_API_URL || "http://localhost:8000";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ clientKey: string }> }
) {
  const { clientKey } = await params;
  if (!clientKey) {
    return NextResponse.json(
      { error: "Missing clientKey" },
      { status: 400 }
    );
  }
  try {
    const res = await fetch(
      `${NEXOW_API_URL}/saxo/onboarding/status/${encodeURIComponent(clientKey)}`,
      { cache: "no-store" }
    );
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: data.detail ?? "Failed to load status" },
        { status: res.status }
      );
    }
    return NextResponse.json(data);
  } catch (e) {
    console.error("Saxo onboarding status error:", e);
    return NextResponse.json(
      { error: "Could not reach Nexow API" },
      { status: 502 }
    );
  }
}
