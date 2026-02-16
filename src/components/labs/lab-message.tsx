"use client";

import type { LabMessage as LabMessageType } from "@/lib/types/labs";
import { Bot, Check, Copy, User } from "lucide-react";
import { useCallback, useState } from "react";

interface LabMessageProps {
    message: LabMessageType;
    isStreaming?: boolean;
}

export function LabMessage({ message, isStreaming }: LabMessageProps) {
    const isUser = message.role === "user";
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(message.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [message.content]);

    return (
        <div
            className={`group flex gap-3 animate-slide-up ${
                isUser ? "flex-row-reverse" : ""
            }`}
        >
            {/* Avatar */}
            <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                    isUser
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-purple-500/10 text-purple-400"
                }`}
            >
                {isUser ? (
                    <User className="h-4 w-4" />
                ) : (
                    <Bot className="h-4 w-4" />
                )}
            </div>

            {/* Message bubble */}
            <div className="max-w-[85%] space-y-1">
                <div
                    className={`relative rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        isUser
                            ? "bg-emerald-500/10 border border-emerald-500/20 text-zinc-100"
                            : "bg-zinc-800/60 border border-zinc-700/30 text-zinc-200"
                    }`}
                >
                    <MessageContent content={message.content} />
                    {isStreaming && message.role === "assistant" && (
                        <span className="inline-flex ml-1">
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-purple-400 [animation-delay:-0.3s]" />
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-purple-400 ml-0.5 [animation-delay:-0.15s]" />
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-purple-400 ml-0.5" />
                        </span>
                    )}

                    {/* Copy button — visible on hover for assistant messages */}
                    {!isUser && message.content && !isStreaming && (
                        <button
                            onClick={handleCopy}
                            className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-md border border-zinc-700/50 bg-zinc-900 text-zinc-500 opacity-0 transition-all hover:text-zinc-300 group-hover:opacity-100"
                        >
                            {copied ? (
                                <Check className="h-3 w-3 text-emerald-400" />
                            ) : (
                                <Copy className="h-3 w-3" />
                            )}
                        </button>
                    )}
                </div>

                {/* Timestamp */}
                <p
                    className={`text-[10px] text-zinc-700 ${
                        isUser ? "text-right" : "text-left"
                    }`}
                >
                    {formatRelativeTime(message.timestamp)}
                </p>
            </div>
        </div>
    );
}

function formatRelativeTime(ts: number): string {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 10) return "just now";
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(ts).toLocaleDateString();
}

/**
 * Markdown-like rendering: headings, bold, inline code, numbered/bullet lists, line breaks.
 */
function MessageContent({ content }: { content: string }) {
    if (!content) return null;

    const lines = content.split("\n");
    const elements: React.ReactNode[] = [];
    let listBuffer: { type: "ol" | "ul"; items: string[] } | null = null;

    function flushList() {
        if (!listBuffer) return;
        const Tag = listBuffer.type;
        elements.push(
            <Tag
                key={`list-${elements.length}`}
                className={`${
                    Tag === "ol" ? "list-decimal" : "list-disc"
                } ml-4 space-y-0.5 text-zinc-300`}
            >
                {listBuffer.items.map((item, j) => (
                    <li key={j}>{renderInline(item)}</li>
                ))}
            </Tag>
        );
        listBuffer = null;
    }

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        // Heading: ## text
        if (trimmed.startsWith("## ")) {
            flushList();
            elements.push(
                <p
                    key={i}
                    className="font-semibold text-zinc-50 text-[13px] mt-2 first:mt-0"
                >
                    {renderInline(trimmed.slice(3))}
                </p>
            );
            continue;
        }

        // Numbered list: 1. text or 2. text
        const olMatch = trimmed.match(/^\d+\.\s+(.+)$/);
        if (olMatch) {
            if (listBuffer?.type !== "ol") {
                flushList();
                listBuffer = { type: "ol", items: [] };
            }
            listBuffer!.items.push(olMatch[1]);
            continue;
        }

        // Bullet list: - text
        const ulMatch = trimmed.match(/^[-*]\s+(.+)$/);
        if (ulMatch) {
            if (listBuffer?.type !== "ul") {
                flushList();
                listBuffer = { type: "ul", items: [] };
            }
            listBuffer!.items.push(ulMatch[1]);
            continue;
        }

        flushList();

        // Empty line
        if (trimmed === "") {
            elements.push(<div key={i} className="h-2" />);
            continue;
        }

        // Normal paragraph
        elements.push(
            <p key={i}>{renderInline(line)}</p>
        );
    }

    flushList();

    return <div className="space-y-1.5">{elements}</div>;
}

function renderInline(text: string) {
    const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    return parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
            return (
                <strong key={i} className="font-semibold text-zinc-50">
                    {part.slice(2, -2)}
                </strong>
            );
        }
        if (part.startsWith("`") && part.endsWith("`")) {
            return (
                <code
                    key={i}
                    className="rounded bg-zinc-700/50 px-1.5 py-0.5 text-xs font-mono text-emerald-300"
                >
                    {part.slice(1, -1)}
                </code>
            );
        }
        return <span key={i}>{part}</span>;
    });
}
