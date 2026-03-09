import { useState, useCallback, useMemo } from "react";
import { Message, SourceLink } from "../types/chat";

/**
 * Normalized state management for messages
 * Uses ids array + message map for efficient direct lookups
 */
export function useMessagesState() {
  // Normalized state: ids array + message map
  const [messageIds, setMessageIds] = useState<string[]>([]);
  const [messageMap, setMessageMap] = useState<Record<string, Message>>({});

  // Derived messages array (memoized) - maintains external API compatibility
  const messages = useMemo(
    () => messageIds.map((id) => messageMap[id]),
    [messageIds, messageMap],
  );

  const addStandardMessage = useCallback((message: Message) => {
    setMessageIds((prev) => [...prev, message.id]);
    setMessageMap((prev) => ({ ...prev, [message.id]: message }));
  }, []);

  const updateMessage = useCallback((id: string, updates: Partial<Message>) => {
    setMessageMap((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...updates } as Message,
    }));
  }, []);

  const clearMessages = useCallback(() => {
    setMessageIds([]);
    setMessageMap({});
  }, []);

  /**
   * Completes a streaming message by transforming it to a standard message
   * Changes isStreaming from true to false and adds sources
   */
  const completeStreamingMessage = useCallback(
    (id: string, sources?: SourceLink[]) => {
      setMessageMap((prev) => {
        const msg = prev[id];
        if (!msg || msg.role !== "cabal" || !msg.isStreaming) return prev;

        return {
          ...prev,
          [id]: {
            id: msg.id,
            role: "cabal" as const,
            content: msg.content,
            isStreaming: false as const,
            sources,
            timestamp: msg.timestamp,
          },
        };
      });
    },
    [],
  );

  /**
   * Appends content to an existing streaming message or creates a new one
   * Reads from current state inside setters to avoid stale closures
   */
  const addOrExtendStreamingMessage = useCallback(
    (id: string, contentDelta: string, isStreaming = true) => {
      // Guard against duplicate IDs (read from current state)
      setMessageIds((prevIds) => {
        if (prevIds.includes(id)) {
          return prevIds; // Already exists, no change
        }
        return [...prevIds, id]; // New message, add ID
      });

      // Update or create message (read from current state)
      setMessageMap((prev) => {
        const existing = prev[id]; // Read from CURRENT state, not closure

        if (existing && existing.role === "cabal") {
          // Append to existing message
          return {
            ...prev,
            [id]: { ...existing, content: existing.content + contentDelta },
          };
        } else {
          // Create new streaming message
          const newMessage: Message = {
            id,
            role: "cabal" as const,
            content: contentDelta,
            isStreaming: isStreaming as true,
            timestamp: new Date(),
          };
          return { ...prev, [id]: newMessage };
        }
      });
    },
    [], // No dependencies - callback is stable
  );

  return {
    messages,
    addStandardMessage,
    updateMessage,
    completeStreamingMessage,
    addOrExtendStreamingMessage,
    clearMessages,
  };
}
