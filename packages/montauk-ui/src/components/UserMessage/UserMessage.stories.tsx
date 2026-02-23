import type { Story } from "@ladle/react";
import UserMessage from ".";

export const Short: Story = () => (
  <div className="bg-black p-4 min-h-screen">
    <UserMessage message="Tell me about the Mammoth Tank" />
  </div>
);

export const Long: Story = () => (
  <div className="bg-black p-4 min-h-screen">
    <UserMessage message="What tactical advantages does the Brotherhood of Nod have over GDI forces in urban combat scenarios?" />
  </div>
);

export const Multiple: Story = () => (
  <div className="bg-black p-4 min-h-screen">
    <UserMessage message="What is Tiberium?" />
    <UserMessage message="Tell me about Kane" />
    <UserMessage message="What are the best units for base defense?" />
  </div>
);
