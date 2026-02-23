import type { Story } from "@ladle/react";
import ToolCallIndicator from ".";

export const Running: Story = () => (
  <div className="bg-black p-4 min-h-screen">
    <ToolCallIndicator toolName="query_nod_archives" status="running" />
  </div>
);

export const Complete: Story = () => (
  <div className="bg-black p-4 min-h-screen">
    <ToolCallIndicator toolName="query_nod_archives" status="complete" />
  </div>
);

export const CompleteWithMessage: Story = () => (
  <div className="bg-black p-4 min-h-screen">
    <ToolCallIndicator
      toolName="query_nod_archives"
      status="complete"
      message="Retrieved 3 documents"
    />
  </div>
);

export const Sequence: Story = () => (
  <div className="bg-black p-4 min-h-screen space-y-2">
    <ToolCallIndicator toolName="query_nod_archives" status="running" />
    <ToolCallIndicator
      toolName="query_nod_archives"
      status="complete"
      message="Retrieved 5 documents"
    />
    <ToolCallIndicator toolName="analyze_tactical_data" status="running" />
  </div>
);
