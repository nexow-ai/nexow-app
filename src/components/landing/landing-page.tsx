"use client";

import { Nav } from "./sections/nav";
import { Hero } from "./sections/hero";
import { HowItWorks } from "./sections/how-it-works";
import { AssetTicker } from "./sections/asset-ticker";
import { Features } from "./sections/features";
import { Arena } from "./sections/arena";
import { SocialTrading } from "./sections/social-trading";
import { CTA } from "./sections/cta";
import { Footer } from "./sections/footer";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 overflow-x-hidden">
      <Nav />
      <Hero />

      <div className="relative z-10 bg-zinc-950">
        {/* Divider */}
        <div className="mx-auto max-w-6xl px-6">
          <div className="h-px bg-gradient-to-r from-transparent via-zinc-800/50 to-transparent" />
        </div>

        <HowItWorks />
        <AssetTicker />

        {/* Divider */}
        <div className="mx-auto max-w-6xl px-6">
          <div className="h-px bg-gradient-to-r from-transparent via-zinc-800/50 to-transparent" />
        </div>

        <Features />
      </div>

      <Arena />

      <div className="relative z-10 bg-zinc-950">
        {/* Divider */}
        <div className="mx-auto max-w-6xl px-6">
          <div className="h-px bg-gradient-to-r from-transparent via-zinc-800/50 to-transparent" />
        </div>

        <SocialTrading />
        <CTA />
        <Footer />
      </div>
    </div>
  );
}
