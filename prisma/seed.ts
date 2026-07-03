/**
 * Demo seed: creates demo@rankforge.app / password "rankforge123"
 * plus a sample project and a few searches, so the dashboard has life
 * on first run. Run with: npm run db:seed
 */
import { auth } from "../src/lib/auth";
import { prisma } from "../src/lib/db";

async function main() {
  const email = "demo@rankforge.app";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("Seed user already exists — nothing to do.");
    return;
  }

  // Create through Better Auth so the password hash matches its scheme.
  await auth.api.signUpEmail({
    body: { name: "Demo Seller", email, password: "rankforge123" }
  });

  const user = await prisma.user.findUniqueOrThrow({ where: { email } });

  const project = await prisma.project.create({
    data: { userId: user.id, name: "Ceramic mugs — Q4 push" }
  });
  await prisma.projectItem.create({
    data: {
      projectId: project.id,
      kind: "tags",
      title: "Tag set — ceramic mug",
      payload: JSON.stringify({ tags: ["ceramic mug", "handmade mug", "coffee lover gift", "pottery mug", "mug for her", "espresso cup", "stoneware mug"] })
    }
  });
  await prisma.search.createMany({
    data: [
      { userId: user.id, tool: "tags", query: "ceramic mug", location: "USA" },
      { userId: user.id, tool: "keywords", query: "espresso cup", location: "Global" },
      { userId: user.id, tool: "shop", query: "WillowStudio", location: "Global" }
    ]
  });

  console.log("Seeded demo account: demo@rankforge.app / rankforge123");
}

main().finally(() => prisma.$disconnect());
