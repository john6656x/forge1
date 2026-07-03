import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { SiteHeader } from "@/components/marketing/header";
import { SiteFooter } from "@/components/marketing/footer";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/auth/login");
  return (
    <>
      <SiteHeader />
      {children}
      <SiteFooter />
    </>
  );
}
