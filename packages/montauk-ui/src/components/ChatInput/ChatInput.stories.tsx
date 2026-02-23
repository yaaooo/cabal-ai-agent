import type { Story } from "@ladle/react";
import ChatInput from ".";

export const Default: Story = () => (
  <div className="bg-black p-4 min-h-screen">
    <ChatInput onSubmit={(msg) => console.log("Submitted:", msg)} />
  </div>
);

export const Disabled: Story = () => (
  <div className="bg-black p-4 min-h-screen">
    <ChatInput onSubmit={(msg) => console.log("Submitted:", msg)} disabled />
  </div>
);

export const WithContext: Story = () => (
  <div className="bg-black p-4 min-h-screen flex flex-col">
    <div className="flex-1 space-y-2">
      <div className="font-mono text-sm py-1">
        <span className="text-neutral-500">{">"} COMMANDER: </span>
        <span className="text-neutral-200">What is Tiberium?</span>
      </div>
      <div className="font-mono text-sm py-1 text-amber-500">
        [ACCESSING CABAL SUBROUTINE: QUERY NOD ARCHIVES
        <span className="pulse-dots">...</span>]
      </div>
    </div>
    <ChatInput onSubmit={(msg) => console.log("Submitted:", msg)} disabled />
  </div>
);
