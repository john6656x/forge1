import { Metadata } from "next";
import { ToolShell } from "@/components/tools/shell";
import { ToolSeoContent } from "@/components/tools/seo-content";
import { ListingStudioClient } from "@/components/tools/listing-studio-client";
import { toolBySlug } from "@/lib/registry";

const tool = toolBySlug("listing-studio")!;

export const metadata: Metadata = {
  title: "Etsy Listing Studio — full listings + AI optimizer",
  description: tool.description
};

export default function Page() {
  return (
    <ToolShell
      crumbs={[{ href: "/", label: "Home" }, { href: "/tools", label: "Tools" }, { label: "Etsy" }, { label: tool.name }]}
      title={tool.name}
      description={tool.description}
    >
      <ListingStudioClient />
      <ToolSeoContent tool={tool} />
    </ToolShell>
  );
}
