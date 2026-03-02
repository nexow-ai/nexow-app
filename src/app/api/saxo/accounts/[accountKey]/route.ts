import { NextRequest, NextResponse } from "next/server";

const NEXOW_API_URL = process.env.NEXOW_API_URL || "http://localhost:8000";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ accountKey: string }> }
) {
  const { accountKey } = await params;
  if (!accountKey) {
    return NextResponse.json(
      { error: "Missing accountKey" },
      { status: 400 }
    );
  }
  try {
    const res = await fetch(
      `${NEXOW_API_URL}/saxo/accounts/${encodeURIComponent(accountKey)}`,
      { cache: "no-store" }
    );
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: data.detail ?? "Failed to load account" },
        { status: res.status }
      );
    }
    return NextResponse.json(data);
  } catch (e) {
    console.error("Saxo account error:", e);
    return NextResponse.json(
      { error: "Could not reach Nexow API" },
      { status: 502 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ accountKey: string }> }
) {
  const { accountKey } = await params;
  if (!accountKey) {
    return NextResponse.json(
      { error: "Missing accountKey" },
      { status: 400 }
    );
  }
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }
  try {
    const res = await fetch(
      `${NEXOW_API_URL}/saxo/accounts/${encodeURIComponent(accountKey)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: data.detail ?? "Failed to update account" },
        { status: res.status }
      );
    }
    return NextResponse.json(data);
  } catch (e) {
    console.error("Saxo account update error:", e);
    return NextResponse.json(
      { error: "Could not reach Nexow API" },
      { status: 502 }
    );
  }
}
