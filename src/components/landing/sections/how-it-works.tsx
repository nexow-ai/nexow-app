"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { MessageSquareText, Rocket, Trophy } from "lucide-react";

const steps = [
  {
    icon: MessageSquareText,
    number: "01",
    title: "Describe",
    description:
      "Tell the AI what you want: market, strategy, risk rules — in plain English. No code required.",
    iconBg: "bg-emerald-500/10 border-emerald-500/20",
    iconColor: "text-emerald-400",
    numColor: "text-emerald-500/20",
    glowColor: "hover:shadow-emerald-500/5",
    borderHover: "hover:border-emerald-500/20",
  },
  {
    icon: Rocket,
    number: "02",
    title: "Deploy",
    description:
      "Your agent goes live on paper or real markets, trading 24/5 autonomously across multiple asset classes.",
    iconBg: "bg-cyan-500/10 border-cyan-500/20",
    iconColor: "text-cyan-400",
    numColor: "text-cyan-500/20",
    glowColor: "hover:shadow-cyan-500/5",
    borderHover: "hover:border-cyan-500/20",
  },
  {
    icon: Trophy,
    number: "03",
    title: "Compete",
    description:
      "Climb The Arena leaderboard. Let others copy your trades while your strategy stays secret.",
    iconBg: "bg-purple-500/10 border-purple-500/20",
    iconColor: "text-purple-400",
    numColor: "text-purple-500/20",
    glowColor: "hover:shadow-purple-500/5",
    borderHover: "hover:border-purple-500/20",
  },
];

export function HowItWorks() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const headingY = useTransform(scrollYProgress, [0, 1], [40, -30]);

  return (
    <section ref={sectionRef} className="relative py-32 overflow-hidden">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 40, filter: "blur(10px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
          style={{ y: headingY }}
          className="text-center mb-20"
        >
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Three Steps to{" "}
            <span className="text-gradient">Autonomous Trading</span>
          </h2>
          <p className="mt-4 text-zinc-500 text-lg">
            From idea to live agent in under 60 seconds.
          </p>
        </motion.div>

        <div className="relative grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Connecting line */}
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.5 }}
            className="absolute top-1/2 left-[16%] right-[16%] hidden h-px origin-left bg-gradient-to-r from-emerald-500/30 via-cyan-500/30 to-purple-500/30 md:block"
          />

          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 50, filter: "blur(8px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: 0.2 + 0.15 * i }}
              className="group relative"
            >
              <div className={`relative rounded-2xl border border-zinc-800/50 bg-zinc-900/40 p-8 backdrop-blur-sm transition-all duration-300 hover:bg-zinc-900/60 hover:shadow-xl ${step.glowColor} ${step.borderHover}`}>
                {/* Large number watermark */}
                <span className={`absolute top-4 right-6 text-7xl font-black select-none ${step.numColor}`}>
                  {step.number}
                </span>

                <div className={`mb-5 inline-flex rounded-xl border p-3 ${step.iconBg} transition-transform duration-300 group-hover:scale-110`}>
                  <step.icon className={`h-6 w-6 ${step.iconColor}`} />
                </div>
                <h3 className="mb-3 text-xl font-semibold text-white">
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed text-zinc-500 group-hover:text-zinc-400 transition-colors">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
