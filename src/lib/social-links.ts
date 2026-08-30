const OFFICIAL_SOCIAL_URLS = {
  instagram: "https://www.instagram.com/eloriagallery_gold/",
  telegram: "https://t.me/eloriagallery_gold",
  bale: "https://ble.ir/eloriagallery_gold",
} as const;

function configuredUrl(name: string, fallback: string): string {
  const value = process.env[name]?.trim();
  return value && /^https:\/\//i.test(value) ? value : fallback;
}

export function eloriaSocialLinks() {
  return {
    instagram: configuredUrl(
      "NEXT_PUBLIC_ELORIA_INSTAGRAM_URL",
      OFFICIAL_SOCIAL_URLS.instagram,
    ),
    telegram: configuredUrl(
      "NEXT_PUBLIC_ELORIA_TELEGRAM_URL",
      OFFICIAL_SOCIAL_URLS.telegram,
    ),
    bale: configuredUrl(
      "NEXT_PUBLIC_ELORIA_BALE_URL",
      OFFICIAL_SOCIAL_URLS.bale,
    ),
  };
}
