"use client";

import { Logo } from "@/components/layout/logo";
import Link from "next/link";

const links = {
  Product: [
    { name: "The Arena", href: "#arena" },
    { name: "Create Agent", href: "/signup" },
    { name: "Copy Trading", href: "/signup" },
    { name: "Paper Trading", href: "/signup" },
  ],
  Company: [
    { name: "About", href: "#" },
    { name: "Blog", href: "#" },
    { name: "Careers", href: "#" },
  ],
  Legal: [
    { name: "Privacy", href: "#" },
    { name: "Terms", href: "#" },
    { name: "Risk Disclosure", href: "#" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-zinc-800/30">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Logo size="md" />
            <p className="mt-4 text-sm text-zinc-600 leading-relaxed max-w-xs">
              The agentic social trading platform. Build, compete, and earn with AI-powered trading agents.
            </p>
          </div>

          {/* Links */}
          {Object.entries(links).map(([category, items]) => (
            <div key={category}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-4">
                {category}
              </h3>
              <ul className="space-y-3">
                {items.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className="text-sm text-zinc-600 transition-colors hover:text-zinc-300"
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-zinc-800/30 pt-8 sm:flex-row">
          <p className="text-xs text-zinc-700">
            &copy; 2025 Nexow. All rights reserved.
          </p>
          <p className="text-[10px] text-zinc-800 max-w-md text-center sm:text-right">
            Trading involves risk. Past performance is not indicative of future results.
            This platform is for educational and informational purposes.
          </p>
        </div>
      </div>
    </footer>
  );
}
