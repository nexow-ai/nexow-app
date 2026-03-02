import { NextResponse } from "next/server";

const NEXOW_API_URL = process.env.NEXOW_API_URL || "http://localhost:8000";

export async function PUT(
  _request: Request,
  { params }: { params: Promise<{ signupId: string }> }
) {
  const { signupId } = await params;
  if (!signupId) {
    return NextResponse.json(
      { error: "Missing signupId" },
      { status: 400 }
    );
  }
  try {
    const res = await fetch(
      `${NEXOW_API_URL}/saxo/onboarding/signups/${encodeURIComponent(signupId)}/complete`,
      { method: "PUT" }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { error: data.detail ?? "Failed to complete application" },
        { status: res.status }
      );
    }
    return NextResponse.json(data);
  } catch (e) {
    console.error("Saxo complete application error:", e);
    return NextResponse.json(
      { error: "Could not reach Nexow API" },
      { status: 502 }
    );
  }
}
