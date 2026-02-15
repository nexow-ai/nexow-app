"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/layout/logo";
import { createClient } from "@/lib/supabase/client";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen">
      {/* Left side — form */}
      <div className="flex flex-1 flex-col justify-center px-8 sm:px-16 lg:px-24">
        <div className="mx-auto w-full max-w-sm">
          <Logo size="lg" className="mb-12" />

          <h1 className="text-3xl font-bold tracking-tight text-white">Welcome back</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Sign in to manage your trading agents.
          </p>

          <form onSubmit={handleLogin} className="mt-10 space-y-5">
            <Input
              id="email"
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              id="password"
              label="Password"
              type="password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {error && <p className="text-sm text-red-400">{error}</p>}

            <Button type="submit" className="w-full" loading={loading}>
              Sign In
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-zinc-600">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-medium text-emerald-400 transition-colors hover:text-emerald-300">
              Create one
            </Link>
          </p>
        </div>
      </div>

      {/* Right side — visual */}
      <div className="relative hidden flex-1 overflow-hidden lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-cyan-500/5 to-purple-500/10" />
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/8 blur-[100px]" />

        <div className="flex h-full flex-col items-center justify-center px-12">
          <div className="space-y-6 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-500 to-cyan-500 text-3xl font-bold text-white shadow-2xl shadow-emerald-500/20">
              N
            </div>
            <h2 className="text-2xl font-bold text-white">Trade Smarter, Not Harder</h2>
            <p className="max-w-sm text-sm leading-relaxed text-zinc-500">
              AI-powered trading agents that work 24/7. Build strategies in plain English, compete globally, and earn through social trading.
            </p>

            {/* Social proof */}
            <div className="mt-8 flex items-center justify-center gap-6 pt-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">24/7</p>
                <p className="text-[11px] uppercase tracking-wider text-zinc-600">Uptime</p>
              </div>
              <div className="h-8 w-px bg-zinc-800" />
              <div className="text-center">
                <p className="text-2xl font-bold text-white">8+</p>
                <p className="text-[11px] uppercase tracking-wider text-zinc-600">Instruments</p>
              </div>
              <div className="h-8 w-px bg-zinc-800" />
              <div className="text-center">
                <p className="text-2xl font-bold text-white">AI</p>
                <p className="text-[11px] uppercase tracking-wider text-zinc-600">Powered</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
