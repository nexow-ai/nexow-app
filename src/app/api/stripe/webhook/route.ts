import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe/server";
import { PLANS, type PlanId } from "@/lib/stripe/plans";
import type Stripe from "stripe";

// Use service role client to bypass RLS
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}

function getPlanByPriceId(priceId: string): PlanId {
  for (const plan of PLANS) {
    if (
      plan.stripePriceIdMonthly === priceId ||
      plan.stripePriceIdYearly === priceId
    ) {
      return plan.id;
    }
  }
  return "free";
}

async function handleSubscriptionCreatedOrUpdated(
  subscription: Stripe.Subscription
) {
  const supabase = getServiceClient();
  const userId = subscription.metadata.supabase_user_id;
  if (!userId) return;

  const firstItem = subscription.items.data[0];
  const priceId = firstItem?.price?.id;
  const planId = priceId ? getPlanByPriceId(priceId) : "free";
  const plan = PLANS.find((p) => p.id === planId) ?? PLANS[0];

  const status = subscription.status as string;
  let subStatus: string;
  switch (status) {
    case "active":
      subStatus = "active";
      break;
    case "past_due":
      subStatus = "past_due";
      break;
    case "trialing":
      subStatus = "trialing";
      break;
    case "canceled":
      subStatus = "canceled";
      break;
    default:
      subStatus = "incomplete";
  }

  // Get billing period from the first subscription item
  const periodStart = firstItem?.current_period_start;
  const periodEnd = firstItem?.current_period_end;

  // Update subscription
  await supabase
    .from("subscriptions")
    .update({
      tier: planId,
      status: subStatus,
      stripe_subscription_id: subscription.id,
      stripe_price_id: priceId ?? null,
      current_period_start: periodStart
        ? new Date(periodStart * 1000).toISOString()
        : null,
      current_period_end: periodEnd
        ? new Date(periodEnd * 1000).toISOString()
        : null,
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  // Reset credits for new billing period
  if (periodStart && periodEnd) {
    await supabase.rpc("reset_user_credits", {
      p_user_id: userId,
      p_new_limit: plan.limits.monthlyCredits,
      p_period_start: new Date(periodStart * 1000).toISOString(),
      p_period_end: new Date(periodEnd * 1000).toISOString(),
    });
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const supabase = getServiceClient();
  const userId = subscription.metadata.supabase_user_id;
  if (!userId) return;

  // Downgrade to free
  await supabase
    .from("subscriptions")
    .update({
      tier: "free",
      status: "canceled",
      stripe_subscription_id: null,
      stripe_price_id: null,
      current_period_start: null,
      current_period_end: null,
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  // Reset credits to free tier
  const freePlan = PLANS[0];
  await supabase.rpc("reset_user_credits", {
    p_user_id: userId,
    p_new_limit: freePlan.limits.monthlyCredits,
    p_period_start: new Date().toISOString(),
    p_period_end: new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000
    ).toISOString(),
  });
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const supabase = getServiceClient();

  // In Stripe v20+, subscription is nested under parent.subscription_details
  const subDetails = invoice.parent?.subscription_details;
  const subscriptionRef = subDetails?.subscription;
  const subscriptionId =
    typeof subscriptionRef === "string"
      ? subscriptionRef
      : subscriptionRef?.id;

  if (!subscriptionId) return;

  // Find user by subscription
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("user_id, tier")
    .eq("stripe_subscription_id", subscriptionId)
    .single();

  if (!sub) return;

  const plan =
    PLANS.find((p) => p.id === (sub as { tier: string }).tier) ?? PLANS[0];

  // Reset credits on renewal using invoice period
  const periodEnd = invoice.period_end;
  const periodStart = invoice.period_start;

  if (periodStart && periodEnd) {
    await supabase.rpc("reset_user_credits", {
      p_user_id: (sub as { user_id: string }).user_id,
      p_new_limit: plan.limits.monthlyCredits,
      p_period_start: new Date(periodStart * 1000).toISOString(),
      p_period_end: new Date(periodEnd * 1000).toISOString(),
    });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionCreatedOrUpdated(
          event.data.object as Stripe.Subscription
        );
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription
        );
        break;

      case "invoice.paid":
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      default:
        break;
    }
  } catch (err) {
    console.error(`Error handling webhook event ${event.type}:`, err);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
