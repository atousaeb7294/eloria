import { NextRequest, NextResponse } from "next/server";

import { getCustomerFromRequest } from "@/lib/customer-auth";
import {
  addCustomerProductWatch,
  getCustomerProductWatch,
  isCustomerProductWatchesEnabled,
  removeCustomerProductWatch,
} from "@/lib/customer-product-watches";
import { JsonRequestBodyError, readJsonBody } from "@/lib/security/json-body";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { hasTrustedOrigin, requestIp } from "@/lib/security/request";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

function headers() {
  return { "Cache-Control": "no-store, no-cache, must-revalidate" };
}

function responseDisabled() {
  return NextResponse.json(
    { successful: false, message: "پیگیری هوشمند محصولات فعال نیست." },
    { status: 503, headers: headers() },
  );
}

async function authoriseMutation(request: NextRequest) {
  if (!hasTrustedOrigin(request)) return { response: NextResponse.json({ successful: false }, { status: 403, headers: headers() }) };
  const rate = await consumeRateLimit({
    key: `customer-watches:${requestIp(request)}`,
    limit: 60,
    windowMs: 10 * 60_000,
  });
  if (!rate.allowed) {
    return {
      response: NextResponse.json(
        { successful: false, message: "تعداد درخواست بیش از حد مجاز است." },
        { status: 429, headers: { ...headers(), "Retry-After": String(rate.retryAfterSeconds) } },
      ),
    };
  }
  const auth = await getCustomerFromRequest(request);
  if (!auth) return { response: NextResponse.json({ successful: false }, { status: 401, headers: headers() }) };
  return { auth };
}

export async function GET(request: NextRequest) {
  if (!isCustomerProductWatchesEnabled()) return responseDisabled();
  const auth = await getCustomerFromRequest(request);
  if (!auth) return NextResponse.json({ successful: false }, { status: 401, headers: headers() });

  const slug = request.nextUrl.searchParams.get("slug") ?? "";
  const watch = await getCustomerProductWatch(auth.customer.id, slug);
  return NextResponse.json({ successful: true, watched: Boolean(watch) }, { headers: headers() });
}

export async function POST(request: NextRequest) {
  if (!isCustomerProductWatchesEnabled()) return responseDisabled();
  const allowed = await authoriseMutation(request);
  if ("response" in allowed) return allowed.response;

  let body: { slug?: unknown };
  try {
    body = await readJsonBody(request, 8 * 1024);
  } catch (error) {
    const status = error instanceof JsonRequestBodyError ? error.status : 400;
    return NextResponse.json({ successful: false }, { status, headers: headers() });
  }
  if (typeof body.slug !== "string") return NextResponse.json({ successful: false, message: "محصول معتبر نیست." }, { status: 400, headers: headers() });

  try {
    const watch = await addCustomerProductWatch(allowed.auth.customer.id, body.slug);
    return NextResponse.json({ successful: true, watched: true, watch }, { headers: headers() });
  } catch (error) {
    return NextResponse.json(
      { successful: false, message: error instanceof Error ? error.message : "ثبت پیگیری ناموفق بود." },
      { status: 400, headers: headers() },
    );
  }
}

export async function DELETE(request: NextRequest) {
  if (!isCustomerProductWatchesEnabled()) return responseDisabled();
  const allowed = await authoriseMutation(request);
  if ("response" in allowed) return allowed.response;

  let body: { slug?: unknown };
  try {
    body = await readJsonBody(request, 8 * 1024);
  } catch (error) {
    const status = error instanceof JsonRequestBodyError ? error.status : 400;
    return NextResponse.json({ successful: false }, { status, headers: headers() });
  }
  if (typeof body.slug !== "string") return NextResponse.json({ successful: false, message: "محصول معتبر نیست." }, { status: 400, headers: headers() });

  try {
    await removeCustomerProductWatch(allowed.auth.customer.id, body.slug);
    return NextResponse.json({ successful: true, watched: false }, { headers: headers() });
  } catch (error) {
    return NextResponse.json(
      { successful: false, message: error instanceof Error ? error.message : "حذف پیگیری ناموفق بود." },
      { status: 400, headers: headers() },
    );
  }
}
