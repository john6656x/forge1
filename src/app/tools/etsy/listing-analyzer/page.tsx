import { Metadata } from "next";
import { ToolShell } from "@/components/tools/shell";
import { ToolSeoContent } from "@/components/tools/seo-content";
import { ListingAnalyzerClient } from "@/components/tools/listing-analyzer-client";
import { toolBySlug } from "@/lib/registry";

const tool = toolBySlug("listing-analyzer")!;

export const metadata: Metadata = {
  title: "Etsy Listing Analyzer — free SEO audit for any listing",
  description: tool.description
};

export default function Page() {
  return (
    <ToolShell
      crumbs={[{ href: "/", label: "Home" }, { href: "/tools", label: "Tools" }, { label: "Etsy" }, { label: tool.name }]}
      title={tool.name}
      description={tool.description}
    >
      <ListingAnalyzerClient />
      <ToolSeoContent tool={tool} />
    </ToolShell>
  );
}
