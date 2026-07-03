import { Metadata } from "next";
import { ToolShell } from "@/components/tools/shell";
import { ToolSeoContent } from "@/components/tools/seo-content";
import { SupplierWatchClient } from "@/components/tools/supplier-watch-client";
import { toolBySlug } from "@/lib/registry";

const tool = toolBySlug("supplier-watch")!;

export const metadata: Metadata = {
  title: "Supplier Watch — AliExpress price & stock monitoring for Etsy sellers",
  description: tool.description
};

export default function Page() {
  return (
    <ToolShell
      crumbs={[{ href: "/", label: "Home" }, { href: "/tools", label: "Tools" }, { label: "Etsy" }, { label: tool.name }]}
      title={tool.name}
      description={tool.description}
    >
      <SupplierWatchClient />
      <ToolSeoContent tool={tool} />
    </ToolShell>
  );
}
