import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { LAB_MODEL_CREDITS, LAB_DEFAULT_CREDITS } from "@/lib/stripe/plans";

export const dynamic = "force-dynamic";

const NEXOW_API_URL =
    process.env.NEXOW_API_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return new Response(JSON.stringify({ error: "Not authenticated" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
        });
    }

    const body = await request.json();
    const { messages, currentStrategy, provider, model } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return new Response(
            JSON.stringify({ error: "Messages array is required" }),
            { status: 400, headers: { "Content-Type": "application/json" } }
        );
    }

    // Determine credit cost for the selected model
    const creditCost =
        LAB_MODEL_CREDITS[model as string] ?? LAB_DEFAULT_CREDITS;

    // Consume credits (checks balance atomically and deducts)
    const { data: consumed, error: creditError } = await (supabase.rpc as Function)(
        "consume_credits",
        {
            p_user_id: user.id,
            p_amount: creditCost,
            p_action: "lab_message",
            p_description: `Strategy Labs chat (${provider}/${model})`,
        }
    );

    if (creditError || consumed === false) {
        return new Response(
            JSON.stringify({
                error: "Insufficient credits — upgrade your plan or wait for monthly reset",
            }),
            { status: 402, headers: { "Content-Type": "application/json" } }
        );
    }

    try {
        const engineResponse = await fetch(
            `${NEXOW_API_URL}/api/labs/message`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages,
                    currentStrategy,
                    provider: provider || "openai",
                    model: model || undefined,
                }),
            }
        );

        if (!engineResponse.ok) {
            const errText = await engineResponse.text();
            return new Response(
                JSON.stringify({ error: `Engine error: ${errText}` }),
                {
                    status: engineResponse.status,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }

        // Stream the SSE response through
        const stream = new ReadableStream({
            async start(controller) {
                const reader = engineResponse.body?.getReader();
                if (!reader) {
                    controller.close();
                    return;
                }

                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        controller.enqueue(value);
                    }
                } catch {
                    // Connection closed
                } finally {
                    controller.close();
                }
            },
        });

        return new Response(stream, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
            },
        });
    } catch (error) {
        return new Response(
            JSON.stringify({
                error: `Failed to connect to server: ${error instanceof Error ? error.message : "Unknown error"
                    }`,
            }),
            { status: 502, headers: { "Content-Type": "application/json" } }
        );
    }
}
