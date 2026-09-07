import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";

export async function acquireCronLease(input: {
  key: string;
  leaseMs: number;
}): Promise<{ acquired: boolean; holder: string }> {
  const holder = randomUUID();
  const now = new Date();
  const lockedUntil = new Date(now.getTime() + Math.max(input.leaseMs, 5_000));
  const rows = await prisma.$queryRaw<Array<{ holder: string }>>`
    INSERT INTO cron_leases (key, holder, "lockedUntil", "createdAt", "updatedAt")
    VALUES (${input.key}, ${holder}, ${lockedUntil}, NOW(), NOW())
    ON CONFLICT (key) DO UPDATE SET
      holder = EXCLUDED.holder,
      "lockedUntil" = EXCLUDED."lockedUntil",
      "updatedAt" = NOW()
    WHERE cron_leases."lockedUntil" <= ${now}
    RETURNING holder
  `;
  return { acquired: rows[0]?.holder === holder, holder };
}

export async function releaseCronLease(key: string, holder: string): Promise<void> {
  await prisma.cronLease.updateMany({
    where: { key, holder },
    data: { lockedUntil: new Date(0) },
  });
}
