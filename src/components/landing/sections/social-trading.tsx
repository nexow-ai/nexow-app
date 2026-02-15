"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Lock, Eye, DollarSign, ArrowDown, Shield, Sparkles } from "lucide-react";

const benefits = [
  {
    icon: Lock,
    title: "Strategy Stays Encrypted",
    description: "Your logic, rules, and parameters are never revealed. Copiers can't see or reverse-engineer your edge.",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
  },
  {
    icon: Eye,
    title: "Results Are Transparent",
    description: "Copiers see real-time P&L, drawdown, and performance metrics. Trust through verified track records.",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10 border-cyan-500/20",
  },
  {
    icon: DollarSign,
    title: "Creators Earn Fees",
    description: "Every copier generates revenue for the strategy creator. Build once, earn passively as your reputation grows.",
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
  },
];

function FlowDiagram() {
  return (
    <div className="relative flex flex-col items-center gap-3">
      {/* Creator card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-sm rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 backdrop-blur-md"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/20 border border-emerald-500/30">
            <Sparkles className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Strategy Creator</p>
            <p className="text-xs text-zinc-500">AlphaScalper by @nakamoto</p>
          </div>
        </div>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between items-center py-1.5 border-b border-zinc-800/30">
            <span className="text-zinc-400">Strategy Logic</span>
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <Lock className="h-3 w-3" /> Encrypted
            </span>
          </div>
          <div className="flex justify-between items-center py-1.5 border-b border-zinc-800/30">
            <span className="text-zinc-400">Trade Signals</span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-400 font-medium">Active</span>
            </span>
          </div>
          <div className="flex justify-between items-center py-1.5">
            <span className="text-zinc-400">Monthly Revenue</span>
            <span className="text-amber-400 font-bold">$4,280</span>
          </div>
        </div>
      </motion.div>

      {/* Blind layer connector */}
      <motion.div
        initial={{ opacity: 0, scaleY: 0 }}
        whileInView={{ opacity: 1, scaleY: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="flex flex-col items-center gap-2 origin-top"
      >
        <div className="h-6 w-px bg-gradient-to-b from-emerald-500/40 to-zinc-700/40" />
        <div className="rounded-full border border-zinc-700/50 bg-zinc-900/80 px-4 py-1.5 flex items-center gap-2">
          <Shield className="h-3.5 w-3.5 text-zinc-400" />
          <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Blind Layer</span>
        </div>
        <div className="h-6 w-px bg-gradient-to-b from-zinc-700/40 to-cyan-500/40" />
        <ArrowDown className="h-4 w-4 text-zinc-600" />
      </motion.div>

      {/* Copier cards */}
      <div className="flex gap-3 w-full max-w-sm">
        {[
          { n: 1, roi: 41.2 },
          { n: 2, roi: 39.7 },
          { n: 3, roi: 42.1 },
        ].map(({ n, roi }) => (
          <motion.div
            key={n}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 + n * 0.1, duration: 0.5 }}
            className="flex-1 rounded-xl border border-zinc-800/50 bg-zinc-900/50 p-3.5 backdrop-blur-sm text-center"
          >
            <div className="h-7 w-7 mx-auto mb-2 rounded-full bg-zinc-800/80 flex items-center justify-center ring-1 ring-zinc-700/40">
              <Eye className="h-3.5 w-3.5 text-zinc-500" />
            </div>
            <p className="text-[10px] text-zinc-500 font-medium">Copier {n}</p>
            <p className="text-sm font-mono font-bold text-emerald-400 mt-1">
              +{roi}%
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export function SocialTrading() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const leftY = useTransform(scrollYProgress, [0, 1], [50, -30]);
  const rightY = useTransform(scrollYProgress, [0, 1], [80, -20]);

  return (
    <section ref={sectionRef} className="relative py-32 overflow-hidden">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-2 lg:gap-20 items-center">
          {/* Left: content */}
          <motion.div
            initial={{ opacity: 0, x: -40, filter: "blur(8px)" }}
            whileInView={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7 }}
            style={{ y: leftY }}
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-sm font-medium text-cyan-400">
              <Lock className="h-3.5 w-3.5" />
              Blind Social Trading
            </div>

            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl mb-6">
              Your Strategy,
              <br />
              <span className="text-gradient">Your IP</span>
            </h2>

            <p className="text-lg text-zinc-400 mb-10 leading-relaxed">
              The first social trading platform where creators keep their edge.
              Copy the best-performing agents without ever seeing the strategy behind them.
            </p>

            <div className="space-y-6">
              {benefits.map((benefit, i) => (
                <motion.div
                  key={benefit.title}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.2 + 0.1 * i }}
                  className="flex items-start gap-4"
                >
                  <div className={`flex-shrink-0 rounded-xl border p-2.5 ${benefit.bg}`}>
                    <benefit.icon className={`h-5 w-5 ${benefit.color}`} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-1">{benefit.title}</h3>
                    <p className="text-sm text-zinc-500 leading-relaxed">{benefit.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right: visual */}
          <motion.div
            initial={{ opacity: 0, x: 40, filter: "blur(8px)" }}
            whileInView={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, delay: 0.15 }}
            style={{ y: rightY }}
            className="flex justify-center"
          >
            <FlowDiagram />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
