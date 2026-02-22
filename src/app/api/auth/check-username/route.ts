import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const username = req.nextUrl.searchParams
      .get("username")
      ?.trim()
      .toLowerCase();
    if (!username || username.length < 3) {
      return NextResponse.json(
        { error: "Username must be at least 3 characters" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data, error } = await (supabase.rpc as Function)(
      "check_username_available",
      { desired_username: username }
    );

    if (error) {
      return NextResponse.json({ error: "Check failed" }, { status: 500 });
    }

    return NextResponse.json({ available: data === true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
