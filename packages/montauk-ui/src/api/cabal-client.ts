import { ChatEvent, ChatRequest } from "./types";

/**
 * Sends a message to CABAL and streams back events via SSE
 * Each event is yielded as it arrives - true streaming!
 */
export async function* streamChatEvents(
  request: ChatRequest,
): AsyncGenerator<ChatEvent> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) {
    throw new Error("No response body");
  }

  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();

    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6);
        if (data === "[DONE]") {
          return;
        }
        try {
          const event: ChatEvent = JSON.parse(data);
          yield event;
        } catch (e) {
          console.error("Failed to parse SSE event:", data);
        }
      }
    }
  }
}
