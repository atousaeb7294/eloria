import { NextResponse, type NextRequest } from "next/server";

const isProduction = process.env.NODE_ENV === "production";

function contentSecurityPolicy(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://challenges.cloudflare.com${isProduction ? "" : " 'unsafe-eval'"}`,
    // Next applies the nonce to framework style tags. Inline style attributes
    // remain limited to presentation only; this is required by next/image and
    // the existing motion layout, while script execution stays strict.
    `style-src 'self' 'nonce-${nonce}'`,
    "style-src-attr 'unsafe-inline'",
    "script-src-attr 'none'",
    "img-src 'self' data: blob: https://trustseal.enamad.ir https://*.supabase.co",
    "font-src 'self' data:",
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "connect-src 'self' https://gateway.zibal.ir https://api.sms.ir https://*.supabase.co https://challenges.cloudflare.com",
    "frame-src https://gateway.zibal.ir https://challenges.cloudflare.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://gateway.zibal.ir",
    "frame-ancestors 'none'",
    ...(isProduction ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

/**
 * Next.js 16's nonce-aware Proxy. A fresh nonce is generated for every HTML
 * request and passed to the renderer, replacing script-src unsafe-inline.
 */
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const policy = contentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", policy);

  // The public domain itself must render a real page for eNamad verification;
  // internally it is the Persian storefront without changing the visitor URL.
  const response =
    request.nextUrl.pathname === "/"
      ? NextResponse.rewrite(new URL("/fa", request.url), {
          request: { headers: requestHeaders },
        })
      : NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", policy);
  return response;
}

export const config = {
  matcher: [
    {
      source:
        "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|webp|svg|ico|mp4|woff2?|txt)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};

