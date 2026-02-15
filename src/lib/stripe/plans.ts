export type PlanId = "free" | "starter" | "pro" | "elite";

export interface PlanLimits {
  maxAgents: number;
  monthlyCredits: number;
  maxConcurrentAgents: number;
  discretionaryAgents: boolean;
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
 * Systematic agents only use credits during generation (one-time).
 * Discretionary agents use credits every evaluation cycle.
 */
export const CREDIT_COSTS = {
  agentGeneration: 5,
  discretionaryEvaluation: 1,
  agentRegeneration: 3,
} as const;

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
      maxAgents: 2,
      monthlyCredits: 100,
      maxConcurrentAgents: 1,
      discretionaryAgents: false,
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
    stripePriceIdMonthly: process.env.NEXT_PUBLIC_STRIPE_STARTER_MONTHLY_PRICE_ID ?? "",
    stripePriceIdYearly: process.env.NEXT_PUBLIC_STRIPE_STARTER_YEARLY_PRICE_ID ?? "",
    limits: {
      maxAgents: 10,
      monthlyCredits: 1_000,
      maxConcurrentAgents: 5,
      discretionaryAgents: true,
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
    stripePriceIdMonthly: process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID ?? "",
    stripePriceIdYearly: process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID ?? "",
    popular: true,
    limits: {
      maxAgents: 50,
      monthlyCredits: 5_000,
      maxConcurrentAgents: 20,
      discretionaryAgents: true,
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
    stripePriceIdMonthly: process.env.NEXT_PUBLIC_STRIPE_ELITE_MONTHLY_PRICE_ID ?? "",
    stripePriceIdYearly: process.env.NEXT_PUBLIC_STRIPE_ELITE_YEARLY_PRICE_ID ?? "",
    limits: {
      maxAgents: -1,
      monthlyCredits: 25_000,
      maxConcurrentAgents: -1,
      discretionaryAgents: true,
      copyTrading: true,
      priorityExecution: true,
    },
  },
];

export function getPlan(id: PlanId): Plan {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}

export function formatCredits(credits: number): string {
  if (credits >= 1000) return `${(credits / 1000).toFixed(credits % 1000 === 0 ? 0 : 1)}k`;
  return credits.toString();
}

export function isUnlimited(value: number): boolean {
  return value === -1;
}
