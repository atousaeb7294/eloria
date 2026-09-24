import { prisma } from "@/lib/prisma";

export async function latestSeoAutomationReport() {
  const run = await prisma.seoAutomationRun.findFirst({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { report: true },
  });
  if (run) return run.report;
  // Preserve the cursor of installations that recorded reports in old snapshots.
  const snapshot = await prisma.contentSeoSnapshot.findFirst({
    orderBy: { recordedFor: "desc" },
    select: { issues: true },
  });
  return Array.isArray(snapshot?.issues)
    ? snapshot.issues.find(
        (item) =>
          item &&
          typeof item === "object" &&
          !Array.isArray(item) &&
          item.id === "SEO_AUTOPILOT_RUN",
      )
    : undefined;
}
