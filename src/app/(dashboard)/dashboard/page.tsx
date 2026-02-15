import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, ArrowRight, Bot, DollarSign, Plus, TrendingUp } from "lucide-react";
import Link from "next/link";

const stats = [
  {
    title: "Active Agents",
    value: "0",
    change: "+0 this week",
    icon: Bot,
    gradient: "from-emerald-500/20 to-emerald-500/5",
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-400",
  },
  {
    title: "Total Return",
    value: "0.00%",
    change: "Gross return across all agents",
    icon: TrendingUp,
    gradient: "from-cyan-500/20 to-cyan-500/5",
    iconBg: "bg-cyan-500/10",
    iconColor: "text-cyan-400",
  },
  {
    title: "Win Rate",
    value: "—",
    change: "Need 5+ signals",
    icon: DollarSign,
    gradient: "from-amber-500/20 to-amber-500/5",
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-400",
  },
  {
    title: "Open Signals",
    value: "0",
    change: "Across all agents",
    icon: Activity,
    gradient: "from-purple-500/20 to-purple-500/5",
    iconBg: "bg-purple-500/10",
    iconColor: "text-purple-400",
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Overview of your trading agents and signal performance.
        </p>
      </div>

      {/* Stats grid */}
      <div className="stagger-children grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.title}
            className="group relative overflow-hidden rounded-2xl border border-zinc-800/40 bg-zinc-900/30 p-5 backdrop-blur-sm transition-all duration-300 hover:border-zinc-700/50"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">{stat.title}</p>
                <p className="mt-2 text-3xl font-bold tracking-tight text-white animate-count-up">
                  {stat.value}
                </p>
                <p className="mt-1 text-xs text-zinc-600">{stat.change}</p>
              </div>
              <div className={`rounded-xl ${stat.iconBg} p-2.5`}>
                <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Signals */}
        <Card>
          <CardTitle>Recent Signals</CardTitle>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 rounded-2xl bg-zinc-800/50 p-4">
                <Activity className="h-6 w-6 text-zinc-600" />
              </div>
              <p className="text-sm font-medium text-zinc-400">No signals yet</p>
              <p className="mt-1 max-w-xs text-xs text-zinc-600">
                Create an agent and it will start generating trading signals automatically when market conditions align.
              </p>
              <Link href="/agents/new" className="mt-5">
                <Button size="sm">
                  <Plus className="h-3.5 w-3.5" />
                  Create Agent
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardTitle>Quick Actions</CardTitle>
          <CardContent>
            <div className="mt-2 space-y-3">
              {[
                { title: "Create a Trading Agent", desc: "Build a new signal-generating agent from a prompt", href: "/agents/new", icon: Bot, color: "emerald" },
                { title: "View Leaderboard", desc: "See the top-performing agents by return %", href: "/leaderboard", icon: TrendingUp, color: "amber" },
                { title: "Explore Copy Trading", desc: "Follow and copy top agents' signals", href: "/copy", icon: DollarSign, color: "cyan" },
              ].map((action) => (
                <Link
                  key={action.title}
                  href={action.href}
                  className="group flex items-center gap-4 rounded-xl border border-zinc-800/40 bg-zinc-900/20 p-4 transition-all duration-200 hover:border-zinc-700/50 hover:bg-zinc-900/40"
                >
                  <div className={`rounded-xl bg-${action.color}-500/10 p-2.5`}>
                    <action.icon className={`h-5 w-5 text-${action.color}-400`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-zinc-200">{action.title}</p>
                    <p className="text-xs text-zinc-600">{action.desc}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-zinc-700 transition-transform group-hover:translate-x-1 group-hover:text-zinc-400" />
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
