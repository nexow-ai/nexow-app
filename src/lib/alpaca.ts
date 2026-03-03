/**
 * Alpaca API helpers for nexow-app.
 * Uses paper API for assets; data API for bars/quotes (same credentials if enabled).
 */

const PAPER_API_BASE = "https://paper-api.alpaca.markets";
const DATA_API_BASE = "https://data.alpaca.markets";

function getAuthHeaders(): Record<string, string> {
  const key = process.env.ALPACA_API_KEY;
  const secret = process.env.ALPACA_SECRET_KEY;
  if (!key || !secret) {
    throw new Error("ALPACA_API_KEY and ALPACA_SECRET_KEY are required");
  }
  return {
    "APCA-API-KEY-ID": key,
    "APCA-API-SECRET-KEY": secret,
  };
}

export async function alpacaFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(options.headers);
  Object.entries(getAuthHeaders()).forEach(([k, v]) => headers.set(k, v));
  return fetch(url, { ...options, headers });
}

export function getPaperApiUrl(path: string, search?: string): string {
  const base = PAPER_API_BASE.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return search ? `${base}${p}?${search}` : `${base}${p}`;
}

export function getDataApiUrl(path: string, search?: string): string {
  const base = DATA_API_BASE.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return search ? `${base}${p}?${search}` : `${base}${p}`;
}

export function hasAlpacaConfig(): boolean {
  return Boolean(
    process.env.ALPACA_API_KEY && process.env.ALPACA_SECRET_KEY
  );
}
