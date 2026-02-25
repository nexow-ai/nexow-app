"use client";

import { ReactorCard } from "@/components/reactor/reactor-card";
import { Button } from "@/components/ui/button";
import { useReactorConfigs } from "@/hooks/use-reactor";
import { Activity, Loader2, Plus } from "lucide-react";
import Link from "next/link";

export default function ReactorPage() {
  const { configs, loading, error } = useReactorConfigs();

  return (
    <div className="space-y-8">
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
            New Config
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

      {!loading && !error && configs.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-800/40 bg-zinc-900/20 py-20 text-center backdrop-blur-sm">
          <div className="mb-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 p-5">
            <Activity className="h-8 w-8 text-emerald-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">No configs yet</h3>
          <p className="mt-2 max-w-sm text-sm text-zinc-500">
            Create your first reactor configuration. Define instruments,
            risk parameters, and analysis weights to automate your trading.
          </p>
          <Link href="/reactor/new" className="mt-8">
            <Button>
              <Plus className="h-4 w-4" />
              Create Your First Config
            </Button>
          </Link>
        </div>
      )}

      {!loading && configs.length > 0 && (
        <div className="stagger-children grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {configs.map((config) => (
            <ReactorCard key={config.id} config={config} />
          ))}
        </div>
      )}
    </div>
  );
}
