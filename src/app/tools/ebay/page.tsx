import { Metadata } from "next";
import { ToolShell } from "@/components/tools/shell";
import { ToolSeoContent } from "@/components/tools/seo-content";
import { toolBySlug } from "@/lib/registry";

const tool = toolBySlug("ebay-tools")!;

export const metadata: Metadata = { title: "eBay Tools (Phase 2)", description: tool.description };

export default function EbayPage() {
  return (
    <ToolShell
      crumbs={[{ href: "/", label: "Home" }, { href: "/tools", label: "Tools" }, { label: "eBay" }]}
      title="eBay Tools"
      description="The same research toolkit, pointed at eBay. Ships in phase 2 on the shared MarketplaceProvider architecture."
    >
      <ToolSeoContent tool={tool} />
    </ToolShell>
  );
}
