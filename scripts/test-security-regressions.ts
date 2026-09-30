/* eslint-disable @typescript-eslint/no-explicit-any -- Isolated VM modules and mutable database doubles have dynamic exports; production code remains strictly typed. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import ts from "typescript";

// Execute the real modules with isolated, strict mocks; never connect to a database,
// SMS provider, or payment gateway. This does not replace PostgreSQL integration tests.
const require = createRequire(import.meta.url);
function load(file: string, dependencies: Record<string, unknown>, env: Record<string, string> = {}) {
  const source = ts.transpileModule(readFileSync(resolve(file), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    fileName: file,
  }).outputText;
  const loadedModule = { exports: {} as Record<string, any> };
  runInNewContext(source, {
    module: loadedModule, exports: loadedModule.exports,
    require: (name: string) => {
      if (Object.hasOwn(dependencies, name)) return dependencies[name];
      if (name.startsWith("node:")) return require(name);
      throw new Error(`Unmocked dependency: ${name}`);
    },
    process: { env: { NODE_ENV: "production", ...env } },
    console: { ...console, error() {} }, Date, Buffer, URL, setTimeout, Error,
  }, { filename: file });
  return loadedModule.exports;
}

async function authTests() {
  let transactions = 0;
  const auth = load("src/lib/customer-auth.ts", {
    "next/headers": {},
    "@/lib/prisma": { prisma: { $transaction: async () => { transactions++; throw new Error("private database details"); } } },
  });
  await assert.rejects(auth.consumeCustomerOtp({ challengeId: "not-a-uuid", mobile: "09123456789", code: "123456" }), auth.CustomerAuthError);
  assert.equal(transactions, 0, "malformed UUID rejected before any database access");

  let consumeCalls = 0;
  const response = { json: (body: unknown, options: { status?: number } = {}) => ({ body, status: options.status ?? 200 }) };
  let body: Record<string, unknown> = {};
  let customer: { id: string; isActive: boolean; passwordHash: string | null } | null = null;
  let smsFails = false;
  let challenges = 0;
  const dependencies = {
    "next/server": { NextResponse: response },
    "@/lib/customer-auth": {
      ...auth,
      consumeCustomerOtp: async () => { consumeCalls++; throw new Error("Prisma raw SQL: private credentials"); },
      createCustomerOtpChallenge: async () => { challenges++; return { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", expiresAt: new Date(Date.now() + 300_000), code: "123456" }; },
    },
    "@/lib/runtime-features": { isCustomerAuthEnabled: () => true },
    "@/lib/security/json-body": { readJsonBody: async () => body, JsonRequestBodyError: class extends Error {} },
    "@/lib/security/rate-limit": { consumeRateLimit: async () => ({ allowed: true }) },
    "@/lib/security/request": { hasTrustedOrigin: () => true, requestIp: () => "127.0.0.1" },
    "@/lib/security/security-events": { recordSecurityEvent: async () => {} },
    "@/lib/customer-password": { CustomerPasswordError: class extends Error {}, normalizeCustomerPassword: (v: string) => v },
    "@/lib/customer-data": { CustomerDataError: class extends Error {}, normalizeCustomerName: () => "Test" },
    "@/lib/prisma": { prisma: { customer: { findUnique: async () => customer }, customerOtpChallenge: { deleteMany: async () => ({ count: 1 }) } } },
    "@/lib/customer-auth-channels": { isCustomerOtpChannelEnabled: () => true },
    "@/lib/notifications/sms-ir": { sendVerificationSms: async () => ({ configured: true, successful: !smsFails }) },
    "@/lib/security/turnstile": { verifyTurnstileToken: async () => ({ successful: true }) },
  };
  const request = { headers: new Headers() };
  const login = load("src/app/api/customer/auth/verify-otp/route.ts", dependencies);
  body = { challengeId: "bad", mobile: "09123456789", code: "123456" };
  assert.equal((await login.POST(request)).status, 400);
  assert.equal(consumeCalls, 0);
  body.challengeId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  assert.doesNotMatch(JSON.stringify((await login.POST(request)).body), /Prisma|private|SQL/);
  const password = load("src/app/api/customer/auth/verify-password-otp/route.ts", dependencies);
  body = { ...body, purpose: "PASSWORD_RESET", password: "SafePassword123!", confirmPassword: "SafePassword123!" };
  assert.doesNotMatch(JSON.stringify((await password.POST(request)).body), /Prisma|private|SQL/);

  const recovery = load("src/app/api/customer/auth/request-password-otp/route.ts", dependencies);
  body = { purpose: "PASSWORD_RESET", mobile: "09123456789" };
  const absent = await recovery.POST(request);
  assert.equal(challenges, 0, "decoy not persisted");
  customer = { id: "customer", isActive: false, passwordHash: null };
  const inactive = await recovery.POST(request);
  assert.equal(challenges, 0);
  customer.isActive = true;
  const active = await recovery.POST(request);
  smsFails = true;
  const failedDelivery = await recovery.POST(request);
  for (const result of [absent, inactive, active, failedDelivery]) {
    assert.equal(result.status, 200);
    assert.equal(result.body.successful, true);
    assert.equal(result.body.purpose, "PASSWORD_RESET");
    assert.ok(auth.isCustomerChallengeId(result.body.challengeId));
    assert.ok(Number.isFinite(Date.parse(result.body.expiresAt)));
    assert.deepEqual(Object.keys(result.body), Object.keys(active.body));
    assert.equal(result.body.message, active.body.message);
  }
  assert.notEqual(absent.body.challengeId, inactive.body.challengeId);
  console.log("PASS OTP malformed IDs, private errors, and recovery response-shape regressions");
}

function paymentFixture(options: { attemptStatus?: string; orderStatus?: string; afterSnapshot?: (s: any) => void; failFinalization?: boolean } = {}) {
  const state = {
    order: { id: "order", orderNumber: "E-1", status: options.orderStatus ?? "PENDING_PAYMENT", paidAt: options.orderStatus === "PAID" ? new Date() : null, inventoryReleasedAt: null, cancelledAt: null, inventoryCommittedAt: null, payableToman: 100_000n, customerId: null, customerMobile: null },
    attempt: { id: "attempt", status: options.attemptStatus ?? "REDIRECTED", gatewayReference: null, verificationLeaseExpiresAt: null as Date | null, activeKey: "ZIBAL:order" },
    audits: [] as any[], providerCalls: 0, finalizationFailures: 0,
  };
  const matches = (where: any) => {
    if (where.status) {
      if (typeof where.status === "string" && state.attempt.status !== where.status) return false;
      if (where.status.in && !where.status.in.includes(state.attempt.status)) return false;
    }
    if (where.OR && state.attempt.verificationLeaseExpiresAt && !(state.attempt.verificationLeaseExpiresAt < where.OR[1].verificationLeaseExpiresAt.lt)) return false;
    if (where.verificationLeaseExpiresAt && state.attempt.verificationLeaseExpiresAt?.getTime() !== where.verificationLeaseExpiresAt.getTime()) return false;
    return true;
  };
  const tx = {
    $queryRaw: async () => {
      if (options.failFinalization && state.finalizationFailures++ < 3) throw new Error("Simulated serialization failure");
      return [];
    },
    paymentAttempt: {
      findUnique: async () => ({ ...state.attempt }),
      update: async ({ data }: any) => Object.assign(state.attempt, data),
      updateMany: async ({ where, data }: any) => {
        if (!matches(where)) return { count: 0 };
        Object.assign(state.attempt, data); return { count: 1 };
      },
    },
    order: {
      findUnique: async () => ({ ...state.order }),
      update: async ({ data }: any) => Object.assign(state.order, data),
      updateMany: async ({ where, data }: any) => {
        if (where.paidAt === null && state.order.paidAt) return { count: 0 };
        if (where.status?.in && !where.status.in.includes(state.order.status)) return { count: 0 };
        Object.assign(state.order, data); return { count: 1 };
      },
    },
    orderAuditEvent: { create: async ({ data }: any) => { state.audits.push(data); return data; } },
  };
  const prisma = {
    ...tx,
    order: { ...tx.order, findUnique: async () => {
      const snapshot = { ...state.order, payments: [{ ...state.attempt }] };
      options.afterSnapshot?.(state);
      return snapshot;
    } },
    $transaction: async (callback: (client: typeof tx) => unknown) => callback(tx),
  };
  let provider: () => Promise<unknown> = async () => ({ code: 100, referenceId: "123456", message: "verified" });
  class ZibalError extends Error { constructor(message: string, readonly code?: number) { super(message); } }
  const service = load("src/lib/payment-service.ts", {
    "@/lib/site-url": {},
    "@/generated/prisma/client": { Prisma: { TransactionIsolationLevel: { Serializable: "Serializable" } } },
    "@/lib/notifications/sms-ir": { sendSms: async () => { throw new Error("SMS must not be sent by fixture"); } },
    "@/lib/payment/zibal": { ZibalError, verifyZibalPayment: async () => { state.providerCalls++; return provider(); } },
    "@/lib/prisma": { prisma },
    "@/lib/security/security-events": { recordSecurityEvent: async () => {} },
  });
  return { state, ZibalError, provider: (fn: () => Promise<unknown>) => { provider = fn; }, verify: (gatewayStatus = "OK") => service.verifyOrderPayment({ orderId: "order", authority: "1000", gatewayStatus }) };
}

async function paymentTests() {
  for (const status of ["PAID", "REQUIRES_REVIEW", "PENDING_VERIFICATION"]) {
    const f = paymentFixture({ afterSnapshot: s => { s.attempt.status = status; } });
    if (status === "PENDING_VERIFICATION") await assert.rejects(f.verify("NOK"), /پردازش/);
    else assert.equal((await f.verify("NOK")).successful, true);
    assert.equal(f.state.attempt.status, status, "stale cancellation preserves latest status");
    assert.equal(f.state.order.status, "PENDING_PAYMENT");
    assert.equal(f.state.audits.length, 0);
    assert.equal(f.state.providerCalls, 0);
  }
  const cancelled = paymentFixture();
  assert.equal((await cancelled.verify("NOK")).successful, false);
  assert.equal(cancelled.state.attempt.status, "CANCELLED");
  assert.equal(cancelled.state.order.status, "PAYMENT_FAILED");
  assert.equal((await cancelled.verify()).successful, true);
  assert.equal(cancelled.state.attempt.status, "PAID");
  assert.equal(cancelled.state.order.status, "PAID");
  await cancelled.verify();
  assert.equal(cancelled.state.providerCalls, 1, "paid replay never verifies twice");

  const failed = paymentFixture({ attemptStatus: "FAILED" });
  assert.equal((await failed.verify()).successful, true);
  const timeout = paymentFixture();
  timeout.provider(async () => { throw new Error("network unavailable"); });
  await assert.rejects(timeout.verify());
  assert.equal(timeout.state.attempt.status, "REDIRECTED");
  assert.equal(timeout.state.order.status, "PENDING_PAYMENT");
  const staleWorker = paymentFixture();
  const newerLease = new Date(Date.now() + 1_200_000);
  staleWorker.provider(async () => {
    staleWorker.state.attempt.verificationLeaseExpiresAt = newerLease;
    throw new Error("late failure from expired lease");
  });
  await assert.rejects(staleWorker.verify());
  assert.equal(staleWorker.state.attempt.status, "PENDING_VERIFICATION");
  assert.equal(staleWorker.state.attempt.verificationLeaseExpiresAt, newerLease);

  for (const failFinalization of [false, true]) {
    const duplicate = paymentFixture({ orderStatus: "PAID", failFinalization });
    const result = await duplicate.verify();
    assert.equal(result.requiresReview, true, "another attempt's paid order cannot authorize duplicate fulfilment");
    assert.equal(duplicate.state.attempt.status, "REQUIRES_REVIEW");
    assert.equal(duplicate.state.order.status, "PAID");
  }
  const missingReference = paymentFixture();
  missingReference.provider(async () => { throw new missingReference.ZibalError("provider success with invalid reference", 100); });
  assert.equal((await missingReference.verify()).requiresReview, true);
  assert.equal(missingReference.state.attempt.status, "REQUIRES_REVIEW");
  assert.equal(missingReference.state.order.status, "PAYMENT_REVIEW");
  console.log("PASS payment stale cancellation, delayed success, lease ownership, retries, replay, duplicate payment fallback, protocol review");
}

async function cancellationTests() {
  const operations = load("src/lib/customer-order-operations.ts", {
    "@/generated/prisma/client": {},
    "@/lib/inventory": {},
    "@/lib/prisma": {},
  });
  let failure: Error = new Error("private SQL database connection details");
  const route = load("src/app/api/customer/orders/[id]/cancel/route.ts", {
    "next/server": { NextResponse: { json: (body: unknown, options: { status: number }) => ({ body, status: options.status }) } },
    "@/lib/customer-auth": { getCustomerFromRequest: async () => ({ customer: { id: "customer" } }) },
    "@/lib/security/request": { hasTrustedOrigin: () => true },
    "@/lib/customer-order-operations": { ...operations, cancelCustomerOrder: async () => { throw failure; } },
  });
  const context = { params: Promise.resolve({ id: "order" }) };
  const unexpected = await route.POST({}, context);
  assert.equal(unexpected.status, 500);
  assert.doesNotMatch(JSON.stringify(unexpected.body), /private|SQL|database/);
  failure = new operations.CustomerOrderError("سفارش پیدا نشد.");
  const expected = await route.POST({}, context);
  assert.equal(expected.status, 409);
  assert.equal(expected.body.message, failure.message);
  console.log("PASS cancellation hides infrastructure errors and preserves safe business errors");
}

async function main() { await authTests(); await paymentTests(); await cancellationTests(); }
main().catch(error => { console.error(error); process.exitCode = 1; });
