export type MessageRole = "user" | "cabal" | "tool";

export interface SourceLink {
  title: string;
  url: string;
}

export interface UserMessage {
  id: string;
  role: "user";
  content: string;
  timestamp: Date;
}

export interface ToolCallMessage {
  id: string;
  role: "tool";
  toolName: string;
  status: "running" | "complete";
  message?: string;
  timestamp: Date;
}

export interface CabalMessage {
  id: string;
  role: "cabal";
  content: string;
  isStreaming: boolean;
  sources?: SourceLink[];
  timestamp: Date;
}

export type Message = UserMessage | ToolCallMessage | CabalMessage;
