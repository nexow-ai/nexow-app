"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  Loader2,
  Search,
  RefreshCw,
  Building2,
  ChevronRight,
  ChevronDown,
  Package,
  TrendingUp,
  Clock,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, Fragment } from "react";
import Link from "next/link";
import {
  createChart,
  ColorType,
  LineSeries,
  type Time,
} from "lightweight-charts";

const PAGE_SIZE = 1000;

const ASSET_CLASSES = [
  { value: "", label: "All", description: "All asset classes" },
  { value: "stock", label: "Stocks", description: "US stocks" },
  { value: "etf", label: "ETFs", description: "US ETFs" },
  { value: "us_option", label: "Options", description: "US options" },
  { value: "crypto", label: "Crypto", description: "Cryptocurrencies" },
  { value: "fixed_income", label: "Fixed Income", description: "Corp bonds & T-Bills" },
] as const;

const ETF_EXCHANGES = ["NYSEARCA", "ARCA"];
function isEtfExchange(exchange: string | undefined): boolean {
  const ex = (exchange ?? "").toUpperCase();
  return ETF_EXCHANGES.some((e) => ex === e);
}

interface AlpacaAsset {
  id?: string;
  class?: string;
  exchange?: string;
  symbol: string;
  name: string;
  status?: string;
  tradable?: boolean;
  marginable?: boolean;
  shortable?: boolean;
  fractionable?: boolean;
  [key: string]: unknown;
}

function buildAssetsUrl(params: {
  assetClass?: string;
  search?: string;
  limit?: number;
}): string {
  const sp = new URLSearchParams();
  sp.set("status", "active");
  if (params.assetClass) sp.set("asset_class", params.assetClass);
  if (params.search?.trim()) sp.set("search", params.search.trim());
  sp.set("limit", String(params.limit ?? PAGE_SIZE));
  return `/api/alpaca/assets?${sp.toString()}`;
}

function assetClassLabel(
  value: string,
  asset?: { exchange?: string }
): string {
  const found = ASSET_CLASSES.find((c) => c.value === value);
  if (found) return found.label;
  if (value === "us_equity" && asset)
    return isEtfExchange(asset.exchange) ? "ETF" : "Stock";
  if (value === "us_equity") return "Stocks & ETFs";
  if (value === "fixed_income") return "Fixed Income";
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function Row({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  if (value == null || value === "") return null;
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="font-medium tabular-nums text-zinc-200">
        {String(value)}
      </dd>
    </div>
  );
}

function barTimestamp(s: string): number {
  return Math.floor(new Date(s).getTime() / 1000);
}

function ExpandedInstrumentContent({
  symbol,
  name,
  assetClass,
  onClose,
}: {
  symbol: string;
  name: string;
  assetClass?: string;
  onClose: () => void;
}) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<ReturnType<typeof createChart> | null>(null);
  const cancelledRef = useRef(false);
  const [chartLoading, setChartLoading] = useState(true);
  const [chartError, setChartError] = useState<string | null>(null);
  const [chartUnsupported, setChartUnsupported] = useState(false);
  const [details, setDetails] = useState<AlpacaAsset | null>(null);
  const [quote, setQuote] = useState<{
    bid?: number | null;
    ask?: number | null;
    timestamp?: string | null;
  } | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(true);

  const supportsChart =
    !assetClass ||
    assetClass === "us_equity" ||
    assetClass === "stock" ||
    assetClass === "etf" ||
    assetClass === "crypto";

  useEffect(() => {
    if (!symbol) return;
    let cancelled = false;
    setDetailsLoading(true);
    setDetails(null);
    setQuote(null);
    Promise.all([
      fetch(`/api/alpaca/assets/${encodeURIComponent(symbol)}`).then((r) =>
        r.json()
      ),
      fetch(`/api/alpaca/quote?symbol=${encodeURIComponent(symbol)}`).then((r) =>
        r.json()
      ),
    ])
      .then(([detailsData, quoteData]) => {
        if (cancelled) return;
        if (detailsData && !detailsData.error) setDetails(detailsData);
        if (quoteData && !quoteData.error)
          setQuote({
            bid: quoteData.bid,
            ask: quoteData.ask,
            timestamp: quoteData.timestamp,
          });
      })
      .catch(() => {
        if (!cancelled) setDetails(null);
      })
      .finally(() => {
        if (!cancelled) setDetailsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  useEffect(() => {
    if (!supportsChart) {
      setChartLoading(false);
      setChartUnsupported(true);
      setChartError(null);
      return;
    }
    setChartUnsupported(false);

    const container = chartContainerRef.current;
    if (!container || !symbol) return;

    cancelledRef.current = false;
    chartInstanceRef.current = null;
    let resizeCleanup: (() => void) | null = null;

    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 5);
    const startStr = start.toISOString().split("T")[0];
    const endStr = end.toISOString().split("T")[0];
    const isCrypto = assetClass === "crypto";
    const barsUrl = isCrypto
      ? `/api/alpaca/crypto-bars?symbol=${encodeURIComponent(symbol)}&timeframe=1Hour&start=${startStr}&end=${endStr}&limit=100`
      : `/api/alpaca/bars?symbol=${encodeURIComponent(symbol)}&timeframe=1Hour&start=${startStr}&end=${endStr}&limit=100`;

    const buildChart = (points: { time: number; value: number }[]): (() => void) | void => {
      if (cancelledRef.current || points.length === 0) return;
      const w = Math.max(container.clientWidth || 400, 400);
      container.innerHTML = "";
      const chart = createChart(container, {
        layout: {
          background: { type: ColorType.Solid, color: "transparent" },
          textColor: "#a1a1aa",
          fontFamily: "inherit",
        },
        grid: {
          vertLines: { color: "rgba(255,255,255,0.06)" },
          horzLines: { color: "rgba(255,255,255,0.06)" },
        },
        width: w,
        height: 330,
        timeScale: {
          borderColor: "rgba(255,255,255,0.12)",
          timeVisible: true,
          secondsVisible: false,
        },
        rightPriceScale: {
          borderColor: "rgba(255,255,255,0.12)",
          scaleMargins: { top: 0.1, bottom: 0.2 },
        },
      });
      chartInstanceRef.current = chart;
      const series = chart.addSeries(LineSeries, {
        color: "#10b981",
        lineWidth: 2,
        title: "Close",
      });
      series.setData(
        points.map((p) => ({ time: p.time as Time, value: p.value }))
      );
      chart.timeScale().fitContent();
      const ro = new ResizeObserver(() => {
        if (container && chartInstanceRef.current && container.clientWidth > 0) {
          chartInstanceRef.current.applyOptions({
            width: container.clientWidth,
          });
        }
      });
      ro.observe(container);
      return () => ro.disconnect();
    };

    const load = async () => {
      setChartLoading(true);
      setChartError(null);
      try {
        const r = await fetch(barsUrl);
        const data = await r.json();
        if (!r.ok)
          throw new Error(data.error ?? data.detail ?? "Failed to load chart");
        const bars = (data.bars ?? []) as Array<{
          t?: string;
          c?: number;
          o?: number;
        }>;
        const points = bars
          .filter((p) => p.t && (p.c != null || p.o != null))
          .map((p) => ({
            time: barTimestamp(p.t!),
            value: p.c ?? p.o ?? 0,
          }))
          .filter((p) => p.value > 0)
          .sort((a, b) => a.time - b.time);

        if (cancelledRef.current) return;
        if (points.length === 0) {
          setChartError("No chart data");
          setChartLoading(false);
          return;
        }

        if (container.clientWidth > 0) {
          resizeCleanup = buildChart(points) ?? null;
        } else {
          const ro = new ResizeObserver(() => {
            if (container.clientWidth > 0 && chartInstanceRef.current === null && !cancelledRef.current) {
              resizeCleanup = buildChart(points) ?? null;
            }
          });
          ro.observe(container);
          resizeCleanup = () => ro.disconnect();
          requestAnimationFrame(() => {
            if (container.clientWidth > 0 && !cancelledRef.current && chartInstanceRef.current === null) {
              resizeCleanup = buildChart(points) ?? null;
            }
          });
        }
      } catch (e) {
        if (!cancelledRef.current) {
          setChartError(
            e instanceof Error ? e.message : "Failed to load chart"
          );
        }
      } finally {
        if (!cancelledRef.current) setChartLoading(false);
      }
    };

    const t = setTimeout(load, 50);
    return () => {
      clearTimeout(t);
      cancelledRef.current = true;
      resizeCleanup?.();
      if (chartInstanceRef.current) {
        chartInstanceRef.current.remove();
        chartInstanceRef.current = null;
      }
      container.innerHTML = "";
    };
  }, [symbol, assetClass, supportsChart]);

  return (
    <div className="relative border-t border-zinc-800/50 bg-zinc-900/30">
      <div className="flex items-center justify-between px-4 py-2">
        <span className="text-sm font-medium text-zinc-300">{name}</span>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-zinc-500 hover:text-zinc-300"
        >
          Close
        </button>
      </div>
      <div className="flex gap-4 px-4 pb-4">
        <div className="relative min-h-[330px] min-w-[400px] flex-1">
          <div
            ref={chartContainerRef}
            className="h-[330px] w-full min-w-[400px] rounded-lg"
            style={{ minHeight: 330 }}
          />
          {chartLoading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-zinc-900/70">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
            </div>
          )}
          {chartError && !chartLoading && !chartUnsupported && (
            <p className="py-4 text-center text-sm text-red-400">
              {chartError}
            </p>
          )}
          {chartUnsupported && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-zinc-900/30">
              <p className="text-sm text-zinc-500">
                Chart not available for this asset type
              </p>
            </div>
          )}
        </div>
        <div className="h-[320px] w-80 shrink-0 overflow-hidden rounded-xl border border-zinc-700/60 bg-gradient-to-b from-zinc-800/80 to-zinc-900/90 shadow-lg">
          <div className="h-full overflow-y-auto p-4">
            {detailsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
              </div>
            ) : (
              <div className="space-y-5 text-sm">
                <section>
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-zinc-500">
                    <Package className="h-3.5 w-3.5" />
                    Asset
                  </div>
                  <dl className="space-y-2 rounded-lg bg-zinc-800/40 px-3 py-2.5">
                    <Row label="Symbol" value={details?.symbol} />
                    <Row label="Exchange" value={details?.exchange} />
                    <Row label="Class" value={details?.class} />
                    <Row label="Tradable" value={details?.tradable ? "Yes" : "No"} />
                    <Row label="Fractionable" value={details?.fractionable ? "Yes" : "No"} />
                  </dl>
                </section>
                {quote && (
                  <section>
                    <div className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-zinc-500">
                      <TrendingUp className="h-3.5 w-3.5" />
                      Quote
                    </div>
                    <dl className="space-y-2 rounded-lg bg-zinc-800/40 px-3 py-2.5">
                      {quote.bid != null && (
                        <Row label="Bid" value={quote.bid} />
                      )}
                      {quote.ask != null && (
                        <Row label="Ask" value={quote.ask} />
                      )}
                      {quote.timestamp && (
                        <div className="flex items-center gap-1 pt-1.5 text-[10px] text-zinc-500">
                          <Clock className="h-3 w-3 shrink-0" />
                          {quote.timestamp}
                        </div>
                      )}
                    </dl>
                  </section>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MarketsPage() {
  const [assetClass, setAssetClass] = useState<string>("");
  const [keywords, setKeywords] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [assets, setAssets] = useState<AlpacaAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedAsset, setExpandedAsset] = useState<{
    symbol: string;
    name: string;
  } | null>(null);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = buildAssetsUrl({
        assetClass: assetClass || undefined,
        search: keywords || undefined,
        limit: PAGE_SIZE,
      });
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error ?? data.detail ?? "Failed to load assets"
        );
      }
      setAssets(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load assets");
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, [assetClass, keywords]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const handleSearch = () => {
    setKeywords(searchInput);
  };

  const reset = () => {
    setAssetClass("");
    setKeywords("");
    setSearchInput("");
    setExpandedAsset(null);
    fetchAssets();
  };

  const displayCount = assets.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Markets
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Browse stocks, ETFs, options, crypto, and fixed income via Alpaca.
            Search by symbol or name. Connect a trading account in Trading to place orders.
          </p>
        </div>
        <Link
          href="/trading"
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700/60 hover:text-white"
        >
          <Building2 className="h-4 w-4" />
          Trading
        </Link>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {ASSET_CLASSES.map(({ value, label }) => (
            <button
              key={value || "all"}
              type="button"
              onClick={() => {
                setAssetClass(value);
                setSearchInput("");
                setKeywords("");
              }}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                assetClass === value
                  ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30"
                  : "bg-zinc-800/60 text-zinc-400 hover:bg-zinc-700/60 hover:text-zinc-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search (e.g. AAPL, Bitcoin)"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="h-9 w-48"
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleSearch}
            disabled={loading}
            className="h-9"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            <span className="ml-1.5">Search</span>
          </Button>
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg text-zinc-500 hover:text-zinc-300"
          >
            <RefreshCw className="h-4 w-4" />
            Reset
          </button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading && assets.length === 0 ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
            </div>
          ) : assets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <BarChart3 className="h-12 w-12 text-zinc-600" />
              <p className="mt-3 text-sm text-zinc-500">
                Select an asset class above or search to view markets
              </p>
              <p className="mt-1 text-xs text-zinc-600">
                Alpaca API keys must be configured for market data.
              </p>
            </div>
          ) : (
            <>
              <div className="border-b border-zinc-800/60 px-4 py-2 text-xs text-zinc-500">
                Showing {displayCount} assets
                {assetClass && ` · ${assetClassLabel(assetClass)}`}
                {keywords && ` · Search: "${keywords}"`}
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10" />
                    <TableHead>Symbol</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Exchange</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assets.map((asset, idx) => {
                    const symbol = asset.symbol ?? "—";
                    const name = asset.name ?? "—";
                    const classVal = asset.class ?? "—";
                    const exchange = asset.exchange ?? "—";
                    const status = asset.status ?? "—";
                    const isExpanded =
                      expandedAsset?.symbol === symbol;

                    return (
                      <Fragment key={asset.id ?? `${symbol}-${classVal}-${idx}`}>
                        <TableRow
                          className="cursor-pointer hover:bg-zinc-800/40"
                          onClick={() =>
                            setExpandedAsset(
                              isExpanded
                                ? null
                                : { symbol, name: `${symbol} — ${name}` }
                            )
                          }
                        >
                          <TableCell className="w-10">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-zinc-500" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-zinc-500" />
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-zinc-300">
                            {symbol}
                          </TableCell>
                          <TableCell className="max-w-md truncate font-medium text-white">
                            {name}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="info"
                              className="text-[10px] font-medium text-zinc-400"
                            >
                              {assetClassLabel(classVal, asset)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-zinc-500">
                            {exchange}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="default"
                              className="text-[10px] font-medium text-zinc-400 capitalize"
                            >
                              {status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                        {isExpanded && expandedAsset && (
                          <TableRow className="hover:bg-transparent">
                            <TableCell colSpan={6} className="p-0">
                              <ExpandedInstrumentContent
                                symbol={expandedAsset.symbol}
                                name={expandedAsset.name}
                                assetClass={classVal === "—" ? undefined : classVal}
                                onClose={() => setExpandedAsset(null)}
                              />
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
