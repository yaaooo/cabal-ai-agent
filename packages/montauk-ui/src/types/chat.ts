export type MessageRole = "user" | "cabal" | "tool" | "system";

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

export interface StreamingCabalMessage {
  id: string;
  role: "cabal";
  content: string;
  isStreaming: true; // Literal type for type guard
  timestamp: Date;
  // Note: No sources - streaming messages don't have sources yet
}

export interface StandardCabalMessage {
  id: string;
  role: "cabal";
  content: string;
  isStreaming: false; // Literal type for type guard
  sources?: SourceLink[];
  timestamp: Date;
}

export type CabalMessage = StreamingCabalMessage | StandardCabalMessage;

export interface SystemMessage {
  id: string;
  role: "system";
  content: string;
  timestamp: Date;
}

export type Message =
  | UserMessage
  | ToolCallMessage
  | CabalMessage
  | SystemMessage;
