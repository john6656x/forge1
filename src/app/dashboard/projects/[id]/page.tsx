import { ProjectDetailClient } from "@/components/dashboard/project-detail-client";

export const metadata = { title: "Project — RankForge" };

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main id="main" className="container-page py-10">
      <ProjectDetailClient id={id} />
    </main>
  );
}
