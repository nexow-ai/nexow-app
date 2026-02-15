"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/layout/logo";
import { createClient } from "@/lib/supabase/client";
import { ArrowRight, Check, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export default function SignupPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");

  const checkUsername = useCallback(async (value: string) => {
    const trimmed = value.trim().toLowerCase();
    if (trimmed.length < 3) { setUsernameStatus("idle"); return; }

    setUsernameStatus("checking");
    const supabase = createClient();
    const { data, error } = await (supabase.rpc as Function)("check_username_available", { desired_username: trimmed });
    if (error) { setUsernameStatus("idle"); return; }
    setUsernameStatus(data ? "available" : "taken");
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => checkUsername(username), 400);
    return () => clearTimeout(timeout);
  }, [username, checkUsername]);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (usernameStatus === "taken") return;
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username: username.trim().toLowerCase(), display_name: username.trim() } },
    });

    if (error) { setError(error.message); setLoading(false); return; }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen">
      {/* Left side — visual */}
      <div className="relative hidden flex-1 overflow-hidden lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-emerald-500/5 to-cyan-500/10" />
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-500/8 blur-[100px]" />

        <div className="flex h-full flex-col items-center justify-center px-12">
          <div className="space-y-6 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-purple-500 to-emerald-500 text-3xl font-bold text-white shadow-2xl shadow-purple-500/20">
              N
            </div>
            <h2 className="text-2xl font-bold text-white">Join the Future of Trading</h2>
            <p className="max-w-sm text-sm leading-relaxed text-zinc-500">
              Create agents that trade while you sleep. No coding needed, just describe what you want in plain English.
            </p>

            <div className="space-y-3 pt-6 text-left">
              {["AI generates your trading strategy", "24/7 automated execution", "Compete on the global leaderboard", "Earn from copy trading"].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20">
                    <Check className="h-3 w-3 text-emerald-400" />
                  </div>
                  <span className="text-sm text-zinc-400">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right side — form */}
      <div className="flex flex-1 flex-col justify-center px-8 sm:px-16 lg:px-24">
        <div className="mx-auto w-full max-w-sm">
          <Logo size="lg" className="mb-12" />

          <h1 className="text-3xl font-bold tracking-tight text-white">Create your account</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Start building your trading agents today.
          </p>

          <form onSubmit={handleSignup} className="mt-10 space-y-5">
            <div>
              <Input
                id="username"
                label="Username"
                type="text"
                placeholder="quant_king"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                error={usernameStatus === "taken" ? "Username is already taken" : undefined}
                required
                minLength={3}
              />
              {username.length >= 3 && usernameStatus !== "idle" && (
                <div className="mt-2 flex items-center gap-1.5 text-xs">
                  {usernameStatus === "checking" && <span className="text-zinc-500">Checking...</span>}
                  {usernameStatus === "available" && (
                    <><Check className="h-3.5 w-3.5 text-emerald-400" /><span className="text-emerald-400">Available</span></>
                  )}
                  {usernameStatus === "taken" && (
                    <><X className="h-3.5 w-3.5 text-red-400" /><span className="text-red-400">Taken</span></>
                  )}
                </div>
              )}
            </div>

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
              placeholder="Min 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />

            {error && <p className="text-sm text-red-400">{error}</p>}

            <Button
              type="submit"
              className="w-full"
              loading={loading}
              disabled={usernameStatus === "taken" || usernameStatus === "checking"}
            >
              Create Account
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-zinc-600">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-emerald-400 transition-colors hover:text-emerald-300">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
