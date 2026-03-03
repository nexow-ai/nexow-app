import { NextRequest, NextResponse } from "next/server";
import { alpacaFetch, getPaperApiUrl, hasAlpacaConfig } from "@/lib/alpaca";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!hasAlpacaConfig()) {
    return NextResponse.json(
      { error: "Alpaca is not configured" },
      { status: 503 }
    );
  }
  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status") ?? "active";
  const assetClass = searchParams.get("asset_class") ?? "us_equity";
  const limit = searchParams.get("limit");
  const search = searchParams.get("search") ?? "";

  const params = new URLSearchParams();
  params.set("status", status);
  params.set("asset_class", assetClass);

  const url = getPaperApiUrl("/v2/assets", params.toString());
  try {
    const res = await alpacaFetch(url, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: (data as { message?: string }).message ?? "Failed to load assets" },
        { status: res.status }
      );
    }
    let list = Array.isArray(data) ? data : [];
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (a: { symbol?: string; name?: string }) =>
          (a.symbol && a.symbol.toLowerCase().includes(q)) ||
          (a.name && a.name.toLowerCase().includes(q))
      );
    }
    const max = limit ? Math.min(Number(limit), 1000) : 500;
    return NextResponse.json(list.slice(0, max));
  } catch (e) {
    console.error("Alpaca assets error:", e);
    return NextResponse.json(
      { error: "Could not reach Alpaca" },
      { status: 502 }
    );
  }
}
