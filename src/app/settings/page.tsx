import { SettingsClient } from "@/components/dashboard/settings-client";

export const metadata = { title: "Settings — RankForge" };

export default function SettingsPage() {
  return (
    <main id="main" className="container-page py-10">
      <h1 className="text-2xl font-extrabold tracking-tight text-brand-900 dark:text-white">Settings</h1>
      <SettingsClient />
    </main>
  );
}
