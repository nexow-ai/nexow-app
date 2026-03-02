import { NextRequest, NextResponse } from "next/server";

const NEXOW_API_URL = process.env.NEXOW_API_URL || "http://localhost:8000";

export async function GET(request: NextRequest) {
  const clientKey = request.nextUrl.searchParams.get("clientKey");
  const includeSubAccounts = request.nextUrl.searchParams.get("includeSubAccounts");
  const params = new URLSearchParams();
  if (clientKey) params.set("clientKey", clientKey);
  if (includeSubAccounts !== null && includeSubAccounts !== undefined)
    params.set("includeSubAccounts", includeSubAccounts);
  const qs = params.toString();
  try {
    const res = await fetch(
      `${NEXOW_API_URL}/saxo/accounts${qs ? `?${qs}` : ""}`,
      { cache: "no-store" }
    );
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: data.detail ?? "Failed to load accounts" },
        { status: res.status }
      );
    }
    return NextResponse.json(data);
  } catch (e) {
    console.error("Saxo accounts error:", e);
    return NextResponse.json(
      { error: "Could not reach Nexow API" },
      { status: 502 }
    );
  }
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    if (request.headers.get("content-type")?.includes("application/json")) {
      body = await request.json();
    }
  } catch {
    // leave body as {}
  }
  try {
    const res = await fetch(`${NEXOW_API_URL}/saxo/accounts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: data.detail ?? "Failed to create account" },
        { status: res.status }
      );
    }
    return NextResponse.json(data);
  } catch (e) {
    console.error("Saxo create account error:", e);
    return NextResponse.json(
      { error: "Could not reach Nexow API" },
      { status: 502 }
    );
  }
}
