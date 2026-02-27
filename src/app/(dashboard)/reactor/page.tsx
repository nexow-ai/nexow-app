"use client";

export const dynamic = "force-dynamic";

import { ReactorPanel } from "@/components/reactor/reactor-panel";
import { ReactorOverview } from "@/components/reactor/reactor-overview";
import { Button } from "@/components/ui/button";
import { useReactorConfigs } from "@/hooks/use-reactor";
import { cn } from "@/lib/utils";
import { Activity, BarChart3, Loader2, Plus, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";

const INSTRUMENTS = [
  { id: "EUR_USD", label: "EUR/USD" },
] as const;

type Tab = "reactors" | "market";

export default function ReactorPage() {
  const { configs, loading, error, refetch } = useReactorConfigs();
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabParam = searchParams.get("tab");
  const activeTab: Tab = tabParam === "market" ? "market" : "reactors";
  const setActiveTab = useCallback((tab: Tab) => {
    router.replace(tab === "market" ? "/reactor?tab=market" : "/reactor");
  }, [router]);

  const [instrument, setInstrument] = useState(INSTRUMENTS[0].id);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const handleToggleActive = useCallback(async (configId: string, currentActive: boolean) => {
    setTogglingId(configId);
    try {
      await fetch(`/api/reactor/${configId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !currentActive }),
      });
      refetch();
    } finally {
      setTogglingId(null);
    }
  }, [refetch]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Forex Reactor
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Automated trading configurations for forex pairs.
          </p>
        </div>
        <Link href="/reactor/new">
          <Button>
            <Plus className="h-4 w-4" />
            New Reactor
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-zinc-800/60">
        <button
          onClick={() => setActiveTab("reactors")}
          className={cn(
            "flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-all",
            activeTab === "reactors"
              ? "border-emerald-400 text-zinc-100"
              : "border-transparent text-zinc-500 hover:text-zinc-300"
          )}
        >
          <Zap className="h-3.5 w-3.5" />
          Reactors
          {!loading && configs.length > 0 && (
            <span className="rounded-full bg-zinc-800 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-400">
              {configs.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("market")}
          className={cn(
            "flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-all",
            activeTab === "market"
              ? "border-emerald-400 text-zinc-100"
              : "border-transparent text-zinc-500 hover:text-zinc-300"
          )}
        >
          <BarChart3 className="h-3.5 w-3.5" />
          Market Overview
        </button>
      </div>

      {/* Reactors tab */}
      {activeTab === "reactors" && (
        <>
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

          {!loading && !error && configs.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-800/40 bg-zinc-900/20 py-20 text-center backdrop-blur-sm">
              <div className="mb-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 p-5">
                <Activity className="h-8 w-8 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">No reactors yet</h3>
              <p className="mt-2 max-w-sm text-sm text-zinc-500">
                Create your first reactor configuration. Define instruments,
                risk parameters, and analysis weights to automate your trading.
              </p>
              <Link href="/reactor/new" className="mt-8">
                <Button>
                  <Plus className="h-4 w-4" />
                  Create Your First Reactor
                </Button>
              </Link>
            </div>
          )}

          {!loading && configs.length > 0 && (
            <div className="space-y-4">
              {configs.map((config) => (
                <ReactorPanel
                  key={config.id}
                  config={config}
                  onToggleActive={() => handleToggleActive(config.id, config.is_active)}
                  toggleLoading={togglingId === config.id}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Market Overview tab */}
      {activeTab === "market" && (
        <div className="space-y-4">
          {/* Instrument selector */}
          <div className="flex items-center rounded-lg border border-zinc-800 bg-zinc-900/50 p-0.5 w-fit">
            {INSTRUMENTS.map((inst) => (
              <button
                key={inst.id}
                onClick={() => setInstrument(inst.id)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                  instrument === inst.id
                    ? "bg-zinc-700 text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                {inst.label}
              </button>
            ))}
          </div>

          <ReactorOverview instrument={instrument} />
        </div>
      )}
    </div>
  );
}
