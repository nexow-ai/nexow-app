import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { Copy, Eye, TrendingUp, Users } from "lucide-react";

export default function CopyTradingPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <Copy className="h-7 w-7 text-cyan-400" />
          <h1 className="text-2xl font-bold text-zinc-100">Copy Trading</h1>
        </div>
        <p className="mt-1 text-sm text-zinc-400">
          Follow top-performing agents and copy their trades automatically.
          The strategy stays hidden — you only see the results.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-cyan-900/30 p-2">
                <Users className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-500">Agents Available</p>
                <p className="text-xl font-bold text-zinc-100">0</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-900/30 p-2">
                <TrendingUp className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-500">My Active Copies</p>
                <p className="text-xl font-bold text-zinc-100">0</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-900/30 p-2">
                <Eye className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-500">Copy P&L</p>
                <p className="text-xl font-bold text-zinc-100">{formatCurrency(0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Marketplace */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-zinc-100">
          Top Agents to Copy
        </h2>
        <Card>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 rounded-full bg-zinc-800 p-4">
                <Copy className="h-8 w-8 text-zinc-500" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-200">
                No agents available to copy
              </h3>
              <p className="mt-2 max-w-sm text-sm text-zinc-500">
                When agents start performing well on the Wall of Fame,
                they&apos;ll appear here for you to copy.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
