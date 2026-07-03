import { Metadata } from "next";
import { ToolShell } from "@/components/tools/shell";
import { ToolSeoContent } from "@/components/tools/seo-content";
import { KeywordGeneratorClient } from "@/components/tools/keyword-generator-client";
import { toolBySlug } from "@/lib/registry";

const tool = toolBySlug("keyword-generator")!;

export const metadata: Metadata = {
  title: "Etsy Keyword Generator — buyer-intent phrases with volume",
  description: tool.description
};

export default function KeywordGeneratorPage() {
  return (
    <ToolShell
      crumbs={[{ href: "/", label: "Home" }, { href: "/tools", label: "Tools" }, { label: tool.name }]}
      title={tool.name}
      description={tool.description}
    >
      <KeywordGeneratorClient />
      <ToolSeoContent tool={tool} />
    </ToolShell>
  );
}
