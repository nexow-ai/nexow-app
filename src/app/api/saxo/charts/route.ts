import { NextRequest, NextResponse } from "next/server";

const NEXOW_API_URL = process.env.NEXOW_API_URL || "http://localhost:8000";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const uic = searchParams.get("uic");
  const assetType = searchParams.get("assetType");
  const horizon = searchParams.get("horizon");
  const count = searchParams.get("count");

  if (!uic || !assetType) {
    return NextResponse.json(
      { error: "uic and assetType are required" },
      { status: 400 }
    );
  }

  const params = new URLSearchParams({ Uic: uic, AssetType: assetType });
  if (horizon) params.set("Horizon", horizon);
  if (count) params.set("count", count);

  const url = `${NEXOW_API_URL}/saxo/charts?${params.toString()}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: data.detail ?? "Failed to load chart" },
        { status: res.status }
      );
    }
    return NextResponse.json(data);
  } catch (e) {
    console.error("Saxo charts error:", e);
    return NextResponse.json(
      { error: "Could not reach Nexow API" },
      { status: 502 }
    );
  }
}
