import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data, error } = await (supabase.from as Function)("agents")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }
    return NextResponse.json({ agent: data });
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
    const { data: existing } = await from("agents")
      .select("creator_id")
      .eq("id", id)
      .single();
    if (
      !existing ||
      (existing as { creator_id: string }).creator_id !== user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const updatePayload: Record<string, unknown> = {};
    if (body.status !== undefined) updatePayload.status = body.status;
    if (body.name !== undefined) updatePayload.name = body.name;
    if (body.description !== undefined)
      updatePayload.description = body.description;
    if (body.config !== undefined) updatePayload.config = body.config;
    if (body.prompt !== undefined) updatePayload.prompt = body.prompt;
    if (body.instrument !== undefined)
      updatePayload.instrument = body.instrument;
    if (body.instruments !== undefined)
      updatePayload.instruments = body.instruments;
    if (body.timeframe !== undefined) updatePayload.timeframe = body.timeframe;

    const { data, error } = await from("agents")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ agent: data });
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
    const { data: existing } = await from("agents")
      .select("creator_id")
      .eq("id", id)
      .single();
    if (
      !existing ||
      (existing as { creator_id: string }).creator_id !== user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await from("agents").delete().eq("id", id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
