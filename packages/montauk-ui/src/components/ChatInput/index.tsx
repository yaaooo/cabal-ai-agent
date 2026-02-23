import { useState, KeyboardEvent } from "react";

interface ChatInputProps {
  onSubmit: (message: string) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSubmit, disabled }: ChatInputProps) {
  const [input, setInput] = useState("");

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !disabled) {
        onSubmit(input.trim());
        setInput("");
      }
    }
  };

  return (
    <div className="font-mono text-sm border-t border-red-900 pt-2">
      <div className="flex items-center">
        <span className="text-neutral-500">{">"} COMMANDER: </span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Enter directive..."
          className="flex-1 bg-transparent text-neutral-200 outline-none placeholder-neutral-700 ml-1 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        {!disabled && input.trim() && (
          <span className="text-neutral-200 cursor-blink">▊</span>
        )}
      </div>
    </div>
  );
}
