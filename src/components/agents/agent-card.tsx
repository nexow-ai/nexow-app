import { Badge } from "@/components/ui/badge";
import { AgentStatusBadge } from "./agent-status-badge";
import { Bot, Brain } from "lucide-react";
import Link from "next/link";
import type { Database } from "@/lib/types/database";

type Agent = Database["public"]["Tables"]["agents"]["Row"];

interface AgentCardProps {
  agent: Agent;
  performance?: {
    total_return_pct: number;
    win_rate: number;
    avg_return_pct: number;
    total_trades: number;
  };
}

export function AgentCard({ agent, performance }: AgentCardProps) {
  return (
    <Link href={`/agents/${agent.id}`}>
      <div className="group relative overflow-hidden rounded-2xl border border-zinc-800/40 bg-zinc-900/30 p-5 backdrop-blur-sm transition-all duration-300 hover:border-zinc-700/50 hover:bg-zinc-900/50 hover:shadow-lg hover:shadow-black/20">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        <div className="relative">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/10">
                {agent.type === "discretionary" ? (
                  <Brain className="h-5 w-5 text-purple-400" />
                ) : (
                  <Bot className="h-5 w-5 text-emerald-400" />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-zinc-100 group-hover:text-white transition-colors">{agent.name}</h3>
                <p className="text-xs text-zinc-600">{agent.instrument.replace("_", "/")} &middot; {agent.timeframe}</p>
              </div>
            </div>
            <AgentStatusBadge status={agent.status} />
          </div>

          {agent.description && (
            <p className="mt-3 text-sm text-zinc-500 line-clamp-2 leading-relaxed">{agent.description}</p>
          )}

          <div className="mt-4 flex items-center gap-3">
            <Badge variant={agent.type === "systematic" ? "info" : "warning"}>
              {agent.type}
            </Badge>

            {performance && (
              <div className="flex items-center gap-3 text-xs">
                <span className={performance.total_return_pct >= 0 ? "text-emerald-400" : "text-red-400"}>
                  {performance.total_return_pct >= 0 ? "+" : ""}{performance.total_return_pct.toFixed(2)}%
                </span>
                <span className="text-zinc-600">|</span>
                <span className="text-zinc-500">{performance.win_rate.toFixed(0)}% WR</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
