import { Metadata } from "next";
import { ToolShell } from "@/components/tools/shell";
import { ToolSeoContent } from "@/components/tools/seo-content";
import { ForgeAiClient } from "@/components/tools/forge-ai-client";
import { toolBySlug } from "@/lib/registry";

const tool = toolBySlug("forge-ai")!;

export const metadata: Metadata = {
  title: "Forge AI — your Etsy SEO copilot",
  description: tool.description
};

export default function Page() {
  return (
    <ToolShell
      crumbs={[{ href: "/", label: "Home" }, { href: "/tools", label: "Tools" }, { label: tool.name }]}
      title={tool.name}
      description={tool.description}
    >
      <ForgeAiClient />
      <ToolSeoContent tool={tool} />
    </ToolShell>
  );
}
