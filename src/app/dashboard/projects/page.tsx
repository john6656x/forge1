import { ProjectsClient } from "@/components/dashboard/projects-client";

export const metadata = { title: "Projects — RankForge" };

export default function ProjectsPage() {
  return (
    <main id="main" className="container-page py-10">
      <h1 className="text-2xl font-extrabold tracking-tight text-brand-900 dark:text-white">Projects</h1>
      <p className="mt-1 max-w-xl text-sm text-slate-500 dark:text-slate-400">
        A project is a workspace per product line: saved tag sets, keyword lists, and listing drafts from any tool land here.
      </p>
      <ProjectsClient />
    </main>
  );
}
