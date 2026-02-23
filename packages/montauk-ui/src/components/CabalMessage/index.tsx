import { SourceLink } from "../../types/chat";

interface CabalMessageProps {
  message: string;
  isStreaming: boolean;
  sources?: SourceLink[];
}

export default function CabalMessage({
  message,
  isStreaming,
  sources,
}: CabalMessageProps) {
  return (
    <div className="font-mono text-sm py-1">
      <div>
        <span className="text-red-800">{">"} CABAL: </span>
        <span className="text-red-600">
          {message}
          {isStreaming && <span className="cursor-blink">▊</span>}
        </span>
      </div>
      {sources && sources.length > 0 && (
        <div className="mt-1 ml-8 space-y-0.5">
          {sources.map((source, index) => (
            <div key={index} className="text-xs text-red-700">
              <span className="text-neutral-600">[SOURCE] </span>
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-red-500 underline"
              >
                {source.title}
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
