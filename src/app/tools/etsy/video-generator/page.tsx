import { Metadata } from "next";
import { ToolShell } from "@/components/tools/shell";
import { ToolSeoContent } from "@/components/tools/seo-content";
import { VideoGeneratorClient } from "@/components/tools/video-generator-client";
import { toolBySlug } from "@/lib/registry";

const tool = toolBySlug("video-generator")!;

export const metadata: Metadata = {
  title: "Etsy Listing Video Script Generator — 15s storyboards",
  description: tool.description
};

export default function Page() {
  return (
    <ToolShell
      crumbs={[{ href: "/", label: "Home" }, { href: "/tools", label: "Tools" }, { label: "Etsy" }, { label: tool.name }]}
      title={tool.name}
      description={tool.description}
    >
      <VideoGeneratorClient />
      <ToolSeoContent tool={tool} />
    </ToolShell>
  );
}
