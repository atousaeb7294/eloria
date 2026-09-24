import assert from "node:assert/strict";
import { NextRequest } from "next/server";

async function main() {
  Object.assign(process.env, {
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://test:test@127.0.0.1:5432/test",
    CRON_SECRET: "x".repeat(64),
    ELORIA_SEO_AUTOPILOT_ENABLED: "false",
  });
  const { prisma } = await import("../src/lib/prisma");
  const runs: Array<{ report: { cursor: { article?: string } } }> = [];
  let oldSnapshotReads = 0;
  let snapshotCreates = 0;
  prisma.product.findMany =
    (async () => []) as unknown as typeof prisma.product.findMany;
  prisma.contentArticle.findMany =
    (async () => []) as unknown as typeof prisma.contentArticle.findMany;
  prisma.contentArticle.groupBy =
    (async () => []) as unknown as typeof prisma.contentArticle.groupBy;
  prisma.$queryRaw = (async (
    _strings: TemplateStringsArray,
    ...values: unknown[]
  ) => [{ holder: values[1] }]) as typeof prisma.$queryRaw;
  prisma.cronLease.updateMany = (async () => ({
    count: 1,
  })) as typeof prisma.cronLease.updateMany;
  prisma.seoAutomationRun.findFirst = (async () =>
    runs.at(-1) ?? null) as unknown as typeof prisma.seoAutomationRun.findFirst;
  prisma.seoAutomationRun.create = (async ({
    data,
  }: {
    data: (typeof runs)[number];
  }) => {
    runs.push(data);
    return data;
  }) as unknown as typeof prisma.seoAutomationRun.create;
  prisma.contentSeoSnapshot.findFirst = (async () => {
    oldSnapshotReads++;
    return {
      issues: [
        { id: "SEO_AUTOPILOT_RUN", cursor: { article: "legacy-cursor" } },
      ],
    };
  }) as unknown as typeof prisma.contentSeoSnapshot.findFirst;
  prisma.contentSeoSnapshot.findUnique = (async () =>
    snapshotCreates
      ? { id: "daily" }
      : null) as unknown as typeof prisma.contentSeoSnapshot.findUnique;
  prisma.contentSeoSnapshot.create = (async () => {
    snapshotCreates++;
    return { id: "daily" };
  }) as unknown as typeof prisma.contentSeoSnapshot.create;
  prisma.contentSeoSnapshot.update = (async () => {
    throw new Error("Content SEO snapshots are append-only");
  }) as typeof prisma.contentSeoSnapshot.update;
  const { GET } = await import("../src/app/api/cron/content-health/route");
  const { latestSeoAutomationReport } =
    await import("../src/lib/seo-automation-report");
  for (let index = 0; index < 2; index++) {
    const response = await GET(
      new NextRequest("https://eloria.test/api/cron/content-health", {
        headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
      }),
    );
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.successful, true);
    assert.equal(result.snapshotCreated, index === 0);
  }
  assert.equal(
    runs.length,
    2,
    "Each invocation must append its own report, including same-day runs",
  );
  assert.equal(snapshotCreates, 1, "Daily history must only be created once");
  assert.equal(
    oldSnapshotReads,
    1,
    "Only bootstrap from historical snapshot before the first new run",
  );
  assert.deepEqual(runs[1].report.cursor, { article: "legacy-cursor" });
  assert.deepEqual(await latestSeoAutomationReport(), runs[1].report);
  await prisma.$disconnect();
  console.log(
    "PASS: repeated cron runs append reports and preserve cursors without updating daily snapshots (mock persistence)",
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
