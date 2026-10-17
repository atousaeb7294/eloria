import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/fa",
    name: "ELORIA — دنیای جواهرات اصیل",
    short_name: "ELORIA",
    description:
      "جواهرات لوکس الوریا با الهام از ایران باستان و روایت‌های شاهنامه‌ای",
    start_url: "/fa",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#06091e",
    theme_color: "#081334",
    lang: "fa",
    dir: "rtl",
    categories: ["shopping", "lifestyle"],
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
      {
        src: "/icons/eloria-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/eloria-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/eloria-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
