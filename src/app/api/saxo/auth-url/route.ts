import { NextRequest, NextResponse } from "next/server";

const NEXOW_API_URL = process.env.NEXOW_API_URL || "http://localhost:8000";

export async function GET(request: NextRequest) {
  const state = request.nextUrl.searchParams.get("state");
  if (!state) {
    return NextResponse.json(
      { error: "Missing state parameter" },
      { status: 400 }
    );
  }
  const label =
    request.nextUrl.searchParams.get("label") ||
    process.env.NEXT_PUBLIC_SAXO_REDIRECT_LABEL;
  const params = new URLSearchParams({ state });
  if (label) params.set("label", label);
  try {
    const res = await fetch(
      `${NEXOW_API_URL}/saxo/auth/url?${params.toString()}`,
      { cache: "no-store" }
    );
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: data.detail ?? "Failed to get auth URL" },
        { status: res.status }
      );
    }
    return NextResponse.json(data);
  } catch (e) {
    console.error("Saxo auth URL error:", e);
    return NextResponse.json(
      { error: "Could not reach Nexow API" },
      { status: 502 }
    );
  }
}
