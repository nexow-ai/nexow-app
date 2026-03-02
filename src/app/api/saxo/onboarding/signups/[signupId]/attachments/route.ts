import { NextRequest, NextResponse } from "next/server";

const NEXOW_API_URL = process.env.NEXOW_API_URL || "http://localhost:8000";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ signupId: string }> }
) {
  const { signupId } = await params;
  if (!signupId) {
    return NextResponse.json(
      { error: "Missing signupId" },
      { status: 400 }
    );
  }
  const formData = await request.formData();
  const documentType = formData.get("documentType") as string | null;
  const file = formData.get("file") as File | null;
  if (!documentType || !file) {
    return NextResponse.json(
      { error: "documentType and file are required" },
      { status: 400 }
    );
  }
  const body = new FormData();
  body.set("documentType", documentType);
  body.set("file", file);
  try {
    const res = await fetch(
      `${NEXOW_API_URL}/saxo/onboarding/signups/${encodeURIComponent(signupId)}/attachments`,
      {
        method: "POST",
        body,
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { error: data.detail ?? "Failed to upload document" },
        { status: res.status }
      );
    }
    return NextResponse.json(data);
  } catch (e) {
    console.error("Saxo upload attachment error:", e);
    return NextResponse.json(
      { error: "Could not reach Nexow API" },
      { status: 502 }
    );
  }
}
