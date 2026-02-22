"use client";

import { LabMessage } from "@/components/labs/lab-message";
import { TemplateStarter } from "@/components/labs/template-starter";
import { LLM_PROVIDERS } from "@/hooks/use-lab-conversation";
import type {
  LabMessage as LabMessageType,
  LabTemplate,
} from "@/lib/types/labs";
import {
  AlertTriangle,
  ArrowUp,
  ChevronDown,
  FlaskConical,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Status label mapping
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<string, string> = {
  processing: "Generating response...",
  validating: "Testing code in sandbox...",
  retrying: "Fixing code, retrying...",
  generating: "Building strategy...",
};

function getStatusLabel(status: string | null): string {
  if (!status) return "Thinking...";
  return STATUS_LABELS[status] ?? "Thinking...";
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface LabConversationProps {
  messages: LabMessageType[];
  templates: LabTemplate[];
  isStreaming: boolean;
  streamingStatus: string | null;
  showTemplates: boolean;
  error: string | null;
  onSendMessage: (message: string) => void;
  onSelectTemplate: (template: LabTemplate) => void;
  onRetry: () => void;
  onDismissError: () => void;
  provider: string;
  model: string;
  onProviderChange: (provider: string) => void;
  onModelChange: (model: string) => void;
}

export function LabConversation({
  messages,
  templates,
  isStreaming,
  streamingStatus,
  showTemplates,
  error,
  onSendMessage,
  onSelectTemplate,
  onRetry,
  onDismissError,
  provider,
  model,
  onProviderChange,
  onModelChange,
}: LabConversationProps) {
  const [input, setInput] = useState("");
  const [showModelPicker, setShowModelPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  const currentProvider = LLM_PROVIDERS.find((p) => p.id === provider);
  const currentModel = currentProvider?.models.find((m) => m.id === model);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-focus input
  useEffect(() => {
    if (!isStreaming) {
      inputRef.current?.focus();
    }
  }, [isStreaming]);

  // Close picker on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowModelPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto-resize textarea
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);
      const el = e.target;
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
    },
    []
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    onSendMessage(input.trim());
    setInput("");
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  function handleSelectModel(providerId: string, modelId: string) {
    onProviderChange(providerId);
    onModelChange(modelId);
    setShowModelPicker(false);
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/40 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/10">
            <FlaskConical className="h-4 w-4 text-purple-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">
              Strategy Architect
            </h2>
            <p className="flex items-center gap-1.5 text-[11px] text-zinc-600">
              {isStreaming ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-status-pulse" />
                  <span className="text-purple-400/80">
                    {getStatusLabel(streamingStatus)}
                  </span>
                </>
              ) : (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Ready to help
                </>
              )}
            </p>
          </div>
        </div>

        {/* Model selector */}
        <div className="relative" ref={pickerRef}>
          <button
            onClick={() => setShowModelPicker(!showModelPicker)}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-800/60 bg-zinc-900/50 px-2.5 py-1.5 text-[11px] text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-300"
          >
            <span className="text-zinc-600">{currentProvider?.name}</span>
            <span className="text-zinc-300">{currentModel?.name || model}</span>
            <span className="rounded-md bg-purple-500/15 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-purple-400">
              {currentModel?.credits ?? 3} cr
            </span>
            <ChevronDown className="h-3 w-3" />
          </button>

          {showModelPicker && (
            <div className="absolute right-0 top-full z-50 mt-1.5 w-72 rounded-xl border border-zinc-800/60 bg-zinc-950 p-1.5 shadow-2xl animate-scale-in">
              {LLM_PROVIDERS.map((p) => (
                <div key={p.id}>
                  <div className="px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-wider text-zinc-600">
                    {p.name}
                  </div>
                  {p.models.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => handleSelectModel(p.id, m.id)}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${
                        provider === p.id && model === m.id
                          ? "bg-purple-500/10 text-purple-400"
                          : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            provider === p.id && model === m.id
                              ? "bg-purple-400"
                              : "bg-zinc-700"
                          }`}
                        />
                        {m.name}
                      </span>
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium tabular-nums ${
                          provider === p.id && model === m.id
                            ? "bg-purple-500/20 text-purple-300"
                            : "bg-zinc-800/80 text-zinc-500"
                        }`}
                      >
                        {m.credits} cr
                      </span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div className="space-y-4">
          {messages.map((msg, idx) => (
            <LabMessage
              key={msg.id}
              message={msg}
              isStreaming={
                isStreaming &&
                idx === messages.length - 1 &&
                msg.role === "assistant"
              }
            />
          ))}

          {/* Templates */}
          {showTemplates && (
            <div className="mt-4 animate-fade-in">
              <TemplateStarter
                templates={templates}
                onSelect={onSelectTemplate}
              />
            </div>
          )}

          {/* Error with retry/dismiss */}
          {error && (
            <div className="animate-slide-down rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-red-400 leading-relaxed">
                    {error}
                  </p>
                  <div className="mt-2.5 flex items-center gap-2">
                    <button
                      onClick={onRetry}
                      className="flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-[11px] font-medium text-red-300 transition-colors hover:bg-red-500/20"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Retry
                    </button>
                    <button
                      onClick={onDismissError}
                      className="flex items-center gap-1.5 rounded-lg border border-zinc-700/30 px-3 py-1.5 text-[11px] text-zinc-500 transition-colors hover:text-zinc-300"
                    >
                      <X className="h-3 w-3" />
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-zinc-800/40 p-4">
        <form onSubmit={handleSubmit} className="relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Describe your trading strategy..."
            rows={2}
            disabled={isStreaming}
            className="w-full resize-none rounded-xl border border-zinc-800/60 bg-zinc-900/50 py-3 pl-4 pr-12 text-sm text-zinc-100 placeholder:text-zinc-600 transition-all focus:border-purple-500/40 focus:outline-none focus:ring-2 focus:ring-purple-500/15 focus:shadow-[0_0_20px_rgba(139,92,246,0.08)] disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isStreaming}
            className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-lg bg-purple-600 text-white transition-all hover:bg-purple-500 disabled:opacity-30 disabled:hover:bg-purple-600"
          >
            {isStreaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowUp className="h-4 w-4" />
            )}
          </button>
        </form>
        <p className="mt-2 text-center text-[10px] text-zinc-700">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
