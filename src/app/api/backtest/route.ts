import { NextRequest } from "next/server";

const NEXOW_SERVER_URL =
  process.env.NEXOW_SERVER_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const engineResponse = await fetch(`${NEXOW_SERVER_URL}/api/backtest`, {
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
        error: `Failed to connect to server: ${error instanceof Error ? error.message : "Unknown error"}`,
      }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
