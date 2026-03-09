/**
 * API Types - Server-sent events from CABAL API
 */

export type ChatEvent =
  | ToolCallStartEvent
  | ToolCallCompleteEvent
  | ContentDeltaEvent
  | MessageCompleteEvent
  | ErrorEvent;

export interface ToolCallStartEvent {
  type: "tool_call_start";
  toolCallId: string;
  toolName: string;
}

export interface ToolCallCompleteEvent {
  type: "tool_call_complete";
  toolCallId: string;
  result: string;
}

export interface ContentDeltaEvent {
  type: "content_delta";
  messageId: string;
  delta: string; // Token chunk
}

export interface MessageCompleteEvent {
  type: "message_complete";
  messageId: string;
  sources?: Array<{
    title: string;
    url: string;
  }>;
}

export interface ErrorEvent {
  type: "error";
  error: string;
}

export interface ChatRequest {
  message: string;
  conversationId?: string;
}
