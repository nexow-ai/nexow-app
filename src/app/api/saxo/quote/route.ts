import { NextRequest, NextResponse } from "next/server";

const NEXOW_API_URL = process.env.NEXOW_API_URL || "http://localhost:8000";

export async function GET(request: NextRequest) {
  const uic = request.nextUrl.searchParams.get("uic");
  const assetType = request.nextUrl.searchParams.get("assetType");
  if (!uic || !assetType) {
    return NextResponse.json(
      { error: "uic and assetType are required" },
      { status: 400 }
    );
  }

  const url = `${NEXOW_API_URL}/saxo/infoprices?Uic=${uic}&AssetType=${encodeURIComponent(assetType)}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: data.detail ?? "Failed to load price" },
        { status: res.status }
      );
    }
    return NextResponse.json(data);
  } catch (e) {
    console.error("Saxo quote error:", e);
    return NextResponse.json(
      { error: "Could not reach Nexow API" },
      { status: 502 }
    );
  }
}
