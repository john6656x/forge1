import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { emailShell, sendEmail } from "@/lib/email";

const googleConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "sqlite" }),
  secret: process.env.BETTER_AUTH_SECRET ?? "dev-only-secret-change-me",
  baseURL: process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    // Live once RESEND_API_KEY is set; a logged no-op until then.
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Reset your RankForge password",
        html: emailShell("Reset your password", `
          <p style="font-size:14px;color:#334155;line-height:1.6">Someone (hopefully you) asked to reset the password for <strong>${user.email}</strong>.</p>
          <p style="margin:22px 0"><a href="${url}" style="background:#e56425;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:12px;font-weight:700;font-size:14px">Choose a new password</a></p>
          <p style="font-size:12px;color:#94a3b8">The link expires in 1 hour. If you didn't ask for this, ignore the email — nothing changes.</p>`)
      });
    }
  },
  socialProviders: googleConfigured
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID as string,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET as string
        }
      }
    : {},
  user: {
    additionalFields: {
      plan: {
        type: "string",
        defaultValue: "FREE",
        input: false // never settable from the client
      }
    }
  }
});

export type Plan = "FREE" | "BUSINESS" | "ENTERPRISE";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  plan: Plan;
}

/** Server-side session lookup for route handlers and server components. */
export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return null;
    const u = session.user as unknown as SessionUser & { plan?: string };
    const plan = (u.plan === "BUSINESS" || u.plan === "ENTERPRISE" ? u.plan : "FREE") as Plan;
    return { id: u.id, name: u.name, email: u.email, image: u.image, plan };
  } catch {
    return null;
  }
}
