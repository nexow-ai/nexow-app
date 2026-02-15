"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export function CTA() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const headingY = useTransform(scrollYProgress, [0, 1], [60, -40]);
  const glowScale = useTransform(scrollYProgress, [0, 0.5, 1], [0.8, 1.1, 0.9]);

  return (
    <section ref={sectionRef} className="relative py-32">
      {/* Background glow with parallax scale */}
      <motion.div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ scale: glowScale }}>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[800px] rounded-full bg-emerald-500/[0.07] blur-[120px]" />
        <div className="absolute left-1/3 top-1/3 h-[300px] w-[300px] rounded-full bg-cyan-500/[0.04] blur-[100px]" />
      </motion.div>

      <div className="relative mx-auto max-w-4xl px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 40, filter: "blur(10px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8 }}
          style={{ y: headingY }}
        >
          <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Build Your First Agent
            <br />
            <span className="text-gradient">in 60 Seconds</span>
          </h2>
          <p className="mt-6 text-lg text-zinc-400 max-w-xl mx-auto">
            No code. No complexity. Just describe what you want, and watch your
            trading agent come to life.
          </p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-12"
          >
            <Link href="/signup">
              <Button size="lg" className="min-w-[260px] text-base py-4">
                Create Free Account
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </motion.div>
          <p className="mt-6 text-xs text-zinc-600">
            Free paper trading account. No credit card required.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
