import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") || "https://eloria.example";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/fa/admin/",
          "/en/admin/",
          "/fa/checkout",
          "/en/checkout",
          "/fa/order-tracking",
          "/en/order-tracking",
          "/fa/order/",
          "/en/order/",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
