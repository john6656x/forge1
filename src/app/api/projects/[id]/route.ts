import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function ownProject(id: string, userId: string) {
  const project = await prisma.project.findUnique({ where: { id } });
  return project && project.userId === userId ? project : null;
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { id } = await ctx.params;
  const project = await prisma.project.findUnique({ where: { id }, include: { items: { orderBy: { createdAt: "desc" } } } });
  if (!project || project.userId !== user.id) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json({
    project: { ...project, items: project.items.map((i) => ({ ...i, payload: JSON.parse(i.payload) })) }
  });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { id } = await ctx.params;
  if (!(await ownProject(id, user.id))) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const parsed = z.object({
    kind: z.enum(["tags", "keywords", "note", "listing-draft"]),
    title: z.string().trim().min(1).max(140),
    payload: z.unknown()
  }).safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });

  const item = await prisma.projectItem.create({
    data: { projectId: id, kind: parsed.data.kind, title: parsed.data.title, payload: JSON.stringify(parsed.data.payload ?? {}) }
  });
  await prisma.project.update({ where: { id }, data: { updatedAt: new Date() } });
  return NextResponse.json({ item }, { status: 201 });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { id } = await ctx.params;
  if (!(await ownProject(id, user.id))) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const parsed = z.object({ name: z.string().trim().min(1).max(80) }).safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  const project = await prisma.project.update({ where: { id }, data: { name: parsed.data.name } });
  return NextResponse.json({ project });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { id } = await ctx.params;
  if (!(await ownProject(id, user.id))) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const itemId = req.nextUrl.searchParams.get("item");
  if (itemId) {
    await prisma.projectItem.deleteMany({ where: { id: itemId, projectId: id } });
    return NextResponse.json({ deleted: "item" });
  }
  await prisma.project.delete({ where: { id } });
  return NextResponse.json({ deleted: "project" });
}
