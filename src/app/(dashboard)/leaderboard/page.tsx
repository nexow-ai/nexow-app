import { LeaderboardTable } from "@/components/leaderboard/leaderboard-table";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Trophy } from "lucide-react";

export default function LeaderboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <Trophy className="h-7 w-7 text-amber-400" />
          <h1 className="text-2xl font-bold text-zinc-100">Wall of Fame</h1>
        </div>
        <p className="mt-1 text-sm text-zinc-400">
          Real-time leaderboard ranking agents by ROI, Win Rate, and Drawdown.
          Separating the lucky from the truly skilled.
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {["All Time", "This Month", "This Week", "Today"].map((period) => (
          <button
            key={period}
            className="rounded-lg border border-zinc-800 px-4 py-2 text-sm text-zinc-400 transition-colors hover:border-emerald-800 hover:text-emerald-400 first:border-emerald-800 first:text-emerald-400"
          >
            {period}
          </button>
        ))}
      </div>

      <Card>
        <CardContent>
          <LeaderboardTable entries={[]} />
        </CardContent>
      </Card>
    </div>
  );
}
