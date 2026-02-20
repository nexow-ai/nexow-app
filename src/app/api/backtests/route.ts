import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

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

    const { data: btData, error: btError } = await from("backtests")
      .insert({
        agent_id: body.agent_id ?? null,
        creator_id: user.id,
        config: body.config ?? {},
        instruments: body.instruments ?? [],
        exit_config: body.exit_config ?? {},
        period_start: body.period_start,
        period_end: body.period_end,
        status: body.status ?? "completed",
        progress_pct: body.progress_pct ?? 100,
        total_trades: body.total_trades ?? null,
        total_return_pct: body.total_return_pct ?? null,
        win_rate: body.win_rate ?? null,
        max_drawdown: body.max_drawdown ?? null,
        sharpe_ratio: body.sharpe_ratio ?? null,
        profit_factor: body.profit_factor ?? null,
        equity_curve: body.equity_curve ?? [],
      })
      .select()
      .single();

    if (btError) {
      return NextResponse.json({ error: btError.message }, { status: 400 });
    }
    return NextResponse.json({ backtest: btData });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
