import { Metadata } from "next";
import { ToolShell } from "@/components/tools/shell";
import { ToolSeoContent } from "@/components/tools/seo-content";
import { AiVisibilityClient } from "@/components/tools/ai-visibility-client";
import { toolBySlug } from "@/lib/registry";

const tool = toolBySlug("ai-visibility")!;

export const metadata: Metadata = {
  title: "Etsy AI Visibility Score — is your listing visible to ChatGPT shopping?",
  description: tool.description
};

export default function Page() {
  return (
    <ToolShell
      crumbs={[{ href: "/", label: "Home" }, { href: "/tools", label: "Tools" }, { label: "Etsy" }, { label: tool.name }]}
      title={tool.name}
      description={tool.description}
    >
      <AiVisibilityClient />
      <ToolSeoContent tool={tool} />
    </ToolShell>
  );
}
