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
import {
  BarChart3,
  Loader2,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Package,
  Ruler,
  Percent,
  TrendingUp,
  Clock,
} from "lucide-react";
import { useEffect, useState, useCallback, useRef, Fragment } from "react";
import {
  createChart,
  ColorType,
  CandlestickSeries,
  type Time,
} from "lightweight-charts";

const NEXOW_API_BASE =
  typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_NEXOW_API_URL || "http://localhost:8000"
    : process.env.NEXT_PUBLIC_NEXOW_API_URL || "http://localhost:8000";

async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number } = {}
): Promise<Response> {
  const { timeout = 15000, ...rest } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  const r = await fetch(url, { ...rest, signal: controller.signal });
  clearTimeout(id);
  return r;
}

interface IGCategory {
  code: string;
  nonTradeable?: boolean;
}

interface IGInstrument {
  epic: string;
  instrumentName: string;
  instrumentType?: string;
  marketStatus?: string;
  bid?: number;
  offer?: number;
  high?: number;
  low?: number;
  netChange?: number;
  percentageChange?: number;
  updateTime?: string;
}

interface IGMarket {
  epic?: string;
  instrument?: { epic?: string; name?: string; type?: string };
  snapshot?: {
    bid?: number;
    offer?: number;
    ask?: number;
    high?: number;
    low?: number;
    netChange?: number;
    percentageChange?: number;
    marketStatus?: string;
    updateTime?: string;
  };
}

type PricePoint = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

function parseIGTime(s: string): number {
  const d = new Date(s);
  return Math.floor(d.getTime() / 1000);
}

function mid(p?: { bid?: number; ask?: number; lastTraded?: number }): number {
  if (!p) return 0;
  if (p.bid != null && p.ask != null) return (p.bid + p.ask) / 2;
  if (p.lastTraded != null) return p.lastTraded;
  return p.bid ?? p.ask ?? 0;
}

function dealValue(obj: { value?: number; unit?: string } | undefined): string {
  if (!obj || obj.value == null) return "—";
  const u = (obj.unit || "").toLowerCase();
  if (u === "percentage") return `${obj.value}%`;
  return String(obj.value);
}

function formatNum(n: number): string {
  if (Number.isInteger(n)) return String(n);
  const s = n.toPrecision(6);
  return parseFloat(s).toString();
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (value == null || value === "") return null;
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="font-medium tabular-nums text-zinc-200">{value}</dd>
    </div>
  );
}

function ExpandedInstrumentContent({
  epic,
  name,
  onClose,
}: {
  epic: string;
  name: string;
  onClose: () => void;
}) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<ReturnType<typeof createChart> | null>(null);
  const cancelledRef = useRef(false);
  const [chartLoading, setChartLoading] = useState(true);
  const [chartError, setChartError] = useState<string | null>(null);
  const [marketInfo, setMarketInfo] = useState<{
    minDealSize?: { value?: number; unit?: string };
    maxStopOrLimitDistance?: { value?: number; unit?: string };
    minStopOrLimitDistance?: { value?: number; unit?: string };
    minStepDistance?: { value?: number; unit?: string };
    marginFactor?: number;
    lotSize?: number;
    contractSize?: string;
    instrumentType?: string;
    currency?: string;
    expiry?: string;
    valueOfOnePip?: string;
    unit?: string;
    streamingPricesAvailable?: boolean;
    trailingStopsPreference?: string;
    snapshot?: {
      bid?: number;
      offer?: number;
      high?: number;
      low?: number;
      netChange?: number;
      percentageChange?: number;
      marketStatus?: string;
      updateTime?: string;
    };
  } | null>(null);
  const [infoLoading, setInfoLoading] = useState(true);

  useEffect(() => {
    if (!epic) return;
    let cancelled = false;
    setInfoLoading(true);
    setMarketInfo(null);
    fetchWithTimeout(
      `${NEXOW_API_BASE}/api/markets/${encodeURIComponent(epic)}`,
      {
        cache: "no-store",
      }
    )
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const inst = data?.instrument ?? {};
        const rules = data?.dealingRules ?? {};
        const snap = data?.snapshot ?? {};
        const bid = snap?.bid != null ? Number(snap.bid) : undefined;
        const offer =
          (snap?.offer ?? snap?.ask) != null
            ? Number(snap?.offer ?? snap?.ask)
            : undefined;
        const high = snap?.high != null ? Number(snap.high) : undefined;
        const low = snap?.low != null ? Number(snap.low) : undefined;
        const netChange =
          snap?.netChange != null ? Number(snap.netChange) : undefined;
        const pct =
          snap?.percentageChange != null
            ? Number(snap.percentageChange)
            : undefined;
        setMarketInfo({
          minDealSize: rules?.minDealSize,
          maxStopOrLimitDistance: rules?.maxStopOrLimitDistance,
          minStopOrLimitDistance:
            rules?.minNormalStopOrLimitDistance ??
            rules?.minStopOrLimitDistance,
          minStepDistance: rules?.minStepDistance,
          marginFactor: inst?.marginFactor,
          lotSize: inst?.lotSize,
          contractSize: inst?.contractSize,
          instrumentType: inst?.type,
          currency: inst?.currencies?.[0]?.code ?? inst?.currency,
          expiry: inst?.expiry,
          valueOfOnePip: inst?.valueOfOnePip,
          unit: inst?.unit,
          streamingPricesAvailable: inst?.streamingPricesAvailable,
          trailingStopsPreference: rules?.trailingStopsPreference,
          snapshot:
            bid !== undefined ||
            offer !== undefined ||
            high !== undefined ||
            low !== undefined ||
            netChange !== undefined ||
            pct !== undefined ||
            snap?.marketStatus
              ? {
                  bid,
                  offer,
                  high,
                  low,
                  netChange,
                  percentageChange: pct,
                  marketStatus: snap?.marketStatus,
                  updateTime: snap?.updateTime,
                }
              : undefined,
        });
      })
      .catch(() => {
        if (!cancelled) setMarketInfo(null);
      })
      .finally(() => {
        if (!cancelled) setInfoLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [epic]);

  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container || !epic) return;

    cancelledRef.current = false;
    chartInstanceRef.current = null;
    let resizeCleanup: (() => void) | null = null;

    const load = async () => {
      setChartLoading(true);
      setChartError(null);
      try {
        const r = await fetchWithTimeout(
          `${NEXOW_API_BASE}/api/markets/prices/${encodeURIComponent(epic)}?resolution=MINUTE&num_points=100`,
          { cache: "no-store" }
        );
        const data = await r.json();
        if (!r.ok)
          throw new Error(data.detail || data.error || "Failed to load prices");

        if (cancelledRef.current) return;

        const raw = (data.prices || []) as Array<{
          snapshotTime?: string;
          openPrice?: { bid?: number; ask?: number; lastTraded?: number };
          closePrice?: { bid?: number; ask?: number; lastTraded?: number };
          highPrice?: { bid?: number; ask?: number; lastTraded?: number };
          lowPrice?: { bid?: number; ask?: number; lastTraded?: number };
        }>;

        const points: PricePoint[] = raw
          .filter((p) => p.snapshotTime)
          .map((p) => ({
            time: parseIGTime(p.snapshotTime!),
            open: mid(p.openPrice),
            high: mid(p.highPrice),
            low: mid(p.lowPrice),
            close: mid(p.closePrice),
          }))
          .filter((p) => p.close > 0)
          .sort((a, b) => a.time - b.time);

        if (points.length === 0) {
          setChartError("No price data");
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

        const series = chart.addSeries(CandlestickSeries, {
          upColor: "#10b981",
          downColor: "#ef4444",
          borderDownColor: "#ef4444",
          borderUpColor: "#10b981",
          wickDownColor: "#ef4444",
          wickUpColor: "#10b981",
        });

        series.setData(
          points.map((p) => ({
            time: p.time as Time,
            open: p.open,
            high: p.high,
            low: p.low,
            close: p.close,
          }))
        );

        chart.timeScale().fitContent();

        const ro = new ResizeObserver(() => {
          if (container && chartInstanceRef.current) {
            chartInstanceRef.current.applyOptions({
              width: container.clientWidth,
            });
          }
        });
        ro.observe(container);
        resizeCleanup = () => ro.disconnect();
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
  }, [epic]);

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
        <div className="relative h-[320px] min-w-0 flex-1">
          <div ref={chartContainerRef} className="h-full w-full rounded-lg" />
          {chartLoading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-zinc-900/70">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
            </div>
          )}
          {chartError && !chartLoading && (
            <p className="py-4 text-center text-sm text-red-400">
              {chartError}
            </p>
          )}
        </div>
        <div className="h-[320px] w-80 shrink-0 overflow-hidden rounded-xl border border-zinc-700/60 bg-gradient-to-b from-zinc-800/80 to-zinc-900/90 shadow-lg">
          <div className="h-full overflow-y-auto p-4">
            {infoLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
              </div>
            ) : marketInfo ? (
              <div className="space-y-5 text-sm">
                <section>
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-zinc-500">
                    <Package className="h-3.5 w-3.5" />
                    Instrument
                  </div>
                  <dl className="space-y-2 rounded-lg bg-zinc-800/40 px-3 py-2.5">
                    <Row label="Type" value={marketInfo.instrumentType} />
                    <Row label="Currency" value={marketInfo.currency} />
                    <Row label="Unit" value={marketInfo.unit} />
                    <Row
                      label="Lot size"
                      value={
                        marketInfo.lotSize != null
                          ? String(marketInfo.lotSize)
                          : undefined
                      }
                    />
                    <Row
                      label="Contract size"
                      value={marketInfo.contractSize}
                    />
                    {marketInfo.expiry && (
                      <Row label="Expiry" value={marketInfo.expiry} />
                    )}
                    <Row
                      label="Value of 1 pip"
                      value={marketInfo.valueOfOnePip}
                    />
                    <Row
                      label="Streaming"
                      value={
                        marketInfo.streamingPricesAvailable != null
                          ? marketInfo.streamingPricesAvailable
                            ? "Yes"
                            : "No"
                          : undefined
                      }
                    />
                  </dl>
                </section>
                <section>
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-zinc-500">
                    <Ruler className="h-3.5 w-3.5" />
                    Dealing rules
                  </div>
                  <dl className="space-y-2 rounded-lg bg-zinc-800/40 px-3 py-2.5">
                    <Row
                      label="Min trade"
                      value={dealValue(marketInfo.minDealSize)}
                    />
                    <Row
                      label="Min step"
                      value={dealValue(marketInfo.minStepDistance)}
                    />
                    <Row
                      label="Min stop/limit"
                      value={dealValue(marketInfo.minStopOrLimitDistance)}
                    />
                    <Row
                      label="Max stop/limit"
                      value={dealValue(marketInfo.maxStopOrLimitDistance)}
                    />
                    {marketInfo.trailingStopsPreference && (
                      <Row
                        label="Trailing stops"
                        value={marketInfo.trailingStopsPreference
                          .replace(/_/g, " ")
                          .toLowerCase()}
                      />
                    )}
                  </dl>
                </section>
                <section>
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-zinc-500">
                    <Percent className="h-3.5 w-3.5" />
                    Margin
                  </div>
                  <dl className="space-y-2 rounded-lg bg-zinc-800/40 px-3 py-2.5">
                    <Row
                      label="Margin factor"
                      value={
                        marketInfo.marginFactor != null
                          ? String(marketInfo.marginFactor)
                          : undefined
                      }
                    />
                  </dl>
                </section>
                {marketInfo.snapshot && (
                  <section>
                    <div className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-zinc-500">
                      <TrendingUp className="h-3.5 w-3.5" />
                      Live quote
                    </div>
                    <dl className="space-y-2 rounded-lg bg-zinc-800/40 px-3 py-2.5">
                      {marketInfo.snapshot.marketStatus && (
                        <div className="flex items-center justify-between gap-2 pb-1.5">
                          <dt className="text-zinc-500">Status</dt>
                          <dd>
                            <Badge
                              variant={
                                marketInfo.snapshot.marketStatus === "TRADEABLE"
                                  ? "success"
                                  : marketInfo.snapshot.marketStatus ===
                                        "CLOSED" ||
                                      marketInfo.snapshot.marketStatus ===
                                        "OFFLINE"
                                    ? "warning"
                                    : "default"
                              }
                              className="text-[10px] font-medium capitalize"
                            >
                              {marketInfo.snapshot.marketStatus
                                .replace(/_/g, " ")
                                .toLowerCase()}
                            </Badge>
                          </dd>
                        </div>
                      )}
                      {marketInfo.snapshot.bid != null && (
                        <Row
                          label="Bid"
                          value={formatNum(marketInfo.snapshot.bid)}
                        />
                      )}
                      {marketInfo.snapshot.offer != null && (
                        <Row
                          label="Offer"
                          value={formatNum(marketInfo.snapshot.offer)}
                        />
                      )}
                      {marketInfo.snapshot.high != null && (
                        <Row
                          label="Day high"
                          value={formatNum(marketInfo.snapshot.high)}
                        />
                      )}
                      {marketInfo.snapshot.low != null && (
                        <Row
                          label="Day low"
                          value={formatNum(marketInfo.snapshot.low)}
                        />
                      )}
                      {(marketInfo.snapshot.netChange != null ||
                        marketInfo.snapshot.percentageChange != null) && (
                        <div className="flex items-center gap-2 pt-1">
                          {marketInfo.snapshot.netChange != null && (
                            <span
                              className={
                                marketInfo.snapshot.netChange >= 0
                                  ? "text-emerald-400"
                                  : "text-red-400"
                              }
                            >
                              {marketInfo.snapshot.netChange >= 0 ? "+" : ""}
                              {formatNum(marketInfo.snapshot.netChange)}
                            </span>
                          )}
                          {marketInfo.snapshot.percentageChange != null && (
                            <span
                              className={
                                marketInfo.snapshot.percentageChange >= 0
                                  ? "text-emerald-400"
                                  : "text-red-400"
                              }
                            >
                              (
                              {marketInfo.snapshot.percentageChange >= 0
                                ? "+"
                                : ""}
                              {marketInfo.snapshot.percentageChange.toFixed(2)}
                              %)
                            </span>
                          )}
                        </div>
                      )}
                      {marketInfo.snapshot.updateTime && (
                        <div className="flex items-center gap-1 pt-1.5 text-[10px] text-zinc-500">
                          <Clock className="h-3 w-3 shrink-0" />
                          {marketInfo.snapshot.updateTime}
                        </div>
                      )}
                    </dl>
                  </section>
                )}
              </div>
            ) : (
              <p className="py-6 text-center text-xs text-zinc-500">
                No details
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

type DisplayItem = {
  epic: string;
  name: string;
  type: string;
  bid?: number;
  offer?: number;
  high?: number;
  low?: number;
  netChange?: number;
  percentageChange?: number;
  marketStatus?: string;
};

export default function MarketsPage() {
  const [categories, setCategories] = useState<IGCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [instruments, setInstruments] = useState<IGInstrument[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<IGMarket[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingInstruments, setLoadingInstruments] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiLimitExceeded, setApiLimitExceeded] = useState(false);
  const [expandedEpic, setExpandedEpic] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    setLoadingCategories(true);
    setError(null);
    setApiLimitExceeded(false);
    try {
      const r = await fetchWithTimeout(
        `${NEXOW_API_BASE}/api/markets/categories`,
        {
          cache: "no-store",
        }
      );
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (r.status === 403) setApiLimitExceeded(true);
        throw new Error(
          data.detail || data.error || "Failed to load categories"
        );
      }
      setCategories(data.categories || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load categories");
      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  const fetchInstruments = useCallback(async (categoryId: string) => {
    setLoadingInstruments(true);
    setError(null);
    setApiLimitExceeded(false);
    try {
      const r = await fetchWithTimeout(
        `${NEXOW_API_BASE}/api/markets/categories/${categoryId}/instruments`,
        { cache: "no-store" }
      );
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (r.status === 403) setApiLimitExceeded(true);
        throw new Error(
          data.detail || data.error || "Failed to load instruments"
        );
      }
      setInstruments(data.instruments || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load instruments");
      setInstruments([]);
    } finally {
      setLoadingInstruments(false);
    }
  }, []);

  const searchMarkets = useCallback(async (term: string) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }
    setLoadingSearch(true);
    setError(null);
    setApiLimitExceeded(false);
    try {
      const r = await fetchWithTimeout(
        `${NEXOW_API_BASE}/api/markets/search?searchTerm=${encodeURIComponent(term.trim())}`,
        { cache: "no-store" }
      );
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (r.status === 403) setApiLimitExceeded(true);
        throw new Error(data.detail || data.error || "Search failed");
      }
      setSearchResults(data.markets || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
      setSearchResults([]);
    } finally {
      setLoadingSearch(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    if (selectedCategory) {
      fetchInstruments(selectedCategory);
    } else {
      setInstruments([]);
    }
  }, [selectedCategory, fetchInstruments]);

  const handleSearch = () => {
    searchMarkets(searchTerm);
    setSelectedCategory(null);
  };

  const displayItems: DisplayItem[] =
    searchResults.length > 0
      ? searchResults.map((m) => ({
          epic: m.epic ?? m.instrument?.epic ?? "",
          name: m.instrument?.name ?? "",
          type: m.instrument?.type ?? "",
          bid: m.snapshot?.bid,
          offer: m.snapshot?.offer ?? m.snapshot?.ask,
          high: m.snapshot?.high,
          low: m.snapshot?.low,
          netChange: m.snapshot?.netChange,
          percentageChange: m.snapshot?.percentageChange,
          marketStatus: m.snapshot?.marketStatus,
        }))
      : instruments.map((i) => ({
          epic: i.epic,
          name: i.instrumentName,
          type: i.instrumentType ?? "",
          bid: i.bid,
          offer: i.offer,
          high: i.high,
          low: i.low,
          netChange: i.netChange,
          percentageChange: i.percentageChange,
          marketStatus: i.marketStatus,
        }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Markets
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Browse IG instruments by category or search for markets.
        </p>
      </div>

      {error && (
        <div
          className={
            apiLimitExceeded
              ? "rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200"
              : "rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
          }
        >
          {apiLimitExceeded ? (
            <>
              <strong>API allowance exceeded.</strong> The IG API has returned
              403 Forbidden. Try again later or check your account limits.
            </>
          ) : (
            error
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {loadingCategories ? (
          <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
        ) : (
          categories.map((cat) => (
            <button
              key={cat.code}
              onClick={() => {
                setSelectedCategory(cat.code);
                setSearchTerm("");
                setSearchResults([]);
              }}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                selectedCategory === cat.code && searchResults.length === 0
                  ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30"
                  : "bg-zinc-800/60 text-zinc-400 hover:bg-zinc-700/60 hover:text-zinc-200"
              }`}
            >
              {cat.code}
              {cat.nonTradeable && (
                <span className="ml-1.5 text-xs text-zinc-500">
                  (read-only)
                </span>
              )}
            </button>
          ))
        )}
        <div className="ml-auto flex items-center gap-2">
          <Input
            placeholder="Search (e.g. EUR, Gold)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="h-9 w-48"
          />
          <button
            onClick={handleSearch}
            disabled={loadingSearch}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 text-sm text-zinc-300 hover:bg-zinc-700/60 disabled:opacity-50"
          >
            {loadingSearch ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Search
          </button>
          <button
            onClick={() => {
              setSearchTerm("");
              setSearchResults([]);
              setSelectedCategory(null);
              setExpandedEpic(null);
              fetchCategories();
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg text-zinc-500 hover:text-zinc-300"
          >
            <RefreshCw className="h-4 w-4" />
            Reset
          </button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loadingInstruments || (loadingSearch && searchTerm) ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
            </div>
          ) : displayItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <BarChart3 className="h-12 w-12 text-zinc-600" />
              <p className="mt-3 text-sm text-zinc-500">
                Select a category above or search to view instruments
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>Epic</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Bid</TableHead>
                  <TableHead className="text-right">Offer</TableHead>
                  <TableHead className="text-right">Change</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayItems.map((item) => {
                  const isExpanded = expandedEpic === item.epic;
                  return (
                    <Fragment key={item.epic}>
                      <TableRow
                        className="cursor-pointer hover:bg-zinc-800/40"
                        onClick={() =>
                          setExpandedEpic(isExpanded ? null : item.epic)
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
                          {item.epic}
                        </TableCell>
                        <TableCell className="font-medium text-white">
                          {item.name}
                        </TableCell>
                        <TableCell className="text-zinc-400">
                          {item.type}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums text-zinc-300">
                          {item.bid != null ? item.bid : "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums text-zinc-300">
                          {item.offer != null ? item.offer : "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {item.netChange != null ||
                          item.percentageChange != null ? (
                            <span
                              className={
                                (item.percentageChange ??
                                  item.netChange ??
                                  0) >= 0
                                  ? "text-emerald-400"
                                  : "text-red-400"
                              }
                            >
                              {item.percentageChange != null
                                ? `${item.percentageChange >= 0 ? "+" : ""}${item.percentageChange.toFixed(2)}%`
                                : item.netChange != null
                                  ? String(item.netChange)
                                  : "—"}
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          {item.marketStatus ? (
                            <Badge
                              variant="default"
                              className="text-[10px] capitalize"
                            >
                              {item.marketStatus
                                .replace(/_/g, " ")
                                .toLowerCase()}
                            </Badge>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow className="hover:bg-transparent">
                          <TableCell colSpan={8} className="p-0">
                            <ExpandedInstrumentContent
                              epic={item.epic}
                              name={item.name}
                              onClose={() => setExpandedEpic(null)}
                            />
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
