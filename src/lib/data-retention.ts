import { prisma } from "@/lib/prisma";
import { siteMeasurementRetentionDays } from "@/lib/site-measurement";

function envDays(
  name: string,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const parsed = Number.parseInt(
    process.env[name]?.trim() ?? "",
    10,
  );

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(
    Math.max(parsed, minimum),
    maximum,
  );
}

export type DataRetentionResult = {
  checkedAt: string;
  otpChallengesDeleted: number;
  customerSessionsDeleted: number;
  adminSessionsDeleted: number;
  rateLimitBucketsDeleted: number;
  securityAlertsDeleted: number;
  securityEventsDeleted: number;
  measurementEventsDeleted: number;
  supportConversationsDeleted: number;
};

export async function runDataRetention(
  now = new Date(),
): Promise<DataRetentionResult> {
  const day = 24 * 60 * 60 * 1000;

  const otpCutoff = new Date(
    now.getTime() -
      envDays(
        "ELORIA_OTP_RETENTION_DAYS",
        7,
        1,
        90,
      ) *
        day,
  );

  const sessionCutoff =
    new Date(
      now.getTime() -
        envDays(
          "ELORIA_SESSION_RETENTION_DAYS",
          30,
          7,
          365,
        ) *
          day,
    );

  const securityAlertCutoff =
    new Date(
      now.getTime() -
        envDays(
          "ELORIA_SECURITY_ALERT_RETENTION_DAYS",
          90,
          30,
          730,
        ) *
          day,
    );

  const securityEventCutoff =
    new Date(
      now.getTime() -
        envDays(
          "ELORIA_SECURITY_EVENT_RETENTION_DAYS",
          180,
          30,
          1_825,
        ) *
          day,
    );

  const rateCutoff =
    new Date(
      now.getTime() - day,
    );

  const supportConversationCutoff =
    new Date(
      now.getTime() -
        envDays(
          "ELORIA_SUPPORT_CHAT_RETENTION_DAYS",
          365,
          30,
          1_095,
        ) *
          day,
    );

  const measurementCutoff =
    new Date(
      now.getTime() -
        siteMeasurementRetentionDays() *
          day,
    );

  const [
    otp,
    customerSessions,
    adminSessions,
    rateLimitBuckets,
    securityAlerts,
    measurementEvents,
    supportConversations,
  ] = await prisma.$transaction([
    prisma.customerOtpChallenge.deleteMany({
      where: {
        createdAt: {
          lt: otpCutoff,
        },
        OR: [
          {
            consumedAt: {
              not: null,
            },
          },
          {
            expiresAt: {
              lt: now,
            },
          },
        ],
      },
    }),

    prisma.customerSession.deleteMany({
      where: {
        createdAt: {
          lt: sessionCutoff,
        },
        OR: [
          {
            revokedAt: {
              not: null,
            },
          },
          {
            expiresAt: {
              lt: now,
            },
          },
        ],
      },
    }),

    prisma.adminSession.deleteMany({
      where: {
        createdAt: {
          lt: sessionCutoff,
        },
        OR: [
          {
            revokedAt: {
              not: null,
            },
          },
          {
            expiresAt: {
              lt: now,
            },
          },
        ],
      },
    }),

    prisma.rateLimitBucket.deleteMany({
      where: {
        resetAt: {
          lt: rateCutoff,
        },
      },
    }),

    prisma.securityAlert.deleteMany({
      where: {
        createdAt: {
          lt: securityAlertCutoff,
        },
        status: {
          in: [
            "SENT",
            "FAILED",
          ],
        },
      },
    }),

    prisma.siteMeasurementEvent.deleteMany({
      where: {
        occurredAt: {
          lt: measurementCutoff,
        },
      },
    }),

    // Closed support conversations can contain voluntary contact details.
    // Their messages cascade-delete with the conversation after the documented
    // retention period. Open conversations are always retained for a reply.
    prisma.supportConversation.deleteMany({
      where: {
        status: "CLOSED",
        updatedAt: {
          lt: supportConversationCutoff,
        },
      },
    }),
  ]);

  /*
   * Only old security telemetry with no retained delivery outbox is removed.
   * Financial OrderAuditEvent and payment records are intentionally excluded
   * from this retention job.
   */
  const securityEvents =
    await prisma.adminSecurityEvent.deleteMany({
      where: {
        createdAt: {
          lt: securityEventCutoff,
        },
        alerts: {
          none: {},
        },
      },
    });

  return {
    checkedAt:
      now.toISOString(),
    otpChallengesDeleted:
      otp.count,
    customerSessionsDeleted:
      customerSessions.count,
    adminSessionsDeleted:
      adminSessions.count,
    rateLimitBucketsDeleted:
      rateLimitBuckets.count,
    securityAlertsDeleted:
      securityAlerts.count,
    securityEventsDeleted:
      securityEvents.count,
    measurementEventsDeleted:
      measurementEvents.count,
    supportConversationsDeleted:
      supportConversations.count,
  };
}
