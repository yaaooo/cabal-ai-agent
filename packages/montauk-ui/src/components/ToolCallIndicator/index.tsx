interface ToolCallIndicatorProps {
  toolName: string;
  status: "running" | "complete";
  message?: string;
}

export default function ToolCallIndicator({
  toolName,
  status,
  message,
}: ToolCallIndicatorProps) {
  const displayName = toolName.toUpperCase().replace(/_/g, " ");

  if (status === "running") {
    return (
      <p className="font-mono text-sm py-1 text-amber-500">
        [ACCESSING CABAL SUBROUTINE: {displayName}
        <span className="pulse-dots">...</span>]
      </p>
    );
  }

  return (
    <p className="font-mono text-sm py-1 text-amber-600">
      [SUBROUTINE COMPLETE: {displayName}]
      {message && <span className="text-amber-700 ml-2">- {message}</span>}
    </p>
  );
}
