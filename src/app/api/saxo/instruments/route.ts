import { NextRequest, NextResponse } from "next/server";

const NEXOW_API_URL = process.env.NEXOW_API_URL || "http://localhost:8000";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const assetTypes = searchParams.get("assetTypes");
  const keywords = searchParams.get("keywords");
  const exchangeId = searchParams.get("exchangeId");
  const top = searchParams.get("top");
  const skip = searchParams.get("skip");

  const params = new URLSearchParams();
  if (assetTypes) params.set("assetTypes", assetTypes);
  if (keywords) params.set("keywords", keywords);
  if (exchangeId) params.set("exchangeId", exchangeId);
  if (top) params.set("top", top);
  if (skip) params.set("skip", skip);

  const qs = params.toString();
  const url = `${NEXOW_API_URL}/saxo/instruments${qs ? `?${qs}` : ""}`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: data.detail ?? "Failed to load instruments" },
        { status: res.status }
      );
    }
    return NextResponse.json(data);
  } catch (e) {
    console.error("Saxo instruments error:", e);
    return NextResponse.json(
      { error: "Could not reach Nexow API" },
      { status: 502 }
    );
  }
}
