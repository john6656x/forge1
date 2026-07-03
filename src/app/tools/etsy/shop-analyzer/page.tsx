import { Metadata } from "next";
import { ToolShell } from "@/components/tools/shell";
import { ToolSeoContent } from "@/components/tools/seo-content";
import { ShopAnalyzerClient } from "@/components/tools/shop-analyzer-client";
import { toolBySlug } from "@/lib/registry";

const tool = toolBySlug("shop-analyzer")!;

export const metadata: Metadata = {
  title: "Etsy Shop Analyzer — score any shop's SEO in seconds",
  description: tool.description
};

export default function Page() {
  return (
    <ToolShell
      crumbs={[{ href: "/", label: "Home" }, { href: "/tools", label: "Tools" }, { label: "Etsy" }, { label: tool.name }]}
      title={tool.name}
      description={tool.description}
    >
      <ShopAnalyzerClient />
      <ToolSeoContent tool={tool} />
    </ToolShell>
  );
}
