import type { Story } from "@ladle/react";
import CabalMessage from ".";

export const Static: Story = () => (
  <div className="bg-black p-4 min-h-screen">
    <CabalMessage
      message="Analyzing the data, Commander. The GDI Mammoth Tank is a critical strategic asset equipped with dual 120mm cannons and SAM missile pods."
      isStreaming={false}
    />
  </div>
);

export const Streaming: Story = () => (
  <div className="bg-black p-4 min-h-screen">
    <CabalMessage message="Processing tactical assessment" isStreaming={true} />
  </div>
);

export const WithSources: Story = () => (
  <div className="bg-black p-4 min-h-screen">
    <CabalMessage
      message="The Brotherhood of Nod utilizes stealth technology and guerrilla tactics. Kane's vision guides all operations. Probability of success in urban environments: 87.3%."
      isStreaming={false}
      sources={[
        {
          title: "Brotherhood of Nod - Command & Conquer Wiki",
          url: "https://cnc.fandom.com/wiki/Brotherhood_of_Nod",
        },
        {
          title: "Kane - Command & Conquer Wiki",
          url: "https://cnc.fandom.com/wiki/Kane",
        },
      ]}
    />
  </div>
);

export const Multiple: Story = () => (
  <div className="bg-black p-4 min-h-screen space-y-2">
    <CabalMessage
      message="Query acknowledged, Commander."
      isStreaming={false}
    />
    <CabalMessage message="Accessing tactical database" isStreaming={true} />
    <CabalMessage
      message="Tiberium is a crystalline substance of extraterrestrial origin. Highly valuable, extremely hazardous to organic lifeforms."
      isStreaming={false}
      sources={[
        {
          title: "Tiberium - Command & Conquer Wiki",
          url: "https://cnc.fandom.com/wiki/Tiberium",
        },
      ]}
    />
  </div>
);
