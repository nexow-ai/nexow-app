"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface Instrument {
  symbol: string;
  price: number;
  change: number;
  category: string;
  categoryColor: string;
}

const instruments: Instrument[] = [
  { symbol: "EUR/USD", price: 1.0847, change: 0.12, category: "FX", categoryColor: "text-emerald-400" },
  { symbol: "GBP/JPY", price: 191.432, change: -0.34, category: "FX", categoryColor: "text-emerald-400" },
  { symbol: "USD/CHF", price: 0.8821, change: 0.08, category: "FX", categoryColor: "text-emerald-400" },
  { symbol: "SPX500", price: 6083.57, change: 0.67, category: "Index", categoryColor: "text-blue-400" },
  { symbol: "NAS100", price: 21842.63, change: 1.12, category: "Index", categoryColor: "text-blue-400" },
  { symbol: "DE40", price: 22012.88, change: 0.43, category: "Index", categoryColor: "text-blue-400" },
  { symbol: "XAU/USD", price: 2937.45, change: 0.89, category: "Commodity", categoryColor: "text-amber-400" },
  { symbol: "XTI/USD", price: 71.23, change: -1.42, category: "Commodity", categoryColor: "text-amber-400" },
  { symbol: "XAG/USD", price: 32.87, change: 1.23, category: "Commodity", categoryColor: "text-amber-400" },
  { symbol: "AAPL", price: 227.63, change: 0.54, category: "Stock", categoryColor: "text-purple-400" },
  { symbol: "TSLA", price: 352.89, change: 2.31, category: "Stock", categoryColor: "text-purple-400" },
  { symbol: "NVDA", price: 131.28, change: 1.87, category: "Stock", categoryColor: "text-purple-400" },
  { symbol: "BTC/USD", price: 97423.50, change: 3.21, category: "Crypto", categoryColor: "text-orange-400" },
  { symbol: "ETH/USD", price: 2681.42, change: 2.14, category: "Crypto", categoryColor: "text-orange-400" },
  { symbol: "SOL/USD", price: 198.73, change: 4.56, category: "Crypto", categoryColor: "text-orange-400" },
];

function TickerCard({ instrument }: { instrument: Instrument }) {
  const [displayPrice, setDisplayPrice] = useState(instrument.price);

  useEffect(() => {
    const interval = setInterval(() => {
      const fluctuation = instrument.price * (Math.random() - 0.5) * 0.0004;
      setDisplayPrice((p) => p + fluctuation);
    }, 2500);
    return () => clearInterval(interval);
  }, [instrument.price]);

  const formatPrice = (price: number) => {
    if (price > 10000) return price.toFixed(2);
    if (price > 100) return price.toFixed(2);
    if (price > 10) return price.toFixed(3);
    return price.toFixed(4);
  };

  return (
    <div className="flex-shrink-0 w-[200px] rounded-xl border border-zinc-800/50 bg-zinc-900/50 p-4 backdrop-blur-sm transition-all duration-300 hover:border-zinc-700/60 hover:bg-zinc-900/70 hover:shadow-lg hover:shadow-black/10">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-bold text-white">{instrument.symbol}</span>
        <span className={`text-[10px] font-semibold uppercase tracking-wider ${instrument.categoryColor}`}>
          {instrument.category}
        </span>
      </div>
      <p className="text-lg font-mono font-semibold text-zinc-100 tabular-nums">
        {formatPrice(displayPrice)}
      </p>
      <p className={`mt-1 text-xs font-semibold tabular-nums ${instrument.change >= 0 ? "text-emerald-400" : "text-red-400"}`}>
        {instrument.change >= 0 ? "+" : ""}
        {instrument.change.toFixed(2)}%
      </p>
    </div>
  );
}

export function AssetTicker() {
  const doubled = [...instruments, ...instruments];

  return (
    <section className="relative py-20 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
        whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.7 }}
        className="text-center mb-12"
      >
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Trade Everything, <span className="text-gradient">Everywhere</span>
        </h2>
        <p className="mt-4 text-zinc-500 text-lg">
          FX, Indices, Commodities, Stocks, and Crypto — all from one platform.
        </p>
      </motion.div>

      {/* Row 1 - scrolls left */}
      <div className="relative mb-4">
        <div className="absolute left-0 top-0 bottom-0 w-40 z-10 bg-gradient-to-r from-zinc-950 to-transparent pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-40 z-10 bg-gradient-to-l from-zinc-950 to-transparent pointer-events-none" />
        <div className="flex gap-4 animate-marquee-left">
          {doubled.map((inst, i) => (
            <TickerCard key={`${inst.symbol}-${i}`} instrument={inst} />
          ))}
        </div>
      </div>

      {/* Row 2 - scrolls right */}
      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-40 z-10 bg-gradient-to-r from-zinc-950 to-transparent pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-40 z-10 bg-gradient-to-l from-zinc-950 to-transparent pointer-events-none" />
        <div className="flex gap-4 animate-marquee-right">
          {[...doubled].reverse().map((inst, i) => (
            <TickerCard key={`rev-${inst.symbol}-${i}`} instrument={inst} />
          ))}
        </div>
      </div>
    </section>
  );
}
