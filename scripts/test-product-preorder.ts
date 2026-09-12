import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { isPreorderAvailable, normalizePreorder } from "../src/lib/product-preorder";

async function main() {
  Object.assign(process.env, { NODE_ENV: "test", DATABASE_URL: "postgresql://test:test@127.0.0.1:5432/test", NEXT_PUBLIC_SITE_URL: "http://localhost:3000", ELORIA_SUPPORT_TURNSTILE_REQUIRED: "false" });
  const { prisma } = await import("../src/lib/prisma");
  const { POST } = await import("../src/app/api/products/[slug]/preorder/route");
  const product = { id: randomUUID(), slug: "test-ring", nameFa: "انگشتر آزمایشی", status: "ACTIVE", stock: 0, collection: { isActive: true }, variants: [{ id: randomUUID(), titleFa: "مدل اول", stock: 0, isActive: true }] };
  assert.ok(isPreorderAvailable(product));
  assert.equal(isPreorderAvailable({ ...product, stock: 1 }), false);
  assert.equal(isPreorderAvailable({ ...product, status: "DRAFT" }), false);
  assert.equal(isPreorderAvailable({ ...product, collection: { isActive: false } }), false);
  assert.equal(isPreorderAvailable(product, { stock: 1, isActive: true }), false);
  assert.equal(isPreorderAvailable(product, { stock: 0, isActive: false }), false);
  const input = { requestId: randomUUID(), name: "آرش آزمایشی", phone: "۰۹۱۲۱۲۳۴۵۶۷", quantity: 2, locale: "fa", notes: "اندازه ۱۸" };
  assert.equal(normalizePreorder(input).phone, "09121234567");
  assert.throws(() => normalizePreorder({ ...input, quantity: 0 }));
  assert.throws(() => normalizePreorder({ ...input, quantity: 21 }));
  assert.throws(() => normalizePreorder({ ...input, phone: "invalid-phone" }));
  const findProduct = prisma.product.findFirst, findMessage = prisma.supportMessage.findUnique, createConversation = prisma.supportConversation.create;
  const messages = new Map<string, { body: string }>(); let creates = 0; let fail = false;
  prisma.product.findFirst = (async (args: unknown) => { assert.ok(JSON.stringify(args).includes('"OUT_OF_STOCK"')); return product; }) as unknown as typeof findProduct;
  prisma.supportMessage.findUnique = (async (args: { where: { id: string } }) => messages.get(args.where.id) ?? null) as unknown as typeof findMessage;
  prisma.supportConversation.create = (async (args: { data: { messages: { create: { id: string; body: string } }; visitorPhone: string } }) => {
    if (fail) throw new Error("simulated persistence failure");
    const msg = args.data.messages.create;
    if (messages.has(msg.id)) throw Object.assign(new Error("duplicate"), { code: "P2002" });
    messages.set(msg.id, { body: msg.body }); creates++;
    assert.equal(args.data.visitorPhone, "09121234567"); return { id: randomUUID() };
  }) as unknown as typeof createConversation;
  async function post(body: unknown, origin = "http://localhost:3000") {
    globalThis.__eloriaRateLimitFallback?.clear();
    return POST(new NextRequest("http://localhost:3000/api/products/test-ring/preorder", { method: "POST", headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify(body) }), { params: Promise.resolve({ slug: "test-ring" }) });
  }
  try {
    assert.equal((await post(input, "https://evil.example")).status, 403);
    assert.equal((await post({ ...input, quantity: 0 })).status, 400);
    assert.equal((await post({ ...input, variantId: randomUUID() })).status, 400);
    const results = await Promise.all([post(input), post(input)]);
    assert.ok(results.every(r => r.status === 200 || r.status === 201));
    assert.equal(creates, 1, "Concurrent submissions must persist only one request");
    assert.equal((await post(input)).status, 200);
    assert.equal((await post({ ...input, quantity: 3 })).status, 409);
    product.stock = 2;
    assert.equal((await post({ ...input, requestId: randomUUID() })).status, 409);
    product.stock = 0; fail = true;
    assert.equal((await post({ ...input, requestId: randomUUID() })).status, 503);
    assert.equal(creates, 1);
    assert.equal(product.stock, 0, "Preorders must not alter inventory");
    console.log("PASS: preorder validation, origin protection, sold-out eligibility, variant checks, atomic retry deduplication, persistence failures, and unchanged stock.");
  } finally { prisma.product.findFirst = findProduct; prisma.supportMessage.findUnique = findMessage; prisma.supportConversation.create = createConversation; await prisma.$disconnect(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
