import { Metadata } from "next";
import { ToolShell } from "@/components/tools/shell";
import { ToolSeoContent } from "@/components/tools/seo-content";
import { RankCheckClient } from "@/components/tools/rank-check-client";
import { toolBySlug } from "@/lib/registry";

const tool = toolBySlug("rank-check")!;

export const metadata: Metadata = {
  title: "Etsy Rank Checker — where does your listing rank?",
  description: tool.description
};

export default function Page() {
  return (
    <ToolShell
      crumbs={[{ href: "/", label: "Home" }, { href: "/tools", label: "Tools" }, { label: "Etsy" }, { label: tool.name }]}
      title={tool.name}
      description={tool.description}
    >
      <RankCheckClient />
      <ToolSeoContent tool={tool} />
    </ToolShell>
  );
}
