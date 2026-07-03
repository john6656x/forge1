import { Metadata } from "next";
import { ToolShell } from "@/components/tools/shell";
import { ToolSeoContent } from "@/components/tools/seo-content";
import { TagGeneratorClient } from "@/components/tools/tag-generator-client";
import { toolBySlug } from "@/lib/registry";

const tool = toolBySlug("tag-generator")!;

export const metadata: Metadata = {
  title: "Etsy Tag Generator — free, with search volume & competition",
  description: tool.description
};

export default function TagGeneratorPage() {
  return (
    <ToolShell
      crumbs={[{ href: "/", label: "Home" }, { href: "/tools", label: "Tools" }, { label: "Etsy" }, { label: tool.name }]}
      title={tool.name}
      description={tool.description}
    >
      <TagGeneratorClient />
      <ToolSeoContent tool={tool} />
    </ToolShell>
  );
}
