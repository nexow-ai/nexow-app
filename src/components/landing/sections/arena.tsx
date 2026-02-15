"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Crown, Medal, Award, TrendingUp, Trophy } from "lucide-react";
import dynamic from "next/dynamic";

const ArenaGrid = dynamic(
  () => import("../arena-grid").then((m) => ({ default: m.ArenaGrid })),
  { ssr: false }
);

interface AgentData {
  rank: number;
  name: string;
  creator: string;
  strategy: "Systematic" | "Discretionary";
  roi: number;
  winRate: number;
  maxDrawdown: number;
  copiers: number;
  sparkline: number[];
}

const mockAgents: AgentData[] = [
  {
    rank: 1,
    name: "AlphaScalper",
    creator: "@nakamoto",
    strategy: "Systematic",
    roi: 42.8,
    winRate: 68,
    maxDrawdown: -4.2,
    copiers: 312,
    sparkline: [20, 25, 22, 30, 35, 33, 40, 38, 42, 45, 43, 48],
  },
  {
    rank: 2,
    name: "TrendRider Pro",
    creator: "@satoshi_fx",
    strategy: "Discretionary",
    roi: 38.1,
    winRate: 72,
    maxDrawdown: -6.1,
    copiers: 287,
    sparkline: [15, 18, 20, 19, 24, 28, 30, 29, 33, 35, 37, 40],
  },
  {
    rank: 3,
    name: "MomentumBot v3",
    creator: "@quant_ella",
    strategy: "Systematic",
    roi: 31.4,
    winRate: 65,
    maxDrawdown: -5.8,
    copiers: 198,
    sparkline: [10, 12, 15, 14, 18, 20, 19, 23, 25, 28, 30, 32],
  },
  {
    rank: 4,
    name: "GoldHunter AI",
    creator: "@midas_trade",
    strategy: "Discretionary",
    roi: 28.7,
    winRate: 71,
    maxDrawdown: -3.9,
    copiers: 156,
    sparkline: [8, 10, 12, 15, 14, 18, 20, 22, 25, 24, 27, 30],
  },
  {
    rank: 5,
    name: "FX Reversion",
    creator: "@mean_rev",
    strategy: "Systematic",
    roi: 24.3,
    winRate: 74,
    maxDrawdown: -2.8,
    copiers: 143,
    sparkline: [5, 8, 7, 10, 12, 14, 13, 16, 18, 20, 22, 25],
  },
  {
    rank: 6,
    name: "CryptoSentinel",
    creator: "@chain_sage",
    strategy: "Discretionary",
    roi: 21.9,
    winRate: 62,
    maxDrawdown: -8.4,
    copiers: 234,
    sparkline: [12, 10, 14, 18, 15, 20, 22, 19, 24, 26, 23, 28],
  },
  {
    rank: 7,
    name: "Index Surfer",
    creator: "@wave_trader",
    strategy: "Systematic",
    roi: 19.2,
    winRate: 66,
    maxDrawdown: -5.1,
    copiers: 98,
    sparkline: [6, 8, 10, 9, 12, 14, 16, 15, 18, 19, 20, 22],
  },
  {
    rank: 8,
    name: "NewsPulse AI",
    creator: "@newsbot_fx",
    strategy: "Discretionary",
    roi: 17.6,
    winRate: 59,
    maxDrawdown: -7.2,
    copiers: 167,
    sparkline: [4, 6, 8, 7, 10, 12, 11, 14, 15, 16, 18, 20],
  },
];

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/15 ring-1 ring-amber-500/30">
        <Crown className="h-4 w-4 text-amber-400" />
      </div>
    );
  if (rank === 2)
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-400/10 ring-1 ring-zinc-400/20">
        <Medal className="h-4 w-4 text-zinc-300" />
      </div>
    );
  if (rank === 3)
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-700/15 ring-1 ring-amber-700/30">
        <Award className="h-4 w-4 text-amber-600" />
      </div>
    );
  return (
    <div className="flex h-8 w-8 items-center justify-center">
      <span className="text-sm font-mono font-bold text-zinc-600">#{rank}</span>
    </div>
  );
}

function MiniSparkline({ data, positive }: { data: number[]; positive: boolean }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 80;
  const h = 28;
  const padding = 2;

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = padding + (h - padding * 2) - ((v - min) / range) * (h - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  const gradientId = `sparkline-${data[0]}-${data[data.length - 1]}`;
  const areaPoints = `0,${h} ${points} ${w},${h}`;

  return (
    <svg width={w} height={h} className="flex-shrink-0">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={positive ? "#10b981" : "#ef4444"} stopOpacity="0.3" />
          <stop offset="100%" stopColor={positive ? "#10b981" : "#ef4444"} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#${gradientId})`} />
      <polyline
        points={points}
        fill="none"
        stroke={positive ? "#10b981" : "#ef4444"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Arena() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section id="arena" ref={ref} className="relative py-32 overflow-hidden">
      <ArenaGrid />

      <div className="relative z-10 mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-5 py-2 text-sm font-medium text-amber-400 shadow-lg shadow-amber-500/5"
          >
            <Trophy className="h-3.5 w-3.5" />
            Live Rankings
          </motion.div>
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            The Arena
          </h2>
          <p className="mt-4 text-lg text-zinc-500 max-w-xl mx-auto">
            Top-performing trading agents ranked by real results. Skill over luck.
          </p>
        </motion.div>

        {/* Desktop table */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="hidden md:block"
        >
          <div className="overflow-hidden rounded-2xl border border-zinc-800/50 bg-zinc-900/50 backdrop-blur-xl shadow-2xl shadow-black/20">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800/60 bg-zinc-900/40">
                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Rank</th>
                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Agent</th>
                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Type</th>
                  <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-wider text-zinc-500">ROI (30d)</th>
                  <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Win Rate</th>
                  <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Max DD</th>
                  <th className="px-5 py-4 text-center text-[11px] font-semibold uppercase tracking-wider text-zinc-500">30d Chart</th>
                  <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Copiers</th>
                  <th className="px-5 py-4"></th>
                </tr>
              </thead>
              <tbody>
                {mockAgents.map((agent, i) => (
                  <motion.tr
                    key={agent.name}
                    initial={{ opacity: 0, x: -30 }}
                    animate={inView ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.5, delay: 0.3 + 0.07 * i }}
                    className={`border-b border-zinc-800/20 transition-colors duration-200 hover:bg-emerald-500/[0.03] ${
                      agent.rank <= 3 ? "bg-zinc-800/10" : ""
                    }`}
                  >
                    <td className="px-5 py-3.5">
                      <RankBadge rank={agent.rank} />
                    </td>
                    <td className="px-5 py-3.5">
                      <div>
                        <p className="font-semibold text-white text-sm">{agent.name}</p>
                        <p className="text-xs text-zinc-600 mt-0.5">{agent.creator}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                        agent.strategy === "Systematic"
                          ? "bg-cyan-500/10 text-cyan-400 ring-1 ring-cyan-500/20"
                          : "bg-purple-500/10 text-purple-400 ring-1 ring-purple-500/20"
                      }`}>
                        {agent.strategy}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="font-mono font-bold text-emerald-400 text-sm">+{agent.roi}%</span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="font-mono text-sm text-zinc-300">{agent.winRate}%</span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="font-mono text-sm text-red-400/80">{agent.maxDrawdown}%</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-center">
                        <MiniSparkline data={agent.sparkline} positive={agent.roi > 0} />
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="text-sm text-zinc-400 font-medium">{agent.copiers}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <Button variant="ghost" size="sm" className="text-xs text-zinc-400 hover:text-emerald-400">
                        <Copy className="h-3 w-3 mr-1" />
                        Copy
                      </Button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          {mockAgents.slice(0, 5).map((agent, i) => (
            <motion.div
              key={agent.name}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.3 + 0.1 * i }}
              className="rounded-xl border border-zinc-800/50 bg-zinc-900/50 p-4 backdrop-blur-md"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <RankBadge rank={agent.rank} />
                  <div>
                    <p className="font-semibold text-white text-sm">{agent.name}</p>
                    <p className="text-xs text-zinc-600">{agent.creator}</p>
                  </div>
                </div>
                <MiniSparkline data={agent.sparkline} positive={agent.roi > 0} />
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-zinc-800/30 py-2">
                  <p className="text-[10px] text-zinc-500 uppercase">ROI</p>
                  <p className="font-mono text-sm font-bold text-emerald-400">+{agent.roi}%</p>
                </div>
                <div className="rounded-lg bg-zinc-800/30 py-2">
                  <p className="text-[10px] text-zinc-500 uppercase">Win Rate</p>
                  <p className="font-mono text-sm text-zinc-300">{agent.winRate}%</p>
                </div>
                <div className="rounded-lg bg-zinc-800/30 py-2">
                  <p className="text-[10px] text-zinc-500 uppercase">Copiers</p>
                  <p className="text-sm text-zinc-300 font-medium">{agent.copiers}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 1 }}
          className="mt-10 text-center"
        >
          <Button variant="outline" size="lg">
            View Full Rankings
            <TrendingUp className="ml-2 h-4 w-4" />
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
