import { Metadata } from "next";
import { ToolShell } from "@/components/tools/shell";
import { ToolSeoContent } from "@/components/tools/seo-content";
import { DescriptionGeneratorClient } from "@/components/tools/description-generator-client";
import { toolBySlug } from "@/lib/registry";

const tool = toolBySlug("description-generator")!;

export const metadata: Metadata = {
  title: "Etsy Description Generator — structured, SEO-ready copy",
  description: tool.description
};

export default function Page() {
  return (
    <ToolShell
      crumbs={[{ href: "/", label: "Home" }, { href: "/tools", label: "Tools" }, { label: "Etsy" }, { label: tool.name }]}
      title={tool.name}
      description={tool.description}
    >
      <DescriptionGeneratorClient />
      <ToolSeoContent tool={tool} />
    </ToolShell>
  );
}
