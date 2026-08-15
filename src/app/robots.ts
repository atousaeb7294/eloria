import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  const base =
    configured ||
    (process.env.NODE_ENV === "production"
      ? "https://eloria.invalid"
      : "http://localhost:3000");

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/fa/admin/",
          "/en/admin/",
          "/fa/cart",
          "/en/cart",
          "/fa/checkout",
          "/en/checkout",
          "/fa/profile",
          "/en/profile",
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
