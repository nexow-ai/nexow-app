"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Bot, Copy, Shield, Trophy, Zap, TrendingUp } from "lucide-react";

const features = [
  {
    icon: Bot,
    title: "No-Code Agent Factory",
    description:
      "Describe your strategy in plain English. Our AI converts it into a precise, executable trading agent — discretionary or systematic.",
    gradient: "from-emerald-500/20 to-emerald-500/0",
    iconColor: "text-emerald-400",
    iconBg: "bg-emerald-500/10 border-emerald-500/20",
    hoverBorder: "hover:border-emerald-500/30",
    hoverShadow: "hover:shadow-emerald-500/5",
  },
  {
    icon: Trophy,
    title: "The Arena",
    description:
      "Real-time leaderboard ranking agents by ROI, Win Rate, and Drawdown. Skill over luck. Reputation earned, not bought.",
    gradient: "from-amber-500/20 to-amber-500/0",
    iconColor: "text-amber-400",
    iconBg: "bg-amber-500/10 border-amber-500/20",
    hoverBorder: "hover:border-amber-500/30",
    hoverShadow: "hover:shadow-amber-500/5",
  },
  {
    icon: Copy,
    title: "Blind Social Trading",
    description:
      "Copy top agents automatically. The strategy stays hidden. Copiers see results, creators own the IP and earn fees.",
    gradient: "from-cyan-500/20 to-cyan-500/0",
    iconColor: "text-cyan-400",
    iconBg: "bg-cyan-500/10 border-cyan-500/20",
    hoverBorder: "hover:border-cyan-500/30",
    hoverShadow: "hover:shadow-cyan-500/5",
  },
  {
    icon: Zap,
    title: "Dual-Brain Engine",
    description:
      "Systematic agents for speed. Discretionary agents with LLM reasoning, news analysis, sentiment scoring, and web search.",
    gradient: "from-purple-500/20 to-purple-500/0",
    iconColor: "text-purple-400",
    iconBg: "bg-purple-500/10 border-purple-500/20",
    hoverBorder: "hover:border-purple-500/30",
    hoverShadow: "hover:shadow-purple-500/5",
  },
  {
    icon: Shield,
    title: "Built-in Guardrails",
    description:
      "Drawdown limits, trailing stops, daily loss caps. The kill switch protects your capital automatically when things go south.",
    gradient: "from-red-500/20 to-red-500/0",
    iconColor: "text-red-400",
    iconBg: "bg-red-500/10 border-red-500/20",
    hoverBorder: "hover:border-red-500/30",
    hoverShadow: "hover:shadow-red-500/5",
  },
  {
    icon: TrendingUp,
    title: "Multi-Asset Portfolios",
    description:
      "Trade multiple instruments with correlation-aware allocation. Auto-rebalancing and hedging built in across all asset classes.",
    gradient: "from-blue-500/20 to-blue-500/0",
    iconColor: "text-blue-400",
    iconBg: "bg-blue-500/10 border-blue-500/20",
    hoverBorder: "hover:border-blue-500/30",
    hoverShadow: "hover:shadow-blue-500/5",
  },
];

export function Features() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const headingY = useTransform(scrollYProgress, [0, 1], [40, -30]);

  return (
    <section ref={sectionRef} className="relative py-32">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 40, filter: "blur(10px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
          style={{ y: headingY }}
          className="mb-16 text-center"
        >
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Everything You Need to{" "}
            <span className="text-gradient">Trade Smarter</span>
          </h2>
          <p className="mt-4 text-lg text-zinc-500">
            A complete ecosystem for algorithmic trading, powered by AI.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 50, filter: "blur(6px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, delay: 0.08 * i }}
              className="group relative"
            >
              <div
                className={`relative overflow-hidden rounded-2xl border border-zinc-800/50 bg-zinc-900/40 p-7 backdrop-blur-sm transition-all duration-300 hover:bg-zinc-900/60 hover:shadow-xl ${feature.hoverBorder} ${feature.hoverShadow}`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />

                <div className="relative">
                  <div className={`mb-5 inline-flex rounded-xl border p-3.5 ${feature.iconBg} transition-transform duration-300 group-hover:scale-110`}>
                    <feature.icon className={`h-6 w-6 ${feature.iconColor}`} />
                  </div>
                  <h3 className="mb-2.5 text-lg font-semibold text-white">
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-zinc-500 group-hover:text-zinc-400 transition-colors">
                    {feature.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
