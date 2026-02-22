export type PlanId = "free" | "starter" | "pro" | "elite";

export interface PlanLimits {
  maxBots: number;
  maxAgents: number;
  monthlyCredits: number;
  maxConcurrentAgents: number;
  aiAgents: boolean;
  copyTrading: boolean;
  priorityExecution: boolean;
}

export interface Plan {
  id: PlanId;
  name: string;
  description: string;
  price: number;
  yearlyPrice: number;
  stripePriceIdMonthly: string;
  stripePriceIdYearly: string;
  limits: PlanLimits;
  popular?: boolean;
}

/**
 * Credit costs for different operations.
 * Bots only use credits during generation (one-time).
 * Agents use credits every evaluation cycle.
 * Lab messages cost varies by model tier.
 */
export const CREDIT_COSTS = {
  agentGeneration: 5,
  agentEvaluation: 1,
  agentRegeneration: 3,
} as const;

/**
 * Credit cost per Lab message by model ID.
 * Cheaper/faster models cost less; premium/reasoning models cost more.
 */
export const LAB_MODEL_CREDITS: Record<string, number> = {
  // OpenAI
  "gpt-4.1-nano": 1,
  "gpt-4.1-mini": 2,
  "gpt-4.1": 5,
  "o3-mini": 8,
  // Anthropic
  "claude-3-5-haiku-20241022": 2,
  "claude-sonnet-4-20250514": 5,
  // Google
  "gemini-2.0-flash": 1,
  "gemini-2.5-flash": 2,
  "gemini-2.5-pro": 5,
  // DeepSeek
  "deepseek-chat": 1,
  "deepseek-reasoner": 3,
} as const;

/** Default credit cost for unknown models. */
export const LAB_DEFAULT_CREDITS = 3;

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    description: "Get started with basic trading agents",
    price: 0,
    yearlyPrice: 0,
    stripePriceIdMonthly: "",
    stripePriceIdYearly: "",
    limits: {
      maxBots: 2,
      maxAgents: 0,
      monthlyCredits: 100,
      maxConcurrentAgents: 1,
      aiAgents: false,
      copyTrading: false,
      priorityExecution: false,
    },
  },
  {
    id: "starter",
    name: "Starter",
    description: "For active traders building their first strategies",
    price: 29,
    yearlyPrice: 288,
    stripePriceIdMonthly:
      process.env.NEXT_PUBLIC_STRIPE_STARTER_MONTHLY_PRICE_ID ?? "",
    stripePriceIdYearly:
      process.env.NEXT_PUBLIC_STRIPE_STARTER_YEARLY_PRICE_ID ?? "",
    limits: {
      maxBots: 10,
      maxAgents: 3,
      monthlyCredits: 1_000,
      maxConcurrentAgents: 5,
      aiAgents: true,
      copyTrading: true,
      priorityExecution: false,
    },
  },
  {
    id: "pro",
    name: "Pro",
    description: "For serious traders running multiple strategies",
    price: 79,
    yearlyPrice: 792,
    stripePriceIdMonthly:
      process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID ?? "",
    stripePriceIdYearly:
      process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID ?? "",
    popular: true,
    limits: {
      maxBots: 50,
      maxAgents: 15,
      monthlyCredits: 5_000,
      maxConcurrentAgents: 20,
      aiAgents: true,
      copyTrading: true,
      priorityExecution: true,
    },
  },
  {
    id: "elite",
    name: "Elite",
    description: "Unlimited power for professional quant traders",
    price: 199,
    yearlyPrice: 1_992,
    stripePriceIdMonthly:
      process.env.NEXT_PUBLIC_STRIPE_ELITE_MONTHLY_PRICE_ID ?? "",
    stripePriceIdYearly:
      process.env.NEXT_PUBLIC_STRIPE_ELITE_YEARLY_PRICE_ID ?? "",
    limits: {
      maxBots: -1,
      maxAgents: -1,
      monthlyCredits: 25_000,
      maxConcurrentAgents: -1,
      aiAgents: true,
      copyTrading: true,
      priorityExecution: true,
    },
  },
];

export function getPlan(id: PlanId): Plan {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}

export function formatCredits(credits: number): string {
  if (credits >= 1000)
    return `${(credits / 1000).toFixed(credits % 1000 === 0 ? 0 : 1)}k`;
  return credits.toString();
}

export function isUnlimited(value: number): boolean {
  return value === -1;
}
