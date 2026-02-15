import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canDeployAgent, hasCredits } from "@/lib/stripe/guards";
import { CREDIT_COSTS } from "@/lib/stripe/plans";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const {
    prompt,
    instruments,
    agent_type,
    entry_description,
    data_providers,
    exit_config,
  } = body;

  if (!prompt || typeof prompt !== "string") {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  // Check plan limits
  const deployCheck = await canDeployAgent(user.id, agent_type ?? "systematic");
  if (!deployCheck.allowed) {
    return NextResponse.json(
      { error: deployCheck.reason },
      { status: 403 }
    );
  }

  // Check credits
  const hasCreds = await hasCredits(user.id, CREDIT_COSTS.agentGeneration);
  if (!hasCreds) {
    return NextResponse.json(
      { error: "Insufficient AI credits. Upgrade your plan for more credits." },
      { status: 403 }
    );
  }

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OpenAI API key not configured" },
      { status: 500 }
    );
  }

  const instrumentsList =
    Array.isArray(instruments) && instruments.length > 0
      ? instruments.map((i: string) => i.replace("_", "/")).join(", ")
      : "Not specified";

  const systemPrompt = `You are Nexow's Agent Factory. Convert the user's structured trading strategy into a JSON config with dynamic trading rules.

Agents are SIGNAL PROVIDERS — they emit entry signals (BUY/SELL) and exit signals (CLOSE).
There is NO position sizing, no volume, no risk management. Agents are compared purely by gross return %.

The user has already selected their instruments, entry strategy, and exit conditions. Your job is to translate their intent into a precise, executable config.

IMPORTANT: The user's entry/exit descriptions may reference multiple timeframes on the same instrument
(e.g. "buy when M15 candles are red and H4 is green"). Extract ALL referenced timeframes and include
each instrument+timeframe combination in the portfolio config. If no specific timeframe is mentioned, default to H1.

Return a JSON object with these exact fields:
{
  "agent_type": "${agent_type || "systematic"}",
  "name": "Creative agent name",
  "description": "1-2 sentence description",
  "portfolio_summary": "e.g. EUR/USD on M15 + H4",
  "config": { ... }
}

## User's selected instruments: ${instrumentsList}
## Agent type: ${agent_type || "systematic"}
${agent_type === "discretionary" && data_providers ? `## Data providers: ${data_providers.join(", ")}` : ""}

## For SYSTEMATIC agents, config must contain "rules" with buy_rules and sell_rules:

Each rule group has "operator" ("and", "or", "not", "always", "never") and "conditions".
Each condition has "type" and optional "params".

Available condition types:
- Price: "price_above", "price_below", "price_change_pct_up", "price_change_pct_down", "price_dropped_pct", "price_near_high", "price_near_low"
- Candle: "candle_is_green", "candle_is_red", "candle_body_gt", "consecutive_green", "consecutive_red", "doji", "engulfing_bullish", "engulfing_bearish"
- Indicators: "rsi_above", "rsi_below", "macd_cross_up", "macd_cross_down", "macd_positive", "macd_negative", "ema_cross_up", "ema_cross_down", "price_above_ema", "price_below_ema", "price_above_bb_upper", "price_below_bb_lower", "bb_squeeze"
- Volume: "volume_above_avg", "volume_below_avg", "volume_spike"
- Time: "every_candle" (DCA), "every_n_candles"
- Meta: "has_no_open_trades", "has_open_trades"

## Config structure for SYSTEMATIC:

The portfolio instruments array MUST list every instrument+timeframe combination the agent needs data for.
The engine builds a separate MarketSnapshot per timeframe, so conditions on different timeframes evaluate independently.

CRITICAL — MULTI-TIMEFRAME RULES:
When a strategy references multiple timeframes (e.g. "M5 candles are red and H4 is green"), EVERY condition
MUST include a "timeframe" param matching one of the portfolio instrument entries.
Without it, all conditions evaluate against the primary (fastest) timeframe and may contradict each other.

Example of CORRECT multi-timeframe rules:
{
  "portfolio": {"instruments": [{"instrument": "EUR_USD", "timeframe": "M15"}, {"instrument": "EUR_USD", "timeframe": "H4"}]},
  "rules": {
    "buy_rules": {"operator": "and", "conditions": [
      {"type": "consecutive_red", "params": {"count": 3, "timeframe": "M15"}},
      {"type": "candle_is_green", "params": {"timeframe": "H4"}},
      {"type": "rsi_below", "params": {"threshold": 40, "period": 14, "timeframe": "M15"}}
    ]},
    "sell_rules": {"operator": "and", "conditions": [
      {"type": "consecutive_green", "params": {"count": 3, "timeframe": "M15"}},
      {"type": "candle_is_red", "params": {"timeframe": "H4"}},
      {"type": "rsi_above", "params": {"threshold": 60, "period": 14, "timeframe": "M15"}}
    ]}
  },
  "exit": {
    "stop_loss_pct": 2.0,
    "take_profit_pct": 4.0
    ${exit_config?.trailing_stop ? ', "trailing_stop_pct": ...' : ""}
    ${exit_config?.max_daily_loss_pct ? ', "max_daily_loss_pct": ...' : ""}
    ${exit_config?.daily_profit_target_pct ? ', "daily_profit_target_pct": ...' : ""}
  }
}

If only ONE timeframe is referenced, the "timeframe" param is optional (defaults to the primary TF).
If the user does not mention any specific timeframe, default to H1 and omit the "timeframe" params.

## For DISCRETIONARY agents, config includes: llm_provider, llm_model, personality, focus_areas, use_web_search, use_news_feed, evaluation_schedule, portfolio, exit

Use the EXACT instruments the user selected. Determine timeframes from the entry/exit description.
Use the exit values the user specified (stop_loss_pct, take_profit_pct, etc) — do NOT invent different values.

IMPORTANT: Always generate both buy_rules AND sell_rules for systematic agents. Always include an "exit" object. Only use condition types from the Available list above — do NOT invent new types. Only return valid JSON.`;

  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return NextResponse.json({ error: errText }, { status: resp.status });
    }

    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: "No response from AI" },
        { status: 500 }
      );
    }

    const generated = JSON.parse(content);

    // Consume credits after successful generation
    await (supabase.rpc as Function)("consume_credits", {
      p_user_id: user.id,
      p_amount: CREDIT_COSTS.agentGeneration,
      p_action: "agent_generation",
      p_agent_id: null,
      p_description: `Generated ${agent_type ?? "systematic"} agent`,
    });

    return NextResponse.json(generated);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Generation failed" },
      { status: 500 }
    );
  }
}
