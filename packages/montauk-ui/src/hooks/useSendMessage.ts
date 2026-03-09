import { useState, useCallback, useRef } from "react";
import { streamChatEvents } from "../api/cabal-client";
import { useMessagesState } from "./useMessagesState";
import { createUserMessage, createErrorMessage } from "../utils/message";

/**
 * Main orchestration hook for chat functionality
 * Composes smaller hooks for clean separation of concerns
 */
export function useSendMessage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const {
    messages,
    addStandardMessage,
    updateMessage,
    completeStreamingMessage,
    addOrExtendStreamingMessage,
  } = useMessagesState();

  // Process streaming events - creates new messages or appends to existing ones
  const processChatEvent = useCallback(
    (event: any) => {
      switch (event.type) {
        case "tool_call_start":
          addStandardMessage({
            id: event.toolCallId,
            role: "tool",
            toolName: event.toolName,
            status: "running",
            timestamp: new Date(),
          });
          break;

        case "tool_call_complete":
          updateMessage(event.toolCallId, {
            status: "complete",
            message: event.result,
          });
          break;

        case "content_delta": {
          addOrExtendStreamingMessage(event.messageId, event.delta);
          break;
        }

        case "message_complete":
          completeStreamingMessage(event.messageId, event.sources);
          break;

        case "error":
          console.error("Chat error:", event.error);
          addStandardMessage(createErrorMessage(new Error(event.error)));
          break;
      }
    },
    [
      addStandardMessage,
      updateMessage,
      completeStreamingMessage,
      addOrExtendStreamingMessage,
    ],
  );

  const sendMessage = useCallback(
    async (content: string) => {
      if (isProcessing) return;

      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      addStandardMessage(createUserMessage(content));
      setIsProcessing(true);

      try {
        for await (const event of streamChatEvents({ message: content })) {
          processChatEvent(event);
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error("Unknown error");
        console.error("Chat error:", err);
        addStandardMessage(createErrorMessage(err));
      } finally {
        setIsProcessing(false);
        abortControllerRef.current = null;
      }
    },
    [isProcessing, addStandardMessage, processChatEvent],
  );

  return { messages, sendMessage, isProcessing };
}
