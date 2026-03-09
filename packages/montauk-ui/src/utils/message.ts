import { Message } from "../types/chat";

export function createUserMessage(content: string): Message {
  return {
    id: `user-${Date.now()}`,
    role: "user",
    content,
    timestamp: new Date(),
  };
}

export function createErrorMessage(error: unknown): Message {
  return {
    id: `error-${Date.now()}`,
    role: "system",
    content:
      error instanceof Error
        ? `Error: ${error.message}`
        : "An unexpected error occurred.",
    timestamp: new Date(),
  };
}

export function createToolMessage(
  toolCallId: string,
  toolName: string,
): Message {
  return {
    id: toolCallId,
    role: "tool",
    toolName,
    status: "running",
    timestamp: new Date(),
  };
}

export function createCabalMessage(
  messageId: string,
  initialContent: string = "",
): Message {
  return {
    id: messageId,
    role: "cabal",
    content: initialContent,
    isStreaming: true,
    timestamp: new Date(),
  };
}
