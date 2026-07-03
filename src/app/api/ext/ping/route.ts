import { NextRequest, NextResponse } from "next/server";
import { extCors, getExtUser } from "@/lib/ext-auth";
import { planLimit, checkQuota } from "@/lib/quota";

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { headers: extCors(req.headers.get("origin")) });
}

/** Extension handshake: who am I, what plan, how much extension quota is left. */
export async function GET(req: NextRequest) {
  const headers = extCors(req.headers.get("origin"));
  const user = await getExtUser(req);
  if (!user) return NextResponse.json({ ok: false, error: "INVALID_TOKEN" }, { status: 401, headers });
  const quota = await checkQuota({ ...user, name: "", plan: user.plan } as never, "extension");
  return NextResponse.json({
    ok: true,
    email: user.email,
    plan: user.plan,
    quota: { used: quota.used, limit: planLimit(user.plan) === Infinity ? -1 : planLimit(user.plan) }
  }, { headers });
}
