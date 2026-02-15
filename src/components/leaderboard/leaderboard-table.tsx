"use client";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { Crown, Medal, Trophy } from "lucide-react";

interface LeaderboardEntry {
  rank: number;
  agent_name: string;
  creator: string;
  instrument: string;
  type: "systematic" | "discretionary";
  roi_pct: number;
  win_rate: number;
  total_pnl: number;
  max_drawdown: number;
  sharpe_ratio: number;
  total_trades: number;
}

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
}

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy className="h-5 w-5 text-amber-400" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-zinc-300" />;
  if (rank === 3) return <Medal className="h-5 w-5 text-amber-700" />;
  return <span className="text-sm text-zinc-500">#{rank}</span>;
}

export function LeaderboardTable({ entries }: LeaderboardTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-16">Rank</TableHead>
          <TableHead>Agent</TableHead>
          <TableHead>Creator</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>ROI</TableHead>
          <TableHead>Win Rate</TableHead>
          <TableHead>P&L</TableHead>
          <TableHead>Max DD</TableHead>
          <TableHead>Sharpe</TableHead>
          <TableHead>Trades</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.length === 0 ? (
          <TableRow>
            <TableCell colSpan={10} className="py-12 text-center text-zinc-500">
              No agents on the leaderboard yet. Be the first!
            </TableCell>
          </TableRow>
        ) : (
          entries.map((entry) => (
            <TableRow key={entry.rank}>
              <TableCell>
                <div className="flex items-center justify-center">
                  <RankIcon rank={entry.rank} />
                </div>
              </TableCell>
              <TableCell className="font-medium text-zinc-100">
                {entry.agent_name}
              </TableCell>
              <TableCell className="text-zinc-400">{entry.creator}</TableCell>
              <TableCell>
                <Badge variant={entry.type === "systematic" ? "info" : "warning"}>
                  {entry.type}
                </Badge>
              </TableCell>
              <TableCell>
                <span className={entry.roi_pct >= 0 ? "text-emerald-400" : "text-red-400"}>
                  {formatPercent(entry.roi_pct)}
                </span>
              </TableCell>
              <TableCell>{entry.win_rate.toFixed(1)}%</TableCell>
              <TableCell>
                <span className={entry.total_pnl >= 0 ? "text-emerald-400" : "text-red-400"}>
                  {formatCurrency(entry.total_pnl)}
                </span>
              </TableCell>
              <TableCell className="text-red-400">
                {entry.max_drawdown.toFixed(1)}%
              </TableCell>
              <TableCell>{entry.sharpe_ratio.toFixed(2)}</TableCell>
              <TableCell>{entry.total_trades}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
