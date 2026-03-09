import { useSendMessage } from "../../hooks/useSendMessage";
import Header from "../Header/index";
import UserMessage from "../UserMessage";
import CabalMessage from "../CabalMessage";
import ToolCallIndicator from "../ToolCallIndicator";
import ChatInput from "../ChatInput";
import MessageList from "../MessageList";

export default function ChatContainer() {
  const { messages, sendMessage, isProcessing } = useSendMessage();

  return (
    <div className="h-screen w-screen bg-black flex flex-col">
      <Header />

      <MessageList>
        {messages.map((msg) => {
          if (msg.role === "user") {
            return <UserMessage key={msg.id} message={msg.content} />;
          } else if (msg.role === "tool") {
            return (
              <ToolCallIndicator
                key={msg.id}
                toolName={msg.toolName}
                status={msg.status}
                message={msg.message}
              />
            );
          } else if (msg.role === "cabal") {
            return (
              <CabalMessage
                key={msg.id}
                message={msg.content}
                isStreaming={msg.isStreaming}
                sources={!msg.isStreaming ? msg.sources : undefined}
              />
            );
          }
          return null;
        })}
      </MessageList>

      <div className="p-4">
        <ChatInput onSubmit={sendMessage} disabled={isProcessing} />
      </div>
    </div>
  );
}
