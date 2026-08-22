import { siteBaseUrl } from "@/lib/site-url";

function safeJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function SiteStructuredData() {
  const base = siteBaseUrl().toString().replace(/\/$/, "");

  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "ELORIA",
    url: base,
    logo: `${base}/images/hero/eloria-hero.jpeg`,
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
