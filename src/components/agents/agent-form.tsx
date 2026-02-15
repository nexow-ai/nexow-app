"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { Bot, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const examplePrompts = [
  "Make a cautious Gold trader that buys dips using RSI",
  "Create an aggressive EUR/USD scalper using MACD crossovers on M1",
  "Build a balanced GBP/USD trader using Bollinger Bands on H1",
  "Design a smart agent that reads market context before trading XAU/USD",
];

export function AgentForm() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;

    setError("");
    setLoading(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setError("You must be signed in to create an agent.");
        setLoading(false);
        return;
      }

      const { data, error: insertError } = await supabase
        .from("agents")
        .insert({
          creator_id: user.id,
          name: "Generating...",
          prompt: prompt.trim(),
          config: {} as Record<string, never>,
        } as never)
        .select()
        .single();

      if (insertError) throw insertError;

      router.push(`/agents/${(data as { id: string }).id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardTitle className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-emerald-400" />
        AI Agent Factory
      </CardTitle>
      <CardDescription className="mt-1">
        Describe your trading strategy in plain English. Our AI will convert it
        into an executable trading agent.
      </CardDescription>

      <form onSubmit={handleCreate} className="mt-6 space-y-4">
        <div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your ideal trading strategy..."
            rows={4}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            required
          />
        </div>

        <div>
          <p className="mb-2 text-xs text-zinc-500">Try one of these:</p>
          <div className="flex flex-wrap gap-2">
            {examplePrompts.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setPrompt(example)}
                className="rounded-full border border-zinc-800 px-3 py-1 text-xs text-zinc-400 transition-colors hover:border-emerald-800 hover:text-emerald-400"
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <Button type="submit" loading={loading} className="w-full">
          <Bot className="h-4 w-4" />
          Generate Agent
        </Button>
      </form>
    </Card>
  );
}
