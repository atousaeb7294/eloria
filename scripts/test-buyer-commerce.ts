import assert from "node:assert/strict";
import { createRequire } from "node:module";
import {
  buyerReviewSchema,
  allowedPreorderTransition,
  reviewRisk,
} from "../src/lib/buyer-commerce-policy";
const require = createRequire(import.meta.url);
async function main() {
  Object.assign(process.env, {
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://test:test@127.0.0.1:5432/test",
  });
  assert(
    !buyerReviewSchema.safeParse({ rating: 6, body: "a", displayName: "a" })
      .success,
  );
  assert(
    buyerReviewSchema.safeParse({
      rating: 1,
      body: "تجربهٔ خرید من مطلوب نبود",
      displayName: "خریدار",
    }).success,
  );
  assert(reviewRisk("شماره ۰۹۱۲۱۲۳۴۵۶۷"));
  assert(reviewRisk("https://example.com"));
  assert(!allowedPreorderTransition("RECEIVED", "SHIPPED"));
  assert(!allowedPreorderTransition("CANCELLED", "READY"));
  assert(allowedPreorderTransition("APPROVED", "READY"));
  let admin = false,
    auth: unknown = null,
    created = 0,
    updated = 0,
    audits = 0;
  function mock(path: string, patch: object) {
    const id = require.resolve(path);
    require(path);
    require.cache[id]!.exports = { ...require.cache[id]!.exports, ...patch };
  }
  mock("../src/lib/admin-auth", { hasValidAdminSession: async () => admin });
  mock("../src/lib/customer-auth", {
    getCustomerFromRequest: async () => auth,
  });
  mock("../src/lib/security/request", {
    hasTrustedOrigin: () => true,
    requestIp: () => "127.0.0.1",
  });
  mock("../src/lib/security/rate-limit", {
    consumeRateLimit: async () => ({ allowed: true }),
  });
  require("next/cache").revalidatePath = () => {};
  mock("next/navigation", {
    redirect: (url:string) => {
      throw Error("REDIRECT:"+decodeURIComponent(url));
    },
  });
  const { prisma } = await import("../src/lib/prisma");
  let purchase: unknown = null;
  prisma.product.findFirst = (async () => ({
    id: "product",
  })) as unknown as typeof prisma.product.findFirst;
  prisma.order.findFirst = (async () =>
    purchase) as unknown as typeof prisma.order.findFirst;
  prisma.buyerReview.create = (async () => {
    created++;
    return {};
  }) as unknown as typeof prisma.buyerReview.create;
  const { POST } = await import("../src/app/api/products/[slug]/reviews/route");
  const { NextRequest } = await import("next/server");
  function request() {
    return new NextRequest(
      "https://eloriagallery.ir/api/products/test/reviews",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: 1,
          body: "نظر منفی اما مرتبط با محصول",
          displayName: "خریدار",
        }),
      },
    );
  }
  assert.equal(
    (await POST(request(), { params: Promise.resolve({ slug: "test" }) }))
      .status,
    401,
  );
  auth = { customer: { id: "customer" } };
  assert.equal(
    (await POST(request(), { params: Promise.resolve({ slug: "test" }) }))
      .status,
    403,
  );
  assert.equal(created, 0);
  purchase = { id: "order" };
  assert.equal(
    (await POST(request(), { params: Promise.resolve({ slug: "test" }) }))
      .status,
    201,
  );
  assert.equal(created, 1);
  prisma.buyerReview.create = (async () => {
    throw { code: "P2002" };
  }) as unknown as typeof prisma.buyerReview.create;
  assert.equal(
    (await POST(request(), { params: Promise.resolve({ slug: "test" }) }))
      .status,
    409,
  );
  const { moderateReview, updatePreorder } =
    await import("../src/app/[locale]/admin/(protected)/commerce/actions");
  const form = new FormData();
  form.set("id", "review");
  form.set("status", "APPROVED");
  await assert.rejects(moderateReview("fa", form), /نشست/);
  admin = true;
  form.set("status", "REJECTED");
  await assert.rejects(moderateReview("fa", form), /دلیل/);
  form.set("reason", "اطلاعات خصوصی");
  let conflict = false,
    stock = 0;
  const tx = {
    buyerReview: {
      findUniqueOrThrow: async () => ({
        id: "review",
        status: "PENDING",
        updatedAt: new Date(),
      }),
      updateMany: async () => {
        if (conflict) return { count: 0 };
        updated++;
        return { count: 1 };
      },
    },
    commerceAudit: {
      create: async () => {
        audits++;
      },
    },
    preorderRequest: {
      findUniqueOrThrow: async () => ({
        id: "p",
        status: "APPROVED",
        quantity: 2,
        productId: "product",
        variantId: null,
      }),
      updateMany: async () => {
        updated++;
        return { count: 1 };
      },
    },
    product: { findFirst: async () => ({ stock }) },
  };
  prisma.$transaction = (async (fn: (arg: typeof tx) => Promise<unknown>) =>
    fn(tx)) as unknown as typeof prisma.$transaction;
  await assert.rejects(moderateReview("fa", form), /REDIRECT/);
  assert.equal(updated, 1);
  assert.equal(audits, 1);
  conflict = true;
  await assert.rejects(moderateReview("fa", form), /هم‌زمان/);
  assert.equal(audits, 1);
  const pre = new FormData();
  pre.set("id", "p");
  pre.set("status", "READY");
  pre.set("deliveryNote", "هفتهٔ آینده");
  await assert.rejects(updatePreorder("fa", pre), /موجودی/);
  assert.equal(updated, 1);
  stock = 2;
  await assert.rejects(updatePreorder("fa", pre), /REDIRECT/);
  assert.equal(updated, 2);
  assert.equal(audits, 2);
  await prisma.$disconnect();
  console.log(
    "PASS: purchase/auth gates, duplicate review, moderation authorization, reasons, concurrency, preorder transitions and stock gate (mock persistence)",
  );
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
