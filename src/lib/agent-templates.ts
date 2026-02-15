/**
 * Pre-built agent templates for common trading strategies.
 * Users can one-click deploy or customize these.
 */

export interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  agent_type: "systematic" | "discretionary";
  difficulty: "beginner" | "intermediate" | "advanced";
  tags: string[];
  prompt: string;
  config: Record<string, unknown>;
}

export const AGENT_TEMPLATES: AgentTemplate[] = [
  {
    id: "conservative-gold-rsi",
    name: "Conservative Gold RSI",
    description:
      "A cautious Gold trader that buys oversold dips and sells overbought peaks using RSI 14 on H1.",
    agent_type: "systematic",
    difficulty: "beginner",
    tags: ["Gold", "RSI", "Conservative", "H1"],
    prompt: "Conservative Gold trader using RSI on H1",
    config: {
      portfolio: {
        instruments: [{ instrument: "XAU_USD", timeframe: "H1" }],
      },
      rules: {
        buy_rules: {
          operator: "and",
          conditions: [
            { type: "rsi_below", params: { threshold: 30, period: 14 } },
            { type: "candle_is_green" },
          ],
        },
        sell_rules: {
          operator: "and",
          conditions: [
            { type: "rsi_above", params: { threshold: 70, period: 14 } },
            { type: "candle_is_red" },
          ],
        },
      },
      exit: { stop_loss_pct: 2.0, take_profit_pct: 4.0 },
    },
  },
  {
    id: "eur-usd-macd-scalper",
    name: "EUR/USD MACD Scalper",
    description:
      "Fast M5 scalper on EUR/USD using MACD crossovers with tight exits.",
    agent_type: "systematic",
    difficulty: "intermediate",
    tags: ["EUR/USD", "MACD", "Scalping", "M5"],
    prompt: "EUR/USD scalper using MACD crossovers on M5",
    config: {
      portfolio: {
        instruments: [{ instrument: "EUR_USD", timeframe: "M5" }],
      },
      rules: {
        buy_rules: {
          operator: "and",
          conditions: [{ type: "macd_cross_up" }],
        },
        sell_rules: {
          operator: "and",
          conditions: [{ type: "macd_cross_down" }],
        },
      },
      exit: { stop_loss_pct: 0.3, take_profit_pct: 0.6 },
    },
  },
  {
    id: "forex-duo-ema-bb",
    name: "Forex Duo: EMA + Bollinger",
    description:
      "Trades EUR/USD and GBP/USD with EMA crossover confirmed by Bollinger Bands.",
    agent_type: "systematic",
    difficulty: "intermediate",
    tags: ["Portfolio", "EMA", "Bollinger", "M15"],
    prompt:
      "EUR/USD and GBP/USD using EMA crossover with Bollinger Band confirmation on M15",
    config: {
      portfolio: {
        instruments: [
          { instrument: "EUR_USD", timeframe: "M15" },
          { instrument: "GBP_USD", timeframe: "M15" },
        ],
      },
      rules: {
        buy_rules: {
          operator: "and",
          conditions: [
            { type: "ema_cross_up", params: { fast: 9, slow: 21 } },
            { type: "price_below_bb_lower", params: { period: 20, std: 2.0 } },
          ],
        },
        sell_rules: {
          operator: "and",
          conditions: [
            { type: "ema_cross_down", params: { fast: 9, slow: 21 } },
            { type: "price_above_bb_upper", params: { period: 20, std: 2.0 } },
          ],
        },
      },
      exit: { stop_loss_pct: 1.5, take_profit_pct: 3.0 },
    },
  },
  {
    id: "news-trader-gold",
    name: "News-Aware Gold Trader",
    description:
      "A discretionary agent that reads financial news and market analysis before deciding on Gold trades.",
    agent_type: "discretionary",
    difficulty: "advanced",
    tags: ["Gold", "News", "AI", "Discretionary"],
    prompt:
      "Smart news-aware Gold trader that analyzes market sentiment before trading on H1",
    config: {
      llm_provider: "openai",
      llm_model: "gpt-4o-mini",
      personality: "cautious",
      reasoning_depth: 3,
      portfolio: {
        instruments: [{ instrument: "XAU_USD", timeframe: "H1" }],
      },
      focus_areas: [
        "technical_analysis",
        "news_sentiment",
        "economic_calendar",
      ],
      use_web_search: true,
      use_news_feed: true,
      evaluation_schedule: "hourly",
      exit: { stop_loss_pct: 3.0, take_profit_pct: 6.0 },
    },
  },
  {
    id: "multi-asset-confluence",
    name: "Multi-Asset RSI + MACD",
    description:
      "Diversified portfolio across 4 instruments with RSI + MACD confluence on H1.",
    agent_type: "systematic",
    difficulty: "advanced",
    tags: ["Portfolio", "Diversified", "Confluence", "H1"],
    prompt:
      "Multi-asset portfolio: EUR/USD, XAU/USD, GBP/USD, USD/JPY with RSI + MACD confluence on H1",
    config: {
      portfolio: {
        instruments: [
          { instrument: "EUR_USD", timeframe: "H1" },
          { instrument: "XAU_USD", timeframe: "H1" },
          { instrument: "GBP_USD", timeframe: "H1" },
          { instrument: "USD_JPY", timeframe: "H1" },
        ],
      },
      rules: {
        buy_rules: {
          operator: "and",
          conditions: [
            { type: "rsi_below", params: { threshold: 35, period: 14 } },
            { type: "macd_cross_up" },
          ],
        },
        sell_rules: {
          operator: "and",
          conditions: [
            { type: "rsi_above", params: { threshold: 65, period: 14 } },
            { type: "macd_cross_down" },
          ],
        },
      },
      exit: { stop_loss_pct: 2.0, take_profit_pct: 5.0 },
    },
  },
];
