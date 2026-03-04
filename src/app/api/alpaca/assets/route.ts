import { NextRequest, NextResponse } from "next/server";
import {
  alpacaFetch,
  getBrokerApiUrl,
  getPaperApiUrl,
  hasAlpacaConfig,
  hasBrokerConfig,
} from "@/lib/alpaca";

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
  const assetClassParam = searchParams.get("asset_class") ?? "";
  const limit = searchParams.get("limit");
  const search = searchParams.get("search") ?? "";

  const path = hasBrokerConfig() ? "/v1/assets" : "/v2/assets";
  const ETF_EXCHANGES = ["NYSEARCA", "ARCA"];
  const isStockOrEtf =
    assetClassParam === "stock" || assetClassParam === "etf";

  const assetClassesToFetch =
    assetClassParam === "all" || assetClassParam === ""
      ? ["us_equity", "us_option", "crypto", "fixed_income"]
      : isStockOrEtf
        ? ["us_equity"]
        : [assetClassParam];

  try {
    const allResults: unknown[] = [];
    for (const ac of assetClassesToFetch) {
      const params = new URLSearchParams();
      params.set("status", status);
      params.set("asset_class", ac);
      const url = hasBrokerConfig()
        ? getBrokerApiUrl(path, params.toString())
        : getPaperApiUrl(path, params.toString());
      const res = await alpacaFetch(url, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        return NextResponse.json(
          {
            error:
              (data as { message?: string }).message ?? "Failed to load assets",
          },
          { status: res.status }
        );
      }
      let list = Array.isArray(data) ? data : [];
      if (isStockOrEtf && ac === "us_equity") {
        list = list.filter((a: { exchange?: string }) => {
          const ex = (a.exchange ?? "").toUpperCase();
          const isEtf = ETF_EXCHANGES.some((e) => ex === e);
          return assetClassParam === "etf" ? isEtf : !isEtf;
        });
      }
      allResults.push(...list);
    }
    let list = allResults as {
      symbol?: string;
      name?: string;
      class?: string;
      exchange?: string;
    }[];
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (a) =>
          (a.symbol && a.symbol.toLowerCase().includes(q)) ||
          (a.name && a.name.toLowerCase().includes(q))
      );
    }
    const max = limit ? Math.min(Number(limit), 2000) : 1000;
    return NextResponse.json(list.slice(0, max));
  } catch (e) {
    console.error("Alpaca assets error:", e);
    return NextResponse.json(
      { error: "Could not reach Alpaca" },
      { status: 502 }
    );
  }
}
