interface UserMessageProps {
  message: string;
  timestamp?: Date;
}

export default function UserMessage({ message, timestamp }: UserMessageProps) {
  return (
    <div className="font-mono text-sm py-1">
      <span className="text-neutral-500">{">"} COMMANDER: </span>
      <span className="text-neutral-200">{message}</span>
    </div>
  );
}
