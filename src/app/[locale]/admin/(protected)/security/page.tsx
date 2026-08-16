import {
  BadgeAlert,
  BellRing,
  CreditCard,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";

import { formatAdminDate } from "@/lib/admin-format";
import { prisma } from "@/lib/prisma";
import {
  normalizeSecuritySeverity,
  type SecurityScope,
  type SecuritySeverity,
} from "@/lib/security/security-event-policy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PayloadShape = {
  severity?: unknown;
  scope?: unknown;
  subjectHash?: unknown;
  details?: unknown;
};

function objectOf(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function payloadOf(value: unknown): PayloadShape {
  return objectOf(value) as PayloadShape;
}

function severityOf(payload: PayloadShape, successful: boolean): SecuritySeverity {
  return normalizeSecuritySeverity(
    typeof payload.severity === "string" ? payload.severity : null,
    successful ? "INFO" : "MEDIUM",
  );
}

function scopeOf(payload: PayloadShape, eventType: string): SecurityScope {
  if (
    payload.scope === "ADMIN_AUTH" ||
    payload.scope === "CUSTOMER_AUTH" ||
    payload.scope === "PAYMENT" ||
    payload.scope === "SYSTEM"
  ) {
    return payload.scope;
  }
  if (eventType.startsWith("LOGIN_")) return "ADMIN_AUTH";
  return "SYSTEM";
}

function detailOf(payload: PayloadShape, key: string): string | null {
  const details = objectOf(payload.details);
  const value = details[key];
  if (typeof value === "string" && value.trim()) return value.slice(0, 100);
  return null;
}

function severityClass(severity: SecuritySeverity): string {
  if (severity === "CRITICAL") return "border-red-400/25 bg-red-950/25 text-red-100";
  if (severity === "HIGH") return "border-orange-300/20 bg-orange-950/20 text-orange-100";
  if (severity === "MEDIUM") return "border-amber-300/20 bg-amber-950/15 text-amber-100";
  return "border-emerald-300/15 bg-emerald-950/15 text-emerald-100";
}

function deliveryClass(status: string): string {
  if (status === "SENT") return "border-emerald-300/15 bg-emerald-950/15 text-emerald-100";
  if (status === "FAILED") return "border-red-400/20 bg-red-950/20 text-red-100";
  if (status === "PROCESSING") return "border-sky-300/15 bg-sky-950/15 text-sky-100";
  return "border-amber-300/15 bg-amber-950/15 text-amber-100";
}

function eventLabel(eventType: string): string {
  const labels: Record<string, string> = {
    LOGIN_RATE_LIMITED: "قفل موقت ورود مدیر",
    LOGIN_FAILED: "ورود ناموفق مدیر",
    LOGIN_SUCCEEDED: "ورود موفق مدیر",
    CUSTOMER_AUTH_ORIGIN_REJECTED: "مبدأ نامعتبر ورود مشتری",
    CUSTOMER_OTP_IP_RATE_LIMITED: "محدودسازی OTP بر اساس IP",
    CUSTOMER_OTP_MOBILE_RATE_LIMITED: "محدودسازی OTP برای شماره",
    CUSTOMER_TURNSTILE_FAILED: "شکست Turnstile مشتری",
    CUSTOMER_OTP_DELIVERY_FAILED: "شکست ارسال OTP",
    CUSTOMER_OTP_REQUEST_ERROR: "خطای زیرساخت درخواست OTP",
    CUSTOMER_OTP_VERIFY_RATE_LIMITED: "محدودسازی تلاش تأیید OTP",
    CUSTOMER_OTP_VERIFY_FAILED: "کد OTP ناموفق",
    CUSTOMER_INACTIVE_ACCOUNT_LOGIN_BLOCKED: "ورود حساب غیرفعال مسدود شد",
    CUSTOMER_LOGIN_SUCCEEDED: "ورود موفق مشتری",
    PAYMENT_INITIALIZATION_FAILED: "خطای ساخت پرداخت",
    PAYMENT_STALE_CALLBACK_IGNORED: "Callback قدیمی/تکراری نادیده گرفته شد",
    PAYMENT_VERIFICATION_RETRY_REQUIRED: "Verify درگاه نیازمند تکرار",
    PAYMENT_REQUIRES_REVIEW: "پرداخت نیازمند بررسی فوری",
  };
  return labels[eventType] ?? eventType;
}

function channelStatus(): { sms: boolean; webhook: boolean } {
  const mobile = process.env.ELORIA_SECURITY_ALERT_MOBILE?.trim() ?? "";
  const apiKey = process.env.KAVENEGAR_API_KEY?.trim() ?? "";
  let webhook = false;
  try {
    webhook =
      new URL(process.env.ELORIA_SECURITY_ALERT_WEBHOOK_URL?.trim() ?? "")
        .protocol === "https:";
  } catch {
    webhook = false;
  }
  return {
    sms: /^09\d{9}$/.test(mobile) && apiKey.length >= 16,
    webhook,
  };
}

export default async function AdminSecurityPage() {
  const windowRows = await prisma.$queryRaw<Array<{ since: Date }>>`
    SELECT NOW() - INTERVAL '24 hours' AS "since"
  `;
  const since = windowRows[0]?.since;

  if (!since) {
    throw new Error("SECURITY_ALERT_WINDOW_START_UNAVAILABLE");
  }

  const [events, deliveryCounts] = await Promise.all([
    prisma.adminSecurityEvent.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 1000,
      include: {
        alerts: {
          select: {
            id: true,
            channel: true,
            status: true,
            attempts: true,
            lastError: true,
            sentAt: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prisma.securityAlert.groupBy({
      by: ["status"],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
    }),
  ]);

  const normalized = events.map(event => {
    const payload = payloadOf(event.payload);
    return {
      ...event,
      payload,
      severity: severityOf(payload, event.successful),
      scope: scopeOf(payload, event.eventType),
    };
  });

  const visible = normalized.slice(0, 120);
  const critical = normalized.filter(event => event.severity === "CRITICAL").length;
  const high = normalized.filter(event => event.severity === "HIGH").length;
  const customerAuth = normalized.filter(event => event.scope === "CUSTOMER_AUTH").length;
  const payment = normalized.filter(event => event.scope === "PAYMENT").length;
  const channels = channelStatus();
  const deliveryMap = new Map(
    deliveryCounts.map(item => [item.status, item._count._all]),
  );
  const pendingDeliveries =
    (deliveryMap.get("PENDING") ?? 0) + (deliveryMap.get("PROCESSING") ?? 0);
  const failedDeliveries = deliveryMap.get("FAILED") ?? 0;

  const stats = [
    { label: "بحرانی ۲۴ ساعت", value: critical, icon: BadgeAlert },
    { label: "High در ۲۴ ساعت", value: high, icon: ShieldAlert },
    { label: "احراز هویت مشتری", value: customerAuth, icon: KeyRound },
    { label: "رخداد پرداخت", value: payment, icon: CreditCard },
  ];

  return (
    <div className="space-y-7">
      <header>
        <p className="text-xs tracking-[0.22em] text-[#b99e4f]">SECURITY OPERATIONS</p>
        <h1 className="mt-2 text-2xl font-semibold text-[#f7e4b6] sm:text-3xl">
          امنیت و هشدارها
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-[#a99c82]">
          رخدادهای امنیتی ورود مدیر، ورود مشتری و وضعیت‌های غیرعادی پرداخت.
          OTP، رمز، توکن نشست، موبایل، ایمیل، آدرس و اطلاعات کارت در payload
          هشدار ذخیره یا به کانال خارجی ارسال نمی‌شوند.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <article
            key={label}
            className="rounded-[22px] border border-[#d0b359]/15 bg-[#041d15]/82 p-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#a99c82]">{label}</p>
                <p className="mt-3 text-3xl font-semibold text-[#f5e4bb]">
                  {new Intl.NumberFormat("fa-IR").format(value)}
                </p>
              </div>
              <Icon className="h-6 w-6 text-[#d7bb67]" />
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-[22px] border border-[#d0b359]/15 bg-[#041d15]/82 p-5 lg:col-span-2">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-emerald-200" />
            <h2 className="font-semibold text-[#efd782]">کانال و صف هشدار</h2>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-4 text-sm">
            <div className="rounded-xl border border-white/8 bg-white/3 p-3">
              <p className="text-[#9f9279]">SMS مدیر</p>
              <p className="mt-1 text-[#f2dfad]">{channels.sms ? "فعال" : "غیرفعال"}</p>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/3 p-3">
              <p className="text-[#9f9279]">Webhook HTTPS</p>
              <p className="mt-1 text-[#f2dfad]">{channels.webhook ? "فعال" : "غیرفعال"}</p>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/3 p-3">
              <p className="text-[#9f9279]">در صف</p>
              <p className="mt-1 text-[#f2dfad]">{new Intl.NumberFormat("fa-IR").format(pendingDeliveries)}</p>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/3 p-3">
              <p className="text-[#9f9279]">تحویل ناموفق</p>
              <p className="mt-1 text-[#f2dfad]">{new Intl.NumberFormat("fa-IR").format(failedDeliveries)}</p>
            </div>
          </div>
        </article>

        <article className="rounded-[22px] border border-[#d0b359]/15 bg-[#041d15]/82 p-5">
          <div className="flex items-center gap-3">
            <BellRing className="h-5 w-5 text-sky-200" />
            <h2 className="font-semibold text-[#efd782]">Delivery Outbox</h2>
          </div>
          <p className="mt-4 text-sm leading-7 text-[#a99c82]">
            درخواست مشتری و callback پرداخت منتظر SMS/Webhook نمی‌مانند.
            هشدار در دیتابیس صف می‌شود و Cron با retry و backoff آن را تحویل می‌دهد.
          </p>
        </article>
      </section>

      <section className="overflow-hidden rounded-[24px] border border-[#d0b359]/15 bg-[#041d15]/82">
        <header className="border-b border-[#d0b359]/12 px-5 py-4">
          <h2 className="font-semibold text-[#efd782]">آخرین رخدادهای امنیتی</h2>
          <p className="mt-1 text-xs text-[#8f846d]">
            حداکثر ۱۲۰ رخداد از ۲۴ ساعت اخیر نمایش داده می‌شود.
          </p>
        </header>

        {visible.length ? (
          <div className="divide-y divide-white/6">
            {visible.map(event => {
              const orderNumber = detailOf(event.payload, "orderNumber");
              const reason = detailOf(event.payload, "reason");
              const subjectHash =
                typeof event.payload.subjectHash === "string"
                  ? event.payload.subjectHash.slice(0, 12)
                  : null;

              return (
                <article key={event.id} className="grid gap-3 px-5 py-4 lg:grid-cols-[170px_1fr_230px]">
                  <div>
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${severityClass(event.severity)}`}
                    >
                      {event.severity}
                    </span>
                    <p className="mt-2 text-xs text-[#8f846d]">
                      {formatAdminDate(event.createdAt)}
                    </p>
                  </div>

                  <div>
                    <p className="font-medium text-[#f3dfaa]">
                      {eventLabel(event.eventType)}
                    </p>
                    <p className="mt-1 text-xs text-[#8f846d]">{event.eventType}</p>
                    {(orderNumber || reason) && (
                      <p className="mt-2 text-sm text-[#b9aa8c]">
                        {orderNumber ? `سفارش: ${orderNumber}` : ""}
                        {orderNumber && reason ? " • " : ""}
                        {reason ? `علت: ${reason}` : ""}
                      </p>
                    )}
                    {event.alerts.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {event.alerts.map(alert => (
                          <span
                            key={alert.id}
                            className={`rounded-full border px-2 py-1 text-[10px] ${deliveryClass(alert.status)}`}
                            title={alert.lastError ?? undefined}
                          >
                            {alert.channel} · {alert.status} · {alert.attempts}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="text-xs leading-6 text-[#8f846d]">
                    <p>Scope: {event.scope}</p>
                    <p>IP: {event.ipHash ? `${event.ipHash.slice(0, 12)}…` : "—"}</p>
                    <p>Subject: {subjectHash ? `${subjectHash}…` : "—"}</p>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="px-5 py-12 text-center text-sm text-[#9f9279]">
            در ۲۴ ساعت اخیر رخداد امنیتی ثبت نشده است.
          </div>
        )}
      </section>
    </div>
  );
}
