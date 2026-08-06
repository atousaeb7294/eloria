import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/fa",
    name: "ELORIA — دنیای جواهرات اصیل",
    short_name: "ELORIA",
    description: "جواهرات لوکس الوریا با الهام از ایران باستان و روایت‌های شاهنامه‌ای",
    start_url: "/fa",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#010b07",
    theme_color: "#02140e",
    lang: "fa",
    dir: "rtl",
    categories: ["shopping", "lifestyle"],
    icons: [{ src: "/favicon.ico", sizes: "any", type: "image/x-icon" }],
  };
}
