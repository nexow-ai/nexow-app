/**
 * Oanda instruments — hardcoded fallback used when the live API
 * (/api/instruments) is unavailable. The live endpoint fetches
 * directly from Oanda's v20 API and will always be more complete.
 *
 * This fallback mirrors the 123 instruments available on a typical
 * Oanda practice account. The exact list depends on your account
 * entity/region — some offer crypto, stocks, or ETFs as well.
 */

export interface OandaInstrument {
  id: string;
  name: string;
}

export interface InstrumentGroup {
  type: string;
  label: string;
  instruments: OandaInstrument[];
}

export const TIMEFRAMES = [
  { id: "M1", label: "1 min" },
  { id: "M5", label: "5 min" },
  { id: "M15", label: "15 min" },
  { id: "M30", label: "30 min" },
  { id: "H1", label: "1 hour" },
  { id: "H4", label: "4 hours" },
  { id: "D", label: "Daily" },
  { id: "W", label: "Weekly" },
  { id: "M", label: "Monthly" },
] as const;

export const INSTRUMENT_GROUPS: InstrumentGroup[] = [
  // ── Forex — Majors ────────────────────────────────────────────────────
  {
    type: "forex_major",
    label: "Forex — Majors",
    instruments: [
      { id: "AUD_USD", name: "AUD/USD" },
      { id: "EUR_USD", name: "EUR/USD" },
      { id: "GBP_USD", name: "GBP/USD" },
      { id: "NZD_USD", name: "NZD/USD" },
      { id: "USD_CAD", name: "USD/CAD" },
      { id: "USD_CHF", name: "USD/CHF" },
      { id: "USD_JPY", name: "USD/JPY" },
    ],
  },

  // ── Forex — Minors ────────────────────────────────────────────────────
  {
    type: "forex_minor",
    label: "Forex — Minors",
    instruments: [
      { id: "AUD_CAD", name: "AUD/CAD" },
      { id: "AUD_CHF", name: "AUD/CHF" },
      { id: "AUD_JPY", name: "AUD/JPY" },
      { id: "AUD_NZD", name: "AUD/NZD" },
      { id: "CAD_CHF", name: "CAD/CHF" },
      { id: "CAD_JPY", name: "CAD/JPY" },
      { id: "CHF_JPY", name: "CHF/JPY" },
      { id: "EUR_AUD", name: "EUR/AUD" },
      { id: "EUR_CAD", name: "EUR/CAD" },
      { id: "EUR_CHF", name: "EUR/CHF" },
      { id: "EUR_GBP", name: "EUR/GBP" },
      { id: "EUR_JPY", name: "EUR/JPY" },
      { id: "EUR_NZD", name: "EUR/NZD" },
      { id: "GBP_AUD", name: "GBP/AUD" },
      { id: "GBP_CAD", name: "GBP/CAD" },
      { id: "GBP_CHF", name: "GBP/CHF" },
      { id: "GBP_JPY", name: "GBP/JPY" },
      { id: "GBP_NZD", name: "GBP/NZD" },
      { id: "NZD_CAD", name: "NZD/CAD" },
      { id: "NZD_CHF", name: "NZD/CHF" },
      { id: "NZD_JPY", name: "NZD/JPY" },
    ],
  },

  // ── Forex — Exotics ───────────────────────────────────────────────────
  {
    type: "forex_exotic",
    label: "Forex — Exotics",
    instruments: [
      { id: "AUD_HKD", name: "AUD/HKD" },
      { id: "AUD_SGD", name: "AUD/SGD" },
      { id: "CAD_HKD", name: "CAD/HKD" },
      { id: "CAD_SGD", name: "CAD/SGD" },
      { id: "CHF_HKD", name: "CHF/HKD" },
      { id: "CHF_ZAR", name: "CHF/ZAR" },
      { id: "EUR_CZK", name: "EUR/CZK" },
      { id: "EUR_DKK", name: "EUR/DKK" },
      { id: "EUR_HKD", name: "EUR/HKD" },
      { id: "EUR_HUF", name: "EUR/HUF" },
      { id: "EUR_NOK", name: "EUR/NOK" },
      { id: "EUR_PLN", name: "EUR/PLN" },
      { id: "EUR_SEK", name: "EUR/SEK" },
      { id: "EUR_SGD", name: "EUR/SGD" },
      { id: "EUR_TRY", name: "EUR/TRY" },
      { id: "EUR_ZAR", name: "EUR/ZAR" },
      { id: "GBP_HKD", name: "GBP/HKD" },
      { id: "GBP_PLN", name: "GBP/PLN" },
      { id: "GBP_SGD", name: "GBP/SGD" },
      { id: "GBP_ZAR", name: "GBP/ZAR" },
      { id: "HKD_JPY", name: "HKD/JPY" },
      { id: "NZD_HKD", name: "NZD/HKD" },
      { id: "NZD_SGD", name: "NZD/SGD" },
      { id: "SGD_CHF", name: "SGD/CHF" },
      { id: "SGD_JPY", name: "SGD/JPY" },
      { id: "TRY_JPY", name: "TRY/JPY" },
      { id: "USD_CNH", name: "USD/CNH" },
      { id: "USD_CZK", name: "USD/CZK" },
      { id: "USD_DKK", name: "USD/DKK" },
      { id: "USD_HKD", name: "USD/HKD" },
      { id: "USD_HUF", name: "USD/HUF" },
      { id: "USD_MXN", name: "USD/MXN" },
      { id: "USD_NOK", name: "USD/NOK" },
      { id: "USD_PLN", name: "USD/PLN" },
      { id: "USD_SEK", name: "USD/SEK" },
      { id: "USD_SGD", name: "USD/SGD" },
      { id: "USD_THB", name: "USD/THB" },
      { id: "USD_TRY", name: "USD/TRY" },
      { id: "USD_ZAR", name: "USD/ZAR" },
      { id: "ZAR_JPY", name: "ZAR/JPY" },
    ],
  },

  // ── Metals ────────────────────────────────────────────────────────────
  {
    type: "metals",
    label: "Metals",
    instruments: [
      { id: "XAU_USD", name: "Gold" },
      { id: "XAU_AUD", name: "Gold/AUD" },
      { id: "XAU_CAD", name: "Gold/CAD" },
      { id: "XAU_CHF", name: "Gold/CHF" },
      { id: "XAU_EUR", name: "Gold/EUR" },
      { id: "XAU_GBP", name: "Gold/GBP" },
      { id: "XAU_HKD", name: "Gold/HKD" },
      { id: "XAU_JPY", name: "Gold/JPY" },
      { id: "XAU_NZD", name: "Gold/NZD" },
      { id: "XAU_SGD", name: "Gold/SGD" },
      { id: "XAU_XAG", name: "Gold/Silver" },
      { id: "XAG_USD", name: "Silver" },
      { id: "XAG_AUD", name: "Silver/AUD" },
      { id: "XAG_CAD", name: "Silver/CAD" },
      { id: "XAG_CHF", name: "Silver/CHF" },
      { id: "XAG_EUR", name: "Silver/EUR" },
      { id: "XAG_GBP", name: "Silver/GBP" },
      { id: "XAG_HKD", name: "Silver/HKD" },
      { id: "XAG_JPY", name: "Silver/JPY" },
      { id: "XAG_NZD", name: "Silver/NZD" },
      { id: "XAG_SGD", name: "Silver/SGD" },
      { id: "XPT_USD", name: "Platinum" },
      { id: "XPD_USD", name: "Palladium" },
      { id: "XCU_USD", name: "Copper" },
    ],
  },

  // ── Indices ───────────────────────────────────────────────────────────
  {
    type: "indices",
    label: "Indices",
    instruments: [
      { id: "AU200_AUD", name: "Australia 200" },
      { id: "CH20_CHF", name: "Switzerland 20" },
      { id: "CHINAH_HKD", name: "China H Shares" },
      { id: "CN50_USD", name: "China A50" },
      { id: "DE30_EUR", name: "Germany 30" },
      { id: "ESPIX_EUR", name: "Spain 35" },
      { id: "EU50_EUR", name: "Europe 50" },
      { id: "FR40_EUR", name: "France 40" },
      { id: "HK33_HKD", name: "Hong Kong 33" },
      { id: "JP225_USD", name: "Japan 225" },
      { id: "JP225Y_JPY", name: "Japan 225 (JPY)" },
      { id: "NAS100_USD", name: "US Nas 100" },
      { id: "NL25_EUR", name: "Netherlands 25" },
      { id: "SG30_SGD", name: "Singapore 30" },
      { id: "SPX500_USD", name: "US SPX 500" },
      { id: "UK100_GBP", name: "UK 100" },
      { id: "US2000_USD", name: "US Russ 2000" },
      { id: "US30_USD", name: "US Wall St 30" },
    ],
  },

  // ── Commodities ───────────────────────────────────────────────────────
  {
    type: "commodities",
    label: "Commodities",
    instruments: [
      { id: "BCO_USD", name: "Brent Crude Oil" },
      { id: "CORN_USD", name: "Corn" },
      { id: "NATGAS_USD", name: "Natural Gas" },
      { id: "SOYBN_USD", name: "Soybeans" },
      { id: "SUGAR_USD", name: "Sugar" },
      { id: "WHEAT_USD", name: "Wheat" },
      { id: "WTICO_USD", name: "West Texas Oil" },
    ],
  },

  // ── Bonds ─────────────────────────────────────────────────────────────
  {
    type: "bonds",
    label: "Bonds",
    instruments: [
      { id: "DE10YB_EUR", name: "Bund" },
      { id: "UK10YB_GBP", name: "UK 10Y Gilt" },
      { id: "USB02Y_USD", name: "US 2Y T-Note" },
      { id: "USB05Y_USD", name: "US 5Y T-Note" },
      { id: "USB10Y_USD", name: "US 10Y T-Note" },
      { id: "USB30Y_USD", name: "US T-Bond" },
    ],
  },
];

/** Flat lookup: instrument ID -> display name */
export const INSTRUMENT_NAMES: Record<string, string> = Object.fromEntries(
  INSTRUMENT_GROUPS.flatMap((g) => g.instruments.map((i) => [i.id, i.name]))
);

/** All instrument IDs in a flat array */
export const ALL_INSTRUMENTS: OandaInstrument[] = INSTRUMENT_GROUPS.flatMap(
  (g) => g.instruments
);
