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

const PAGE_SIZE = 300;

// Use Saxo API AssetType values so requests succeed; backend also maps some legacy values.
const SAXO_ASSET_TYPES = [
  { value: "", label: "All" },
  { value: "_crypto", label: "Crypto", keywords: "BTC" },
  { value: "FxSpot", label: "Forex" },
  { value: "Stock", label: "Stocks" },
  { value: "CfdOnStock", label: "CFD Stocks" },
  { value: "CfdOnIndex", label: "CFD Indices" },
  { value: "CfdOnFutures", label: "CFD Futures" },
  { value: "ContractFutures", label: "Futures" },
  { value: "FxForwards", label: "Forwards" },
  { value: "CfdOnEtf", label: "CFD ETF" },
  { value: "CfdOnFund", label: "CFD Fund" },
  { value: "Option", label: "Options" },
  { value: "Bond", label: "Bonds" },
  { value: "Fund", label: "Funds" },
  { value: "Etf", label: "ETF" },
  { value: "Etc", label: "ETC" },
  { value: "Etn", label: "ETN" },
  { value: "Rights", label: "Rights" },
  { value: "Warrant", label: "Warrants" },
] as const;

interface SaxoInstrument {
  Uic?: number;
  AssetType?: string;
  Symbol?: string;
  Description?: string;
  ExchangeId?: string;
  Identifier?: string;
  [key: string]: unknown;
}

function buildInstrumentsUrl(params: {
  assetTypes?: string;
  keywords?: string;
  top: number;
  skip: number;
}): string {
  const sp = new URLSearchParams();
  sp.set("top", String(params.top));
  sp.set("skip", String(params.skip));
  if (params.assetTypes) sp.set("assetTypes", params.assetTypes);
  if (params.keywords?.trim()) sp.set("keywords", params.keywords.trim());
  return `/api/saxo/instruments?${sp.toString()}`;
}

function Row({ label, value }: { label: string; value?: string | number | null }) {
  if (value == null || value === "") return null;
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="font-medium tabular-nums text-zinc-200">{String(value)}</dd>
    </div>
  );
}

type BidAskPoint = { time: number; bid: number; ask: number };

function saxoTimestamp(s: string): number {
  return Math.floor(new Date(s).getTime() / 1000);
}

function ExpandedInstrumentContent({
  uic,
  assetType,
  name,
  onClose,
}: {
  uic: number;
  assetType: string;
  name: string;
  onClose: () => void;
}) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<ReturnType<typeof createChart> | null>(null);
  const cancelledRef = useRef(false);
  const [chartLoading, setChartLoading] = useState(true);
  const [chartError, setChartError] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, unknown> | null>(null);
  const [quote, setQuote] = useState<{ bid?: number; ask?: number; mid?: number; marketState?: string; lastUpdated?: string } | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(true);

  useEffect(() => {
    if (!uic || !assetType) return;
    let cancelled = false;
    setDetailsLoading(true);
    setDetails(null);
    setQuote(null);
    Promise.all([
      fetch(`/api/saxo/instrument-details?uic=${uic}&assetType=${encodeURIComponent(assetType)}`).then((r) => r.json()),
      fetch(`/api/saxo/quote?uic=${uic}&assetType=${encodeURIComponent(assetType)}`).then((r) => r.json()),
    ])
      .then(([detailsData, quoteData]) => {
        if (cancelled) return;
        if (detailsData && !detailsData.error) setDetails(detailsData);
        if (quoteData?.Quote) {
          const q = quoteData.Quote;
          setQuote({
            bid: q.Bid,
            ask: q.Ask,
            mid: q.Mid,
            marketState: quoteData.MarketState ?? quoteData.PriceSource,
            lastUpdated: quoteData.LastUpdated,
          });
        }
      })
      .catch(() => { if (!cancelled) setDetails(null); })
      .finally(() => { if (!cancelled) setDetailsLoading(false); });
    return () => { cancelled = true; };
  }, [uic, assetType]);

  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container || !uic || !assetType) return;

    cancelledRef.current = false;
    chartInstanceRef.current = null;
    let resizeCleanup: (() => void) | null = null;

    const load = async () => {
      setChartLoading(true);
      setChartError(null);
      try {
        const r = await fetch(
          `/api/saxo/charts?uic=${uic}&assetType=${encodeURIComponent(assetType)}&horizon=60&count=100`
        );
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? data.detail ?? "Failed to load chart");
        const raw = (data.data || data.Data || []) as Array<{
          Time?: string;
          CloseBid?: number;
          CloseAsk?: number;
        }>;
        const points: BidAskPoint[] = raw
          .filter((p) => p.Time && (p.CloseBid != null || p.CloseAsk != null))
          .map((p) => ({
            time: saxoTimestamp(p.Time!),
            bid: p.CloseBid ?? p.CloseAsk ?? 0,
            ask: p.CloseAsk ?? p.CloseBid ?? 0,
          }))
          .filter((p) => p.bid > 0 || p.ask > 0)
          .sort((a, b) => a.time - b.time);

        if (points.length === 0) {
          setChartError("No chart data");
          setChartLoading(false);
          return;
        }

        if (cancelledRef.current) return;

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
          width: container.clientWidth,
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

        const bidSeries = chart.addSeries(LineSeries, {
          color: "#10b981",
          lineWidth: 2,
          title: "Bid",
        });
        bidSeries.setData(
          points.map((p) => ({ time: p.time as Time, value: p.bid }))
        );

        const askSeries = chart.addSeries(LineSeries, {
          color: "#f59e0b",
          lineWidth: 2,
          title: "Ask",
        });
        askSeries.setData(
          points.map((p) => ({ time: p.time as Time, value: p.ask }))
        );

        chart.timeScale().fitContent();

        const ro = new ResizeObserver(() => {
          if (container && chartInstanceRef.current) {
            chartInstanceRef.current.applyOptions({ width: container.clientWidth });
          }
        });
        ro.observe(container);
        resizeCleanup = () => ro.disconnect();
      } catch (e) {
        if (!cancelledRef.current) {
          setChartError(e instanceof Error ? e.message : "Failed to load chart");
        }
      } finally {
        if (!cancelledRef.current) setChartLoading(false);
      }
    };

    load();
    return () => {
      cancelledRef.current = true;
      resizeCleanup?.();
      if (chartInstanceRef.current) {
        chartInstanceRef.current.remove();
        chartInstanceRef.current = null;
      }
      container.innerHTML = "";
    };
  }, [uic, assetType]);

  return (
    <div className="relative border-t border-zinc-800/50 bg-zinc-900/30">
      <div className="flex items-center justify-between px-4 py-2">
        <span className="text-sm font-medium text-zinc-300">{name}</span>
        <button type="button" onClick={onClose} className="text-xs text-zinc-500 hover:text-zinc-300">
          Close
        </button>
      </div>
      <div className="flex gap-4 px-4 pb-4">
        <div className="relative h-[320px] min-w-0 flex-1">
          <div ref={chartContainerRef} className="h-full w-full rounded-lg" />
          {chartLoading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-zinc-900/70">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
            </div>
          )}
          {chartError && !chartLoading && (
            <p className="py-4 text-center text-sm text-red-400">{chartError}</p>
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
                    Instrument
                  </div>
                  <dl className="space-y-2 rounded-lg bg-zinc-800/40 px-3 py-2.5">
                    <Row label="Type" value={assetType} />
                    <Row label="Uic" value={uic} />
                    {details && (
                      <>
                        <Row label="Currency" value={(details as { CurrencyCode?: string }).CurrencyCode} />
                        <Row label="Contract size" value={(details as { ContractSize?: number }).ContractSize} />
                        <Row label="Decimals" value={(details as { AmountDecimals?: number }).AmountDecimals} />
                      </>
                    )}
                  </dl>
                </section>
                {quote && (
                  <section>
                    <div className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-zinc-500">
                      <TrendingUp className="h-3.5 w-3.5" />
                      Quote
                    </div>
                    <dl className="space-y-2 rounded-lg bg-zinc-800/40 px-3 py-2.5">
                      {quote.bid != null && <Row label="Bid" value={quote.bid} />}
                      {quote.ask != null && <Row label="Ask" value={quote.ask} />}
                      {quote.mid != null && <Row label="Mid" value={quote.mid} />}
                      {quote.marketState && (
                        <div className="flex items-center justify-between gap-2">
                          <dt className="text-zinc-500">Status</dt>
                          <dd>
                            <Badge variant="default" className="text-[10px] capitalize">
                              {quote.marketState}
                            </Badge>
                          </dd>
                        </div>
                      )}
                      {quote.lastUpdated && (
                        <div className="flex items-center gap-1 pt-1.5 text-[10px] text-zinc-500">
                          <Clock className="h-3 w-3 shrink-0" />
                          {quote.lastUpdated}
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
  const [assetType, setAssetType] = useState("");
  const [keywords, setKeywords] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [instruments, setInstruments] = useState<SaxoInstrument[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [expandedInstrument, setExpandedInstrument] = useState<{
    uic: number;
    assetType: string;
    name: string;
  } | null>(null);

  const effectiveAssetType = assetType === "_crypto" ? undefined : assetType || undefined;
  const effectiveKeywords = assetType === "_crypto" ? "BTC" : keywords;

  const fetchInstruments = useCallback(
    async (nextSkip: number, append: boolean) => {
      setLoading(true);
      setError(null);
      try {
        const url = buildInstrumentsUrl({
          assetTypes: effectiveAssetType,
          keywords: effectiveKeywords || undefined,
          top: PAGE_SIZE,
          skip: nextSkip,
        });
        const res = await fetch(url, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error ?? data.detail ?? "Failed to load instruments");
        }
        const list = Array.isArray(data.instruments) ? data.instruments : [];
        setInstruments((prev) => (append ? [...prev, ...list] : list));
        setHasMore(list.length === PAGE_SIZE);
        setSkip(nextSkip);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load instruments");
        if (!append) setInstruments([]);
      } finally {
        setLoading(false);
      }
    },
    [effectiveAssetType, effectiveKeywords]
  );

  useEffect(() => {
    fetchInstruments(0, false);
  }, [assetType, keywords, fetchInstruments]);

  const handleSearch = () => {
    setKeywords(searchInput);
    setSkip(0);
  };

  const loadMore = () => {
    fetchInstruments(skip + PAGE_SIZE, true);
  };

  const reset = () => {
    setAssetType("");
    setKeywords("");
    setSearchInput("");
    setSkip(0);
    setExpandedInstrument(null);
    fetchInstruments(0, false);
  };

  const displayCount =
    instruments.length + (hasMore ? 1 : 0) > PAGE_SIZE
      ? `${instruments.length}+`
      : String(instruments.length);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Markets
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Saxo Bank instruments — browse by asset class or search. Crypto (BTC, ETH, LTC) is under Forex; use the Crypto filter or search for BTC, ETH, LTC.
          </p>
        </div>
        <Link
          href="/saxo"
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700/60 hover:text-white"
        >
          <Building2 className="h-4 w-4" />
          Saxo Connect
        </Link>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {SAXO_ASSET_TYPES.map(({ value, label }) => (
          <button
            key={value || "all"}
            onClick={() => {
              setAssetType(value);
              setSearchInput("");
              setKeywords("");
            }}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              assetType === value
                ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30"
                : "bg-zinc-800/60 text-zinc-400 hover:bg-zinc-700/60 hover:text-zinc-200"
            }`}
          >
            {label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <Input
            placeholder="Search (e.g. EUR, Apple, Gold)"
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
          {loading && instruments.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
            </div>
          ) : instruments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <BarChart3 className="h-12 w-12 text-zinc-600" />
              <p className="mt-3 text-sm text-zinc-500">
                Select an asset class above or search to view Saxo instruments
              </p>
              <p className="mt-1 text-xs text-zinc-600">
                Make sure Saxo is connected (Saxo Connect in the sidebar).
              </p>
            </div>
          ) : (
            <>
              <div className="border-b border-zinc-800/60 px-4 py-2 text-xs text-zinc-500">
                Showing {displayCount} instruments
                {assetType && ` · ${SAXO_ASSET_TYPES.find((a) => a.value === assetType)?.label ?? assetType}`}
                {keywords && assetType !== "_crypto" && ` · Search: "${keywords}"`}
                {assetType === "_crypto" && " · Crypto (BTC pairs; search ETH or LTC for more)"}
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10" />
                    <TableHead>Symbol</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Asset type</TableHead>
                    <TableHead>Exchange</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {instruments.map((inst, idx) => {
                    const rawUic = inst.Identifier ?? inst.Uic;
                    const uicNum =
                      typeof rawUic === "number" ? rawUic : Number(rawUic) || idx;
                    const uic = rawUic ?? idx;
                    const symbol = inst.Symbol ?? inst.Identifier ?? "—";
                    const desc = inst.Description ?? "—";
                    const type = inst.AssetType ?? "FxSpot";
                    const exchange = inst.ExchangeId ?? "—";
                    const rowKey = `${uic}-${type}-${idx}`;
                    const isExpanded = expandedInstrument?.uic === uicNum && expandedInstrument?.assetType === type;

                    return (
                      <Fragment key={rowKey}>
                        <TableRow
                          className="cursor-pointer hover:bg-zinc-800/40"
                          onClick={() =>
                            setExpandedInstrument(
                              isExpanded
                                ? null
                                : { uic: uicNum, assetType: type, name: `${symbol} — ${desc}` }
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
                            {desc}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="default"
                              className="text-[10px] font-medium text-zinc-400"
                            >
                              {type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-zinc-500">{exchange}</TableCell>
                        </TableRow>
                        {isExpanded && expandedInstrument && (
                          <TableRow className="hover:bg-transparent">
                            <TableCell colSpan={5} className="p-0">
                              <ExpandedInstrumentContent
                                uic={expandedInstrument.uic}
                                assetType={expandedInstrument.assetType}
                                name={expandedInstrument.name}
                                onClose={() => setExpandedInstrument(null)}
                              />
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
              {hasMore && (
                <div className="flex justify-center border-t border-zinc-800/60 py-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={loadMore}
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Load more
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
