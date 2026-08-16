import path from "node:path";

import type {
  NextConfig,
} from "next";

import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl =
  createNextIntlPlugin(
    "./src/i18n/request.ts",
  );

const isProduction =
  process.env.NODE_ENV ===
  "production";

function supabaseImageRemotePattern() {
  const configured =
    process.env.SUPABASE_URL?.trim();

  if (!configured) {
    return null;
  }

  try {
    const url =
      new URL(configured);

    if (
      url.protocol !==
      "https:"
    ) {
      return null;
    }

    return {
      protocol:
        "https" as const,
      hostname:
        url.hostname,
      port:
        url.port,
      pathname:
        "/storage/v1/object/public/**",
    };
  } catch {
    return null;
  }
}

const storageImagePattern =
  supabaseImageRemotePattern();

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com${isProduction ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "media-src 'self' blob:",
  "connect-src 'self' https://payment.zarinpal.com https://api.kavenegar.com https://*.supabase.co https://challenges.cloudflare.com",
  "frame-src https://payment.zarinpal.com https://challenges.cloudflare.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://payment.zarinpal.com",
  "frame-ancestors 'none'",
  ...(isProduction
    ? [
        "upgrade-insecure-requests",
      ]
    : []),
].join("; ");

const nextConfig:
  NextConfig = {
  output:
    "standalone",

  deploymentId:
    process.env
      .ELORIA_DEPLOYMENT_ID ||
    process.env.GITHUB_SHA ||
    undefined,

  reactStrictMode:
    true,

  poweredByHeader: false,

  turbopack: {
    root:
      path.resolve(
        process.cwd(),
      ),
  },

  experimental: {
    serverActions: {
      bodySizeLimit:
        "10mb",
    },
  },

  images: {
    qualities: [
      75,
      84,
      88,
      92,
    ],
    ...(storageImagePattern
      ? {
          remotePatterns: [
            storageImagePattern,
          ],
        }
      : {}),
  },

  async headers() {
    return [
      {
        source:
          "/:path*",

        headers: [
          {
            key:
              "Content-Security-Policy",

            value:
              contentSecurityPolicy,
          },
          {
            key:
              "X-Content-Type-Options",

            value:
              "nosniff",
          },
          {
            key:
              "X-Frame-Options",

            value:
              "DENY",
          },
          {
            key:
              "Referrer-Policy",

            value:
              "strict-origin-when-cross-origin",
          },
          {
            key:
              "Permissions-Policy",

            value:
              "camera=(), microphone=(), geolocation=(), payment=(self)",
          },
          {
            key:
              "Cross-Origin-Opener-Policy",

            value:
              "same-origin",
          },
          {
            key:
              "Cross-Origin-Resource-Policy",

            value:
              "same-origin",
          },
          ...(isProduction
            ? [
                {
                  key:
                    "Strict-Transport-Security",

                  value:
                    "max-age=31536000; includeSubDomains",
                },
              ]
            : []),
        ],
      },
    ];
  },
};

export default withNextIntl(
  nextConfig,
);
