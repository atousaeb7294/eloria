import path from "node:path";

import type { NextConfig } from "next";

import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const isProduction = process.env.NODE_ENV === "production";

type RemotePattern = {
  protocol: "https";
  hostname: string;
  port?: string;
  pathname: string;
};

function httpsHostname(raw: string | undefined): string | null {
  const value = raw?.trim();

  if (!value) return null;

  try {
    const url = new URL(value.includes("://") ? value : `https://${value}`);

    return url.protocol === "https:" ? url.hostname : null;
  } catch {
    return null;
  }
}

function productImageConfiguration(): {
  remotePatterns: RemotePattern[];
  cspSources: string[];
} {
  const patterns: RemotePattern[] = [];
  const sources = new Set<string>();

  const supabase = process.env.SUPABASE_URL?.trim();

  if (supabase) {
    try {
      const url = new URL(supabase);

      if (url.protocol === "https:") {
        patterns.push({
          protocol: "https",
          hostname: url.hostname,
          port: url.port || undefined,
          pathname: "/storage/v1/object/public/**",
        });

        sources.add(`https://${url.hostname}`);
      }
    } catch {
      // Production env validation reports invalid configuration.
    }
  }

  for (const raw of (process.env.ELORIA_ALLOWED_IMAGE_HOSTS ?? "").split(",")) {
    const hostname = httpsHostname(raw);

    if (!hostname || sources.has(`https://${hostname}`)) {
      continue;
    }

    patterns.push({
      protocol: "https",
      hostname,
      pathname: "/**",
    });

    sources.add(`https://${hostname}`);
  }

  return {
    remotePatterns: patterns,
    cspSources: Array.from(sources),
  };
}

const imageConfig = productImageConfiguration();

const serverActionOrigins = Array.from(
  new Set(
    [
      process.env.NEXT_PUBLIC_SITE_URL,
      ...(process.env.ELORIA_ALLOWED_ORIGINS ?? "").split(","),
    ]
      .map((value) => httpsHostname(value))
      .filter((value): value is string => Boolean(value)),
  ),
);

const imageSourceDirective = isProduction
  ? [
      "'self'",
      "data:",
      "blob:",
      "https://trustseal.enamad.ir",
      ...imageConfig.cspSources,
    ].join(" ")
  : "'self' data: blob: https:";

/*
 * Public files and API responses do not need inline execution. HTML requests
 * receive a stricter, nonce-based policy from src/proxy.ts.
 */
const staticContentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' https://challenges.cloudflare.com${isProduction ? "" : " 'unsafe-eval'"}`,
  "style-src 'self'",
  "style-src-attr 'unsafe-inline'",
  "script-src-attr 'none'",
  `img-src ${imageSourceDirective}`,
  "font-src 'self' data:",
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "connect-src 'self' https://payment.zarinpal.com https://api.sms.ir https://*.supabase.co https://challenges.cloudflare.com",
  "frame-src https://payment.zarinpal.com https://challenges.cloudflare.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://payment.zarinpal.com",
  "frame-ancestors 'none'",
  ...(isProduction ? ["upgrade-insecure-requests"] : []),
].join("; ");

const nextConfig: NextConfig = {
  output: "standalone",

  deploymentId:
    process.env.ELORIA_DEPLOYMENT_ID || process.env.GITHUB_SHA || undefined,

  reactStrictMode: true,
  poweredByHeader: false,

  turbopack: {
    root: path.resolve(process.cwd()),
  },

  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
      ...(serverActionOrigins.length
        ? { allowedOrigins: serverActionOrigins }
        : {}),
    },
  },

  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400,
    qualities: [75, 84, 88, 92],
    ...(imageConfig.remotePatterns.length
      ? {
          remotePatterns: imageConfig.remotePatterns,
        }
      : {}),
  },

  async headers() {
    return [
      {
        source: "/videos/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/images/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/fonts/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: staticContentSecurityPolicy,
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(self)",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Resource-Policy",
            value: "same-origin",
          },
          {
            key: "Origin-Agent-Cluster",
            value: "?1",
          },
          {
            key: "X-Permitted-Cross-Domain-Policies",
            value: "none",
          },
          ...(isProduction
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=31536000; includeSubDomains",
                },
              ]
            : []),
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
