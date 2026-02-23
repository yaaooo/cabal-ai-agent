import { ReactNode, useEffect, useRef } from "react";

interface MessageListProps {
  children: ReactNode;
}

export default function MessageList({ children }: MessageListProps) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [children]);

  return (
    <div
      ref={listRef}
      className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-thin scrollbar-thumb-red-900 scrollbar-track-neutral-950"
    >
      {children}
    </div>
  );
}
