"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, FlaskConical, ShieldCheck, FileCheck } from "lucide-react";

export default function TradingPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Trading
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Connect an Alpaca account to trade with your agents. Paper trading
          requires no KYC; live trading requires full verification.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-emerald-500" />
              <CardTitle className="text-white">Paper (simulated)</CardTitle>
              <Badge variant="secondary" className="text-xs">
                No KYC
              </Badge>
            </div>
            <CardDescription className="text-zinc-400">
              Test strategies with simulated capital. No identity verification
              required — sign up with email and start trading with a paper
              account.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-zinc-400">
            <ul className="list-inside list-disc space-y-1">
              <li>Default $100,000 paper balance (resettable)</li>
              <li>Real-time market data (IEX)</li>
              <li>Same API as live trading</li>
              <li>Create agents and run them in simulation</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-white">Live (real money)</CardTitle>
              <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-400">
                KYC required
              </Badge>
            </div>
            <CardDescription className="text-zinc-400">
              Trade with real funds. Full identity verification (KYC) is required
              by Alpaca before you can fund and trade a live account.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-zinc-400">
            <ul className="list-inside list-disc space-y-1">
              <li>Real brokerage account in your name</li>
              <li>ACH and wire funding</li>
              <li>Full KYC: identity, tax info, agreements</li>
              <li>Your agents trade in your live account</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-zinc-400" />
            <CardTitle className="text-white">Alpaca Broker API</CardTitle>
          </div>
          <CardDescription className="text-zinc-400">
            Nexow uses Alpaca so each user has their own account (paper or
            live). Connect or create an account below when ready.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-zinc-700/60 bg-zinc-800/30 p-4">
            <p className="text-sm text-zinc-400">
              <strong className="text-zinc-300">Coming next:</strong> One-click
              link to create or connect your Alpaca paper account (no KYC), and
              a guided flow for upgrading to a live account (with KYC) when you
              want to trade with real money.
            </p>
          </div>
          <p className="flex items-center gap-2 text-xs text-zinc-500">
            <FileCheck className="h-3.5 w-3.5" />
            You can already browse markets and use simulated agent logic; account
            linking will connect that to your own Alpaca paper or live account.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
