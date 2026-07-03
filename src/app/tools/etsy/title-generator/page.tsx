import { Metadata } from "next";
import { ToolShell } from "@/components/tools/shell";
import { ToolSeoContent } from "@/components/tools/seo-content";
import { TitleGeneratorClient } from "@/components/tools/title-generator-client";
import { toolBySlug } from "@/lib/registry";

const tool = toolBySlug("title-generator")!;

export const metadata: Metadata = {
  title: "Etsy Title Generator — natural 2026-style titles that rank",
  description: tool.description
};

export default function Page() {
  return (
    <ToolShell
      crumbs={[{ href: "/", label: "Home" }, { href: "/tools", label: "Tools" }, { label: "Etsy" }, { label: tool.name }]}
      title={tool.name}
      description={tool.description}
    >
      <TitleGeneratorClient />
      <ToolSeoContent tool={tool} />
    </ToolShell>
  );
}
