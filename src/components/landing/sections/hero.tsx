"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import dynamic from "next/dynamic";

const HeroScene = dynamic(
  () => import("../hero-scene").then((m) => ({ default: m.HeroScene })),
  { ssr: false }
);

function AnimatedCounter({
  target,
  prefix = "",
  suffix = "",
  duration = 2,
}: {
  target: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const end = target;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(eased * end);
      setCount(current);
      if (progress < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }, [inView, target, duration]);

  return (
    <span ref={ref}>
      {prefix}
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

const stats = [
  { label: "Trading Volume", value: 2400, prefix: "$", suffix: "K+" },
  { label: "Active Agents", value: 1247, prefix: "", suffix: "+" },
  { label: "Uptime", value: 24, prefix: "", suffix: "/5" },
  { label: "Asset Classes", value: 8, prefix: "", suffix: "+" },
];

export function Hero() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  // Parallax: globe moves slower (stays longer), text moves faster (scrolls away)
  const globeY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const globeScale = useTransform(scrollYProgress, [0, 1], [1, 1.15]);
  const globeOpacity = useTransform(scrollYProgress, [0, 0.8, 1], [1, 0.6, 0]);

  const textY = useTransform(scrollYProgress, [0, 1], [0, -80]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.6, 1], [1, 0.3, 0]);

  const badgeY = useTransform(scrollYProgress, [0, 1], [0, -120]);

  const statsY = useTransform(scrollYProgress, [0, 1], [0, -40]);
  const statsOpacity = useTransform(scrollYProgress, [0, 0.7, 1], [1, 0.5, 0]);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Globe with parallax */}
      <motion.div
        className="absolute inset-0"
        style={{ y: globeY, scale: globeScale, opacity: globeOpacity }}
      >
        <HeroScene />
      </motion.div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 pt-24 pb-16 lg:px-16">
        <div className="max-w-2xl">
          {/* Badge — fastest parallax */}
          <motion.div
            initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.8, delay: 0.2 }}
            style={{ y: badgeY }}
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-5 py-2 text-sm font-medium text-emerald-400 backdrop-blur-md shadow-lg shadow-emerald-500/5"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Powered by AI
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 40, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.9, delay: 0.4 }}
            style={{ y: textY, opacity: textOpacity }}
            className="text-5xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl"
          >
            The Agentic
            <br />
            <span className="text-gradient">Social Trading</span>
            <br />
            Platform
          </motion.h1>

          {/* Sub-headline */}
          <motion.p
            initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.7, delay: 0.7 }}
            style={{ y: textY, opacity: textOpacity }}
            className="mt-8 max-w-xl text-lg leading-relaxed text-zinc-400 sm:text-xl"
          >
            Build discretionary or systematic trading agents with plain English.
            Trade FX, Indices, Commodities, Stocks, and Crypto — 24 hours, 5 days a week.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.9 }}
            style={{ y: textY, opacity: textOpacity }}
            className="mt-12 flex flex-col items-start gap-4 sm:flex-row"
          >
            <Link href="/signup">
              <Button size="lg" className="min-w-[200px] text-base">
                Start Building
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
            <Link href="#arena">
              <Button variant="outline" size="lg" className="min-w-[200px] text-base">
                Explore The Arena
              </Button>
            </Link>
          </motion.div>
        </div>

        {/* Stats — slowest parallax (lags behind) */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 1.1 }}
          style={{ y: statsY, opacity: statsOpacity }}
          className="mt-20 grid grid-cols-2 gap-4 sm:grid-cols-4 max-w-3xl"
        >
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="group rounded-2xl border border-zinc-800/50 bg-zinc-900/40 px-6 py-5 backdrop-blur-md transition-all duration-300 hover:border-emerald-500/20 hover:bg-zinc-900/60 hover:shadow-lg hover:shadow-emerald-500/5"
            >
              <p className="text-2xl font-bold text-white sm:text-3xl">
                <AnimatedCounter
                  target={stat.value}
                  prefix={stat.prefix}
                  suffix={stat.suffix}
                />
              </p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wider text-zinc-500">
                {stat.label}
              </p>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-zinc-950 to-transparent pointer-events-none" />
    </section>
  );
}
