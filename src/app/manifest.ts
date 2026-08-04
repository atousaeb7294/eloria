import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ELORIA",
    short_name: "ELORIA",
    description: "ELORIA luxury jewelry — روایت جواهرات الوریا",
    start_url: "/fa",
    display: "standalone",
    background_color: "#01110c",
    theme_color: "#01110c",
    lang: "fa",
    dir: "rtl",
    icons: [
      { src: "/favicon.ico", sizes: "any", type: "image/x-icon" },
    ],
  };
}
