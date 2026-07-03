import { Metadata } from "next";
import { ToolShell } from "@/components/tools/shell";
import { ToolSeoContent } from "@/components/tools/seo-content";
import { PromptImproverClient } from "@/components/tools/prompt-improver-client";
import { toolBySlug } from "@/lib/registry";

const tool = toolBySlug("prompt-improver")!;

export const metadata: Metadata = {
  title: "Prompt Improver — sharper prompts, better AI output",
  description: tool.description
};

export default function Page() {
  return (
    <ToolShell
      crumbs={[{ href: "/", label: "Home" }, { href: "/tools", label: "Tools" }, { label: tool.name }]}
      title={tool.name}
      description={tool.description}
    >
      <PromptImproverClient />
      <ToolSeoContent tool={tool} />
    </ToolShell>
  );
}
