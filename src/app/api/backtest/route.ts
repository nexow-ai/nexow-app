import { NextRequest } from "next/server";

const ENGINE_API_URL =
  process.env.ENGINE_API_URL || "http://localhost:8100";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const engineResponse = await fetch(`${ENGINE_API_URL}/backtest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!engineResponse.ok) {
      const errorText = await engineResponse.text();
      return new Response(
        JSON.stringify({ error: `Engine error: ${errorText}` }),
        { status: engineResponse.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // Stream the SSE response from the engine back to the client
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
        error: `Failed to connect to engine: ${error instanceof Error ? error.message : "Unknown error"}`,
      }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
