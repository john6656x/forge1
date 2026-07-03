import { Metadata } from "next";
import { ToolShell } from "@/components/tools/shell";
import { ToolSeoContent } from "@/components/tools/seo-content";
import { NicheFinderClient } from "@/components/tools/niche-finder-client";
import { toolBySlug } from "@/lib/registry";

const tool = toolBySlug("niche-finder")!;

export const metadata: Metadata = {
  title: "Etsy Niche Finder — opportunity-scored sub-niches",
  description: tool.description
};

export default function Page() {
  return (
    <ToolShell
      crumbs={[{ href: "/", label: "Home" }, { href: "/tools", label: "Tools" }, { label: "Etsy" }, { label: tool.name }]}
      title={tool.name}
      description={tool.description}
    >
      <NicheFinderClient />
      <ToolSeoContent tool={tool} />
    </ToolShell>
  );
}
