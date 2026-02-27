import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const from = (supabase.from as Function).bind(supabase);
    const { data, error } = await from("reactor_configs")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Config not found" }, { status: 404 });
    }
    return NextResponse.json({ config: data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const from = (supabase.from as Function).bind(supabase);
    const { data: existing } = await from("reactor_configs")
      .select("user_id")
      .eq("id", id)
      .single();
    if (
      !existing ||
      (existing as { user_id: string }).user_id !== user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const allowed = [
      "instrument",
      "trades_per_day",
      "risk_mode",
      "risk_value",
      "timeframe",
      "weight_technical",
      "weight_momentum",
      "weight_fundamental",
      "weight_structure",
      "weight_session",
      "confidence_threshold",
      "reward_ratio",
      "is_active",
    ];
    const updatePayload: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) updatePayload[key] = body[key];
    }

    const { data, error } = await from("reactor_configs")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ config: data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const from = (supabase.from as Function).bind(supabase);
    const { data: existing } = await from("reactor_configs")
      .select("user_id")
      .eq("id", id)
      .single();
    if (
      !existing ||
      (existing as { user_id: string }).user_id !== user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await from("reactor_configs").delete().eq("id", id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
