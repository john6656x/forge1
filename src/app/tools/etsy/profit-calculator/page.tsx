import { Metadata } from "next";
import { ToolShell } from "@/components/tools/shell";
import { ToolSeoContent } from "@/components/tools/seo-content";
import { ProfitCalculatorClient } from "@/components/tools/profit-calculator-client";
import { toolBySlug } from "@/lib/registry";

const tool = toolBySlug("profit-calculator")!;

export const metadata: Metadata = {
  title: "Etsy Profit Calculator — every fee, your real margin",
  description: tool.description
};

export default function ProfitCalculatorPage() {
  return (
    <ToolShell
      crumbs={[{ href: "/", label: "Home" }, { href: "/tools", label: "Tools" }, { label: "Etsy" }, { label: tool.name }]}
      title={tool.name}
      description={tool.description}
    >
      <ProfitCalculatorClient />
      <ToolSeoContent tool={tool} />
    </ToolShell>
  );
}
