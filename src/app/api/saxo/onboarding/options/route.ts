import { NextResponse } from "next/server";

const NEXOW_API_URL = process.env.NEXOW_API_URL || "http://localhost:8000";

export async function GET() {
  try {
    const res = await fetch(`${NEXOW_API_URL}/saxo/onboarding/options`, {
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: data.detail ?? "Failed to load options" },
        { status: res.status }
      );
    }
    return NextResponse.json(data);
  } catch (e) {
    console.error("Saxo onboarding options error:", e);
    return NextResponse.json(
      { error: "Could not reach Nexow API" },
      { status: 502 }
    );
  }
}
