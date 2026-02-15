import { NextResponse } from "next/server";

const OANDA_API_URL =
  process.env.OANDA_API_URL || "https://api-fxpractice.oanda.com";
const OANDA_ACCOUNT_ID = process.env.OANDA_ACCOUNT_ID || "";
const OANDA_API_TOKEN = process.env.OANDA_API_TOKEN || "";

interface OandaTag {
  type: string;
  name: string;
}

interface OandaInstrument {
  name: string;
  type: "CURRENCY" | "METAL" | "CFD";
  displayName: string;
  tags: OandaTag[];
}

interface GroupedInstrument {
  id: string;
  name: string;
}

interface InstrumentGroup {
  type: string;
  label: string;
  instruments: GroupedInstrument[];
}

// ---------------------------------------------------------------------------
// Classification helpers
// ---------------------------------------------------------------------------

const MAJORS = new Set(["EUR", "USD", "GBP", "JPY", "CHF", "AUD", "CAD", "NZD"]);
const MAJOR_PAIRS = new Set([
  "EUR_USD", "GBP_USD", "USD_JPY", "USD_CHF", "AUD_USD", "USD_CAD", "NZD_USD",
]);

// Known crypto base currencies (Oanda classifies crypto as CFD)
const CRYPTO_BASES = new Set([
  "BTC", "ETH", "LTC", "BCH", "XRP", "LINK", "UNI", "DOGE", "SOL", "DOT",
  "AVAX", "ADA", "MATIC", "ATOM", "XLM", "ALGO", "AAVE", "COMP", "MKR",
  "SUSHI", "YFI", "SNX", "BAT", "ZRX", "CRV", "FIL", "EOS", "XTZ", "SHIB",
  "APE", "NEAR", "FTM", "MANA", "SAND", "AXS", "ENJ", "GRT", "OP", "ARB",
]);

// Metals that might come as CFD instead of METAL in some account types
const METAL_BASES = new Set(["XAU", "XAG", "XPT", "XPD", "XCU"]);

// Pattern-based classification for CFDs when tags aren't helpful
const INDEX_PATTERNS = [
  "US30", "SPX500", "NAS100", "US2000", "UK100", "DE30", "DE40", "FR40",
  "EU50", "JP225", "AU200", "HK33", "SG30", "CN50", "IN50", "TWIX", "NL25",
  "ESPIX", "CH20", "CHINAH", "SE30",
];
const BOND_PATTERNS = ["USB02Y", "USB05Y", "USB10Y", "USB30Y", "UK10YB", "DE10YB", "DE05YB", "DE02YB", "AU2YB"];
const COMMODITY_PATTERNS = [
  "BCO", "WTICO", "NATGAS", "SOYBN", "CORN", "WHEAT", "SUGAR", "COTTON", "COFFEE",
];

/**
 * Classify using Oanda's tags array.
 *
 * Oanda tags look like:
 *   { type: "ASSET_CLASS", name: "INDEX" }
 *   { type: "BRAIN_ASSET_CLASS", name: "METAL" }
 *
 * BRAIN_ASSET_CLASS is more granular (e.g. distinguishes METAL vs ENERGY
 * within the broader COMMODITY class), so we check it first, then fall
 * back to ASSET_CLASS.
 */
function classifyByTags(tags: OandaTag[]): string | null {
  // Build a lookup by tag type for priority-based resolution
  const byType: Record<string, string> = {};
  for (const tag of tags) {
    byType[tag.type.toUpperCase()] = tag.name.toUpperCase();
  }

  // BRAIN_ASSET_CLASS is more specific — check first
  const brain = byType["BRAIN_ASSET_CLASS"] || "";
  if (brain.includes("METAL")) return "metals";
  if (brain.includes("ENERGY")) return "commodities";

  // Then check ASSET_CLASS (broader)
  const asset = byType["ASSET_CLASS"] || "";
  if (asset.includes("INDEX") || asset.includes("INDICE")) return "indices";
  if (asset.includes("BOND") || asset.includes("TREASURY")) return "bonds";
  if (asset.includes("COMMODITY") || asset.includes("COMMODIT")) return "commodities";
  if (asset.includes("CRYPTO") || asset.includes("DIGITAL")) return "crypto";
  if (asset.includes("SHARE") || asset.includes("STOCK") || asset.includes("EQUITY") || asset.includes("EQUITIE")) return "stocks";
  if (asset.includes("ETF")) return "etfs";
  if (asset.includes("METAL")) return "metals";

  // Fallback: scan all tag names
  for (const tag of tags) {
    const val = tag.name.toUpperCase();
    if (val.includes("INDEX")) return "indices";
    if (val.includes("BOND")) return "bonds";
    if (val.includes("COMMODITY")) return "commodities";
    if (val.includes("CRYPTO")) return "crypto";
    if (val.includes("STOCK") || val.includes("EQUITY")) return "stocks";
    if (val.includes("ETF")) return "etfs";
    if (val.includes("METAL")) return "metals";
  }

  return null;
}

/**
 * Fallback: classify by instrument name patterns.
 */
function classifyByName(name: string): string {
  const base = name.split("_")[0];

  if (CRYPTO_BASES.has(base)) return "crypto";
  if (METAL_BASES.has(base)) return "metals";
  if (INDEX_PATTERNS.some((p) => name.startsWith(p))) return "indices";
  if (BOND_PATTERNS.some((p) => name.startsWith(p))) return "bonds";
  if (COMMODITY_PATTERNS.some((p) => name.startsWith(p))) return "commodities";

  // If it's a single-word base + _USD/EUR/etc., likely a stock ticker
  if (base.length <= 5 && base === base.toUpperCase() && /^[A-Z]+$/.test(base)) {
    return "stocks";
  }

  return "other";
}

function classifyForex(name: string): "forex_major" | "forex_minor" | "forex_exotic" {
  if (MAJOR_PAIRS.has(name)) return "forex_major";
  const [base, quote] = name.split("_");
  if (MAJORS.has(base) && MAJORS.has(quote)) return "forex_minor";
  return "forex_exotic";
}

function groupInstruments(instruments: OandaInstrument[]): InstrumentGroup[] {
  const groups: Record<string, GroupedInstrument[]> = {
    forex_major: [],
    forex_minor: [],
    forex_exotic: [],
    metals: [],
    crypto: [],
    indices: [],
    commodities: [],
    bonds: [],
    stocks: [],
    etfs: [],
    other: [],
  };

  for (const inst of instruments) {
    const item: GroupedInstrument = { id: inst.name, name: inst.displayName };

    if (inst.type === "CURRENCY") {
      groups[classifyForex(inst.name)].push(item);
    } else if (inst.type === "METAL") {
      groups.metals.push(item);
    } else {
      // CFD — use tags first, then name patterns
      const tagCategory = classifyByTags(inst.tags || []);
      const category = tagCategory || classifyByName(inst.name);
      if (groups[category]) {
        groups[category].push(item);
      } else {
        groups.other.push(item);
      }
    }
  }

  const labels: Record<string, string> = {
    forex_major: "Forex — Majors",
    forex_minor: "Forex — Minors",
    forex_exotic: "Forex — Exotics",
    metals: "Metals",
    crypto: "Crypto",
    indices: "Indices",
    commodities: "Commodities",
    bonds: "Bonds",
    stocks: "Stocks",
    etfs: "ETFs",
    other: "Other",
  };

  // Preserve a logical display order
  const order = [
    "forex_major", "forex_minor", "forex_exotic",
    "metals", "crypto", "indices", "commodities", "bonds", "stocks", "etfs", "other",
  ];

  return order
    .filter((type) => groups[type] && groups[type].length > 0)
    .map((type) => ({
      type,
      label: labels[type] || type,
      instruments: groups[type].sort((a, b) => a.id.localeCompare(b.id)),
    }));
}

// ---------------------------------------------------------------------------
// In-memory cache
// ---------------------------------------------------------------------------

let cachedResponse: { data: InstrumentGroup[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function GET() {
  if (!OANDA_ACCOUNT_ID || !OANDA_API_TOKEN) {
    return NextResponse.json(
      { error: "Oanda credentials not configured" },
      { status: 500 }
    );
  }

  // Return cached if still fresh
  if (cachedResponse && Date.now() - cachedResponse.timestamp < CACHE_TTL_MS) {
    return NextResponse.json({ groups: cachedResponse.data });
  }

  try {
    const url = `${OANDA_API_URL}/v3/accounts/${OANDA_ACCOUNT_ID}/instruments`;

    const resp = await fetch(url, {
      headers: {
        Authorization: `Bearer ${OANDA_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 3600 },
    });

    if (!resp.ok) {
      const text = await resp.text();
      return NextResponse.json({ error: text }, { status: resp.status });
    }

    const data = await resp.json();
    const instruments: OandaInstrument[] = data.instruments || [];
    const groups = groupInstruments(instruments);

    cachedResponse = { data: groups, timestamp: Date.now() };

    return NextResponse.json({ groups });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch instruments" },
      { status: 500 }
    );
  }
}
