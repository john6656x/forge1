import { NextResponse } from "next/server";
import { checkQuota, quotaJson } from "@/lib/quota";
import { getSessionUser } from "@/lib/auth";
import { llmProviderName } from "@/lib/llm";
import { getProvider } from "@/lib/providers";

export async function GET() {
  const user = await getSessionUser();
  const quota = await checkQuota(user, "all");
  return NextResponse.json({
    signedIn: Boolean(user),
    plan: user?.plan ?? "ANONYMOUS",
    quota: quotaJson(quota),
    dataSource: getProvider().source,
    llm: llmProviderName()
  });
}
