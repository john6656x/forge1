import { Metadata } from "next";
import { ToolShell } from "@/components/tools/shell";
import { ToolSeoContent } from "@/components/tools/seo-content";
import { TrendsClient } from "@/components/tools/trends-client";
import { toolBySlug } from "@/lib/registry";

const tool = toolBySlug("trends")!;

export const metadata: Metadata = {
  title: "Etsy Trends — rising & falling keywords right now",
  description: tool.description
};

export default function Page() {
  return (
    <ToolShell
      crumbs={[{ href: "/", label: "Home" }, { href: "/tools", label: "Tools" }, { label: "Etsy" }, { label: tool.name }]}
      title={tool.name}
      description={tool.description}
    >
      <TrendsClient />
      <ToolSeoContent tool={tool} />
    </ToolShell>
  );
}
