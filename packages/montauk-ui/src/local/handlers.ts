import { http, HttpResponse, delay } from "msw";
import { ChatRequest } from "../api/types";

/**
 * MSW handlers for mocking the CABAL API
 * Simulates realistic streaming responses with tool calls
 */

export const handlers = [
  http.post("/api/chat", async ({ request }) => {
    const body = (await request.json()) as ChatRequest;
    const userMessage = body.message;

    // Create a readable stream for SSE
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        // Helper to send SSE event
        const sendEvent = (data: any) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
          );
        };

        try {
          // Step 1: Tool call starts
          await delay(300);
          const toolCallId = `tool-${Date.now()}`;
          sendEvent({
            type: "tool_call_start",
            toolCallId,
            toolName: "query_nod_archives",
          });

          // Step 2: Tool call completes
          await delay(300);
          sendEvent({
            type: "tool_call_complete",
            toolCallId,
            result: "Retrieved 3 documents",
          });

          // Step 3: Stream response tokens
          await delay(300);
          const messageId = `msg-${Date.now()}`;
          const response = `Analyzing your query, Commander. Query received: "${userMessage}". This is a simulated streaming response from CABAL. The Brotherhood of Nod archives have been accessed successfully.`;

          // Stream word by word for realistic effect
          const words = response.split(" ");
          for (const word of words) {
            sendEvent({
              type: "content_delta",
              messageId,
              delta: word + " ",
            });
            await delay(50);
          }

          // Step 4: Message complete with sources
          await delay(200);
          sendEvent({
            type: "message_complete",
            messageId,
            sources: [
              {
                title: "Command & Conquer Wiki - Brotherhood of Nod",
                url: "https://cnc.fandom.com/wiki/Brotherhood_of_Nod",
              },
              {
                title: "CABAL System Documentation",
                url: "https://cnc.fandom.com/wiki/CABAL",
              },
            ],
          });

          // Signal completion
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          sendEvent({
            type: "error",
            error: "Simulation error occurred",
          });
          controller.close();
        }
      },
    });

    return new HttpResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }),
];
