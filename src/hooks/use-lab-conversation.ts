"use client";

import { AGENT_TEMPLATES } from "@/lib/agent-templates";
import type {
  LabMessage,
  LabMessageRequest,
  LabPhase,
  LabSession,
  LabStrategy,
  LabTemplate,
} from "@/lib/types/labs";
import { useCallback, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Provider / model options
// ---------------------------------------------------------------------------

export interface ModelOption {
  id: string;
  name: string;
  credits: number;
}

export interface ProviderOption {
  id: string;
  name: string;
  models: ModelOption[];
}

export const LLM_PROVIDERS: ProviderOption[] = [
  {
    id: "openai",
    name: "OpenAI",
    models: [
      { id: "gpt-4.1-nano", name: "GPT-4.1 Nano", credits: 1 },
      { id: "gpt-4.1-mini", name: "GPT-4.1 Mini", credits: 2 },
      { id: "gpt-4.1", name: "GPT-4.1", credits: 5 },
      { id: "o3-mini", name: "o3 Mini", credits: 8 },
    ],
  },
  {
    id: "anthropic",
    name: "Anthropic",
    models: [
      { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku", credits: 2 },
      { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4", credits: 5 },
    ],
  },
  {
    id: "google",
    name: "Google",
    models: [
      { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", credits: 1 },
      { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", credits: 2 },
      { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", credits: 5 },
    ],
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    models: [
      { id: "deepseek-chat", name: "DeepSeek V3", credits: 1 },
      { id: "deepseek-reasoner", name: "DeepSeek R1", credits: 3 },
    ],
  },
];

/** Default credit cost when model not found in the provider list. */
const DEFAULT_CREDIT_COST = 3;

/** Look up the credit cost for a provider/model pair. */
export function getModelCredits(providerId: string, modelId: string): number {
  const provider = LLM_PROVIDERS.find((p) => p.id === providerId);
  const model = provider?.models.find((m) => m.id === modelId);
  return model?.credits ?? DEFAULT_CREDIT_COST;
}

// ---------------------------------------------------------------------------
// Templates — conversation starters
// ---------------------------------------------------------------------------

export const LAB_TEMPLATES: LabTemplate[] = [
  {
    id: "gold-rsi",
    icon: "🥇",
    name: "Conservative Gold RSI",
    description: "Buy Gold dips when RSI is oversold, sell when overbought.",
    starterMessage:
      "I want to trade Gold (XAU/USD) on H1. Buy dips when RSI drops below 30 and sell when it goes above 70. Use a 2% stop loss and 4% take profit.",
    difficulty: "beginner",
    tags: ["Gold", "RSI", "H1"],
  },
  {
    id: "eur-scalper",
    icon: "⚡",
    name: "EUR/USD MACD Scalper",
    description: "Fast M5 scalper using MACD crossovers with tight exits.",
    starterMessage:
      "Create a fast EUR/USD scalper on M5 using MACD crossovers. I want tight stops around 0.3% and small take profits of 0.6%.",
    difficulty: "intermediate",
    tags: ["EUR/USD", "MACD", "Scalping"],
  },
  {
    id: "multi-asset",
    icon: "🎯",
    name: "Multi-Asset Confluence",
    description: "Diversified portfolio with RSI + MACD confluence on H1.",
    starterMessage:
      "Build a multi-asset bot for EUR/USD, XAU/USD, GBP/USD, and USD/JPY on H1. Use RSI below 35 combined with MACD crossover for entry signals.",
    difficulty: "advanced",
    tags: ["Portfolio", "RSI", "MACD"],
  },
  {
    id: "custom",
    icon: "🧪",
    name: "Custom Strategy",
    description: "Describe your own trading idea from scratch.",
    starterMessage: "",
    difficulty: "beginner",
    tags: ["Custom"],
  },
];

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

let messageIdCounter = 0;
function createMessage(
  role: LabMessage["role"],
  content: string,
  strategyUpdate?: Partial<LabStrategy>
): LabMessage {
  return {
    id: `msg-${Date.now()}-${++messageIdCounter}`,
    role,
    content,
    timestamp: Date.now(),
    strategyUpdate,
  };
}

const SYSTEM_GREETING = `Welcome to **Strategy Labs**! 🧪

I'm your Strategy Architect. Describe your trading idea in plain English — what instruments, timeframes, entry signals, and risk management you're thinking about — and I'll help you build, backtest, and refine it until it's ready to deploy.

You can also pick one of the templates below to get started quickly.`;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useLabConversation() {
  const [session, setSession] = useState<LabSession>({
    messages: [createMessage("assistant", SYSTEM_GREETING)],
    strategy: null,
    phase: "welcome",
    backtestState: null,
    backtestResult: null,
    isStreaming: false,
    error: null,
  });

  const abortRef = useRef<AbortController | null>(null);
  const [provider, setProvider] = useState("openai");
  const [model, setModel] = useState("gpt-4.1");
  const [streamingStatus, setStreamingStatus] = useState<string | null>(null);

  const CLIENT_TIMEOUT_MS = 150_000;

  // ── Send a user message and get streaming AI response ────────────────
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;

      // Cancel any in-flight request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const userMsg = createMessage("user", content);

      setStreamingStatus(null);
      setSession((prev) => ({
        ...prev,
        messages: [...prev.messages, userMsg],
        phase: prev.phase === "welcome" ? "describing" : prev.phase,
        isStreaming: true,
        error: null,
      }));

      const timeoutId = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);

      try {
        // Build the API request
        const apiMessages = [
          ...session.messages
            .filter((m) => m.role !== "system")
            .map((m) => ({ role: m.role, content: m.content })),
          { role: "user" as const, content },
        ];

        const payload: LabMessageRequest = {
          messages: apiMessages,
          currentStrategy: session.strategy,
          provider,
          model,
        };

        const response = await fetch("/api/labs/message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errText = await response.text();
          let errorMessage = "Failed to get AI response";
          try {
            const errJson = JSON.parse(errText);
            errorMessage = errJson.error || errorMessage;
          } catch {
            errorMessage = errText || errorMessage;
          }
          throw new Error(errorMessage);
        }

        // Stream the response
        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();
        let buffer = "";
        let fullContent = "";
        let latestStrategy: LabStrategy | null = session.strategy;
        let suggestBacktest = false;

        // Create placeholder assistant message
        const assistantMsg = createMessage("assistant", "");

        setSession((prev) => ({
          ...prev,
          messages: [...prev.messages, assistantMsg],
        }));

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const jsonStr = line.slice(5).trim();
            if (!jsonStr) continue;

            try {
              const event = JSON.parse(jsonStr);

              if (event.type === "heartbeat") {
                continue;
              }

              if (event.type === "status") {
                setStreamingStatus(event.status ?? null);
                continue;
              }

              if (event.type === "error") {
                throw new Error(event.error || "Unknown error");
              }

              if (event.type === "content") {
                fullContent += event.content;
                setSession((prev) => {
                  const msgs = [...prev.messages];
                  const lastIdx = msgs.length - 1;
                  if (msgs[lastIdx]?.role === "assistant") {
                    msgs[lastIdx] = { ...msgs[lastIdx], content: fullContent };
                  }
                  return { ...prev, messages: msgs };
                });
              }

              if (event.type === "strategy") {
                latestStrategy = event.strategy as LabStrategy;
                suggestBacktest = event.suggestBacktest ?? false;
              }

              if (event.type === "done") {
                if (event.strategy) {
                  latestStrategy = event.strategy as LabStrategy;
                }
                suggestBacktest = event.suggestBacktest ?? suggestBacktest;
              }
            } catch (err) {
              if (err instanceof SyntaxError) {
                continue;
              }
              throw err;
            }
          }
        }

        clearTimeout(timeoutId);

        // Determine phase based on strategy state
        let newPhase: LabPhase = "clarifying";
        if (latestStrategy && latestStrategy.completeness >= 80) {
          newPhase = "ready";
        } else if (latestStrategy && latestStrategy.completeness >= 40) {
          newPhase = "clarifying";
        } else {
          newPhase = "describing";
        }

        setStreamingStatus(null);
        setSession((prev) => ({
          ...prev,
          strategy: latestStrategy,
          phase: newPhase,
          isStreaming: false,
        }));
      } catch (err) {
        clearTimeout(timeoutId);
        setStreamingStatus(null);

        if (err instanceof DOMException && err.name === "AbortError") {
          setSession((prev) => ({
            ...prev,
            isStreaming: false,
            error:
              "Request timed out — try a faster model or simplify your prompt",
          }));
          return;
        }

        setSession((prev) => ({
          ...prev,
          isStreaming: false,
          error: err instanceof Error ? err.message : "Something went wrong",
        }));
      }
    },
    [session.messages, session.strategy, provider, model]
  );

  // ── Use a template to start the conversation ────────────────────────
  const startFromTemplate = useCallback((template: LabTemplate) => {
    if (template.starterMessage) {
      // Reset and send the template message
      setSession({
        messages: [createMessage("assistant", SYSTEM_GREETING)],
        strategy: null,
        phase: "welcome",
        backtestState: null,
        backtestResult: null,
        isStreaming: false,
        error: null,
      });
      // We'll trigger sendMessage after reset via the returned value
      return template.starterMessage;
    }
    return "";
  }, []);

  // ── Update strategy directly (e.g. from canvas edits) ───────────────
  const updateStrategy = useCallback((updates: Partial<LabStrategy>) => {
    setSession((prev) => ({
      ...prev,
      strategy: prev.strategy ? { ...prev.strategy, ...updates } : null,
    }));
  }, []);

  // ── Update backtest state ───────────────────────────────────────────
  const updateBacktestState = useCallback(
    (
      backtestState: LabSession["backtestState"],
      backtestResult?: LabSession["backtestResult"]
    ) => {
      setSession((prev) => ({
        ...prev,
        backtestState,
        backtestResult: backtestResult ?? prev.backtestResult,
        phase: backtestState
          ? "backtesting"
          : prev.backtestResult
            ? "reviewing"
            : prev.phase,
      }));
    },
    []
  );

  // ── Set phase directly ──────────────────────────────────────────────
  const setPhase = useCallback((phase: LabPhase) => {
    setSession((prev) => ({ ...prev, phase }));
  }, []);

  // ── Retry last message ─────────────────────────────────────────────
  const retryLastMessage = useCallback(() => {
    const lastUserMsg = [...session.messages]
      .reverse()
      .find((m) => m.role === "user");
    if (lastUserMsg) {
      setSession((prev) => ({
        ...prev,
        error: null,
        messages: prev.messages.filter((m) => m.id !== lastUserMsg.id),
      }));
      sendMessage(lastUserMsg.content);
    }
  }, [session.messages, sendMessage]);

  // ── Clear error ─────────────────────────────────────────────────────
  const clearError = useCallback(() => {
    setSession((prev) => ({ ...prev, error: null }));
  }, []);

  // ── Reset session ───────────────────────────────────────────────────
  const resetSession = useCallback(() => {
    abortRef.current?.abort();
    messageIdCounter = 0;
    setStreamingStatus(null);
    setSession({
      messages: [createMessage("assistant", SYSTEM_GREETING)],
      strategy: null,
      phase: "welcome",
      backtestState: null,
      backtestResult: null,
      isStreaming: false,
      error: null,
    });
  }, []);

  return {
    session,
    sendMessage,
    startFromTemplate,
    updateStrategy,
    updateBacktestState,
    setPhase,
    resetSession,
    retryLastMessage,
    clearError,
    templates: LAB_TEMPLATES,
    provider,
    model,
    setProvider,
    setModel,
    streamingStatus,
  };
}
