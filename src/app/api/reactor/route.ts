import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
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
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ configs: data ?? [] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();

    const from = (supabase.from as Function).bind(supabase);
    const { data, error } = await from("reactor_configs")
      .upsert(
        {
          user_id: user.id,
          instrument: body.instrument ?? "EUR_USD",
          trades_per_day: body.trades_per_day ?? 3,
          risk_mode: body.risk_mode ?? "percentage",
          risk_value: body.risk_value ?? 1.0,
          timeframe: body.timeframe ?? "H1",
          weight_technical: body.weight_technical ?? 0.30,
          weight_momentum: body.weight_momentum ?? 0.20,
          weight_fundamental: body.weight_fundamental ?? 0.20,
          weight_structure: body.weight_structure ?? 0.20,
          weight_session: body.weight_session ?? 0.10,
          confidence_threshold: body.confidence_threshold ?? 0.60,
          is_active: body.is_active ?? false,
        },
        { onConflict: "user_id,instrument" }
      )
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
