import { siteBaseUrl } from "@/lib/site-url";

function safeJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function SiteStructuredData() {
  const base = siteBaseUrl().toString().replace(/\/$/, "");

  const sameAs = [
    process.env.NEXT_PUBLIC_ELORIA_INSTAGRAM_URL,
    process.env.NEXT_PUBLIC_ELORIA_TELEGRAM_URL,
    process.env.NEXT_PUBLIC_ELORIA_BALE_URL,
  ]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value && /^https:\/\//i.test(value)));

  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "ELORIA",
    url: base,
    logo: `${base}/images/hero/eloria-hero.jpeg`,
    ...(sameAs.length ? { sameAs } : {}),
  };
  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "ELORIA",
    url: base,
    inLanguage: ["fa-IR", "en"],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJson(organization),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJson(website),
        }}
      />
    </>
  );
}
