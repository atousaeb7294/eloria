import { publicSupportPhone } from "@/lib/legal-business";
import { siteBaseUrl } from "@/lib/site-url";
import { eloriaSocialLinks } from "@/lib/social-links";

function safeJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function returnPolicy(base: string) {
  const raw = Number.parseInt(process.env.NEXT_PUBLIC_ELORIA_RETURN_WINDOW_DAYS?.trim() ?? "", 10);
  if (!Number.isInteger(raw) || raw <= 0 || raw > 90) return undefined;

  return {
    "@type": "MerchantReturnPolicy",
    applicableCountry: "IR",
    returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
    merchantReturnDays: raw,
    merchantReturnLink: `${base}/fa/policies/returns`,
  };
}

function internationalPhone(value: string) {
  if (/^09\d{9}$/.test(value)) return `+98${value.slice(1)}`;
  return value;
}

export function SiteStructuredData() {
  const base = siteBaseUrl().toString().replace(/\/$/, "");
  const phone = internationalPhone(publicSupportPhone());

  const social = eloriaSocialLinks();
  const sameAs = [social.instagram, social.telegram, social.bale];

  const hasMerchantReturnPolicy = returnPolicy(base);

  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "ELORIA",
    url: base,
    logo: `${base}/images/brand/eloria-logo.png`,
    contactPoint: {
      "@type": "ContactPoint",
      telephone: phone,
      contactType: "customer support",
      availableLanguage: ["fa", "en"],
    },
    ...(sameAs.length ? { sameAs } : {}),
    ...(hasMerchantReturnPolicy ? { hasMerchantReturnPolicy } : {}),
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJson(organization) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJson(website) }} />
    </>
  );
}
