import type {
  NextConfig,
} from "next";

import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl =
  createNextIntlPlugin(
    "./src/i18n/request.ts",
  );

const nextConfig:
  NextConfig = {
  reactStrictMode:
    true,

  images: {
    qualities: [
      75,
      88,
      92,
    ],
  },
};

export default withNextIntl(
  nextConfig,
);