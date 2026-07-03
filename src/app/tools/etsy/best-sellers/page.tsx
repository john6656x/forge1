import { Metadata } from "next";
import { ToolShell } from "@/components/tools/shell";
import { ToolSeoContent } from "@/components/tools/seo-content";
import { BestSellersClient } from "@/components/tools/best-sellers-client";
import { toolBySlug } from "@/lib/registry";

const tool = toolBySlug("best-sellers")!;

export const metadata: Metadata = {
  title: "Etsy Best Sellers — what actually sells in any niche",
  description: tool.description
};

export default function Page() {
  return (
    <ToolShell
      crumbs={[{ href: "/", label: "Home" }, { href: "/tools", label: "Tools" }, { label: "Etsy" }, { label: tool.name }]}
      title={tool.name}
      description={tool.description}
    >
      <BestSellersClient />
      <ToolSeoContent tool={tool} />
    </ToolShell>
  );
}
