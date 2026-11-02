import type {
  MetadataRoute,
} from "next";

import {
  siteBaseUrl,
} from "@/lib/site-url";

export default function robots():
  MetadataRoute.Robots {
  const base =
    siteBaseUrl()
      .toString()
      .replace(/\/$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        // Product and hero media are public and appear in product JSON-LD.
        // Keep transactional APIs blocked while allowing their image URLs.
        allow: ["/", "/api/media/products/", "/api/media/hero/"],
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
    sitemap:
      `${base}/sitemap.xml`,
    host: base,
  };
}
