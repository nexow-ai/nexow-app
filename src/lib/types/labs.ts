/**
 * Type definitions for Strategy Labs — the conversational bot creation experience.
 */

import type { BacktestResult, BacktestState } from "@/hooks/use-backtest";

// ---------------------------------------------------------------------------
// Conversation
// ---------------------------------------------------------------------------

export type MessageRole = "user" | "assistant" | "system";

export interface LabMessage {
    id: string;
    role: MessageRole;
    content: string;
    timestamp: number;
    /** If the assistant extracted/updated strategy from this message */
    strategyUpdate?: Partial<LabStrategy>;
}

export type LabPhase =
    | "welcome"       // No messages yet, showing templates
    | "describing"    // User has started describing their strategy
    | "clarifying"    // AI is asking follow-up questions
    | "ready"         // Strategy is complete, ready for backtest/deploy
    | "backtesting"   // Backtest is running
    | "reviewing"     // Backtest complete, AI suggests improvements
    | "deploying";    // Deploy in progress

// ---------------------------------------------------------------------------
// Strategy (derived from conversation)
// ---------------------------------------------------------------------------

export interface LabInstrument {
    instrument: string;
    timeframe: string;
}

export interface LabExitConfig {
    stop_loss_pct: number | null;
    take_profit_pct: number | null;
    trailing_stop_pct: number | null;
}

export interface LabStrategy {
    name: string;
    description: string;
    type: "bot" | "agent";
    instruments: LabInstrument[];
    entryRules: string;
    exitConfig: LabExitConfig;
    strategyCode: string;
    config: Record<string, unknown>;
    portfolioSummary: string;
    /** Confidence score 0-100 from the AI on strategy completeness */
    completeness: number;
    /** Whether the strategy code passed WASM dry-run execution */
    codeValidated?: boolean;
}

// ---------------------------------------------------------------------------
// Lab Session (combines conversation + strategy + backtest)
// ---------------------------------------------------------------------------

export interface LabSession {
    messages: LabMessage[];
    strategy: LabStrategy | null;
    phase: LabPhase;
    backtestState: BacktestState | null;
    backtestResult: BacktestResult | null;
    isStreaming: boolean;
    error: string | null;
}

// ---------------------------------------------------------------------------
// API payloads
// ---------------------------------------------------------------------------

export interface LabMessageRequest {
    messages: { role: MessageRole; content: string }[];
    currentStrategy: LabStrategy | null;
    provider?: string;
    model?: string;
}

export interface LabMessageResponse {
    message: string;
    strategy: LabStrategy | null;
    suggestBacktest: boolean;
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export interface LabTemplate {
    id: string;
    icon: string;
    name: string;
    description: string;
    starterMessage: string;
    difficulty: "beginner" | "intermediate" | "advanced";
    tags: string[];
}
