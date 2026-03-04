/**
 * Alpaca API helpers for nexow-app.
 * Supports Broker API (client_id + client_secret → Bearer token) and Trading API (API key + secret headers).
 */

const DEFAULT_BROKER_API_BASE = "https://broker-api.sandbox.alpaca.markets";
const DEFAULT_PAPER_API_BASE = "https://paper-api.alpaca.markets";
const DEFAULT_DATA_API_BASE = "https://data.alpaca.markets";
const AUTH_SANDBOX = "https://authx.sandbox.alpaca.markets";
const AUTH_PROD = "https://authx.alpaca.markets";

function getBrokerApiBase(): string {
  const url = process.env.ALPACA_API_URL?.trim();
  if (url) return url.replace(/\/$/, "");
  return DEFAULT_BROKER_API_BASE;
}

function getTradingApiBase(): string {
  const url = process.env.ALPACA_PAPER_API_URL?.trim();
  if (url) return url.replace(/\/$/, "");
  return DEFAULT_PAPER_API_BASE;
}

function getAuthBase(): string {
  const base = getBrokerApiBase();
  return base.includes("sandbox") ? AUTH_SANDBOX : AUTH_PROD;
}

function getDataApiBase(): string {
  const url = process.env.ALPACA_DATA_API_URL?.trim();
  if (url) return url.replace(/\/$/, "");
  return DEFAULT_DATA_API_BASE;
}

export function hasBrokerConfig(): boolean {
  return Boolean(
    process.env.ALPACA_CLIENT_ID && process.env.ALPACA_CLIENT_SECRET
  );
}

export function hasTradingConfig(): boolean {
  return Boolean(
    process.env.ALPACA_API_KEY && process.env.ALPACA_SECRET_KEY
  );
}

function getTradingAuthHeaders(): Record<string, string> {
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

let cachedToken: { access_token: string; expires_at: number } | null = null;

async function getBrokerBearerToken(): Promise<string> {
  const clientId = process.env.ALPACA_CLIENT_ID;
  const clientSecret = process.env.ALPACA_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("ALPACA_CLIENT_ID and ALPACA_CLIENT_SECRET are required");
  }
  const now = Date.now();
  if (cachedToken && cachedToken.expires_at > now + 60_000) {
    return cachedToken.access_token;
  }
  const authBase = getAuthBase();
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });
  const res = await fetch(`${authBase}/v1/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    cache: "no-store",
  });
  const data = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
  };
  if (!res.ok || !data.access_token) {
    throw new Error(data.error ?? "Failed to get Alpaca access token");
  }
  cachedToken = {
    access_token: data.access_token,
    expires_at: now + (data.expires_in ?? 899) * 1000,
  };
  return cachedToken.access_token;
}

export async function alpacaFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(options.headers);
  if (hasBrokerConfig()) {
    const token = await getBrokerBearerToken();
    headers.set("Authorization", `Bearer ${token}`);
  } else {
    Object.entries(getTradingAuthHeaders()).forEach(([k, v]) =>
      headers.set(k, v)
    );
  }
  return fetch(url, { ...options, headers });
}

/** Use for Data API (bars, quotes). Prefers Trading API keys; Broker Bearer often has no Data API access. */
export async function alpacaDataFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(options.headers);
  if (hasTradingConfig()) {
    Object.entries(getTradingAuthHeaders()).forEach(([k, v]) =>
      headers.set(k, v)
    );
  } else if (hasBrokerConfig()) {
    const token = await getBrokerBearerToken();
    headers.set("Authorization", `Bearer ${token}`);
  } else {
    throw new Error("Alpaca is not configured");
  }
  return fetch(url, { ...options, headers });
}

export function getBrokerApiUrl(path: string, search?: string): string {
  const base = getBrokerApiBase();
  const p = path.startsWith("/") ? path : `/${path}`;
  return search ? `${base}${p}?${search}` : `${base}${p}`;
}

export function getPaperApiUrl(path: string, search?: string): string {
  const base = getTradingApiBase();
  const p = path.startsWith("/") ? path : `/${path}`;
  return search ? `${base}${p}?${search}` : `${base}${p}`;
}

export function getDataApiUrl(path: string, search?: string): string {
  const base = getDataApiBase();
  const p = path.startsWith("/") ? path : `/${path}`;
  return search ? `${base}${p}?${search}` : `${base}${p}`;
}

export function hasAlpacaConfig(): boolean {
  return hasBrokerConfig() || Boolean(
    process.env.ALPACA_API_KEY && process.env.ALPACA_SECRET_KEY
  );
}
