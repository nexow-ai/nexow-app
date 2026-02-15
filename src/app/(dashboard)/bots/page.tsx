"use client";

import { AgentCard } from "@/components/agents/agent-card";
import { Button } from "@/components/ui/button";
import { useAgents } from "@/hooks/use-agents";
import { Loader2, Plus, Zap } from "lucide-react";
import Link from "next/link";

export default function BotsPage() {
  const { agents: bots, loading, error } = useAgents("bot");

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">My Bots</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Rule-based trading bots that can be backtested.
          </p>
        </div>
        <Link href="/bots/new">
          <Button>
            <Plus className="h-4 w-4" />
            Create Bot
          </Button>
        </Link>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-600" />
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-center">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {!loading && !error && bots.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-800/40 bg-zinc-900/20 py-20 text-center backdrop-blur-sm">
          <div className="mb-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 p-5">
            <Zap className="h-8 w-8 text-emerald-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">No bots yet</h3>
          <p className="mt-2 max-w-sm text-sm text-zinc-500">
            Create your first trading bot using natural language. Define
            rule-based entry/exit signals and backtest before deploying.
          </p>
          <Link href="/bots/new" className="mt-8">
            <Button>
              <Plus className="h-4 w-4" />
              Create Your First Bot
            </Button>
          </Link>
        </div>
      )}

      {!loading && bots.length > 0 && (
        <div className="stagger-children grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {bots.map((bot) => (
            <AgentCard key={bot.id} agent={bot} linkPrefix="/bots" />
          ))}
        </div>
      )}
    </div>
  );
}
