import { Suspense } from "react";
import { headers } from "next/headers";
import { INTRO_SESSION_KEY } from "@/components/intro/eloria-intro-config";
import { setRequestLocale } from "next-intl/server";
import { EloriaHome } from "@/components/eloria-home";
import { SiteFooter } from "@/components/site-footer";
import { getHomeDesign } from "@/lib/home-design";
import { EloriaIntroExperience } from "@/components/eloria-intro-experience";
import "../home-design.css";

export const dynamic = "force-dynamic";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const resolvedLocale = locale === "en" ? "en" : "fa";
  const requestHeaders = await headers();
  const nonce = requestHeaders.get("x-nonce") ?? undefined;
  // A document request can stream the first-visit film. On a client navigation,
  // wait for the destination before replacing the treasury already on screen.
  const documentVisit = requestHeaders.get("sec-fetch-dest") === "document";
  const home = documentVisit
    ? <Suspense fallback={null}><HomeContent locale={resolvedLocale} /></Suspense>
    : await HomeContent({ locale: resolvedLocale });
  return (
    <>
      <script nonce={nonce} dangerouslySetInnerHTML={{ __html: `try{document.documentElement.toggleAttribute("data-intro-seen",!!location.hash||sessionStorage.getItem(${JSON.stringify(INTRO_SESSION_KEY)})==="1")}catch{}` }} />
      <EloriaIntroExperience locale={resolvedLocale} />
      {home}
    </>
  );
}

async function HomeContent({ locale }: { locale: "fa" | "en" }) {
  const design = await getHomeDesign(locale);
  return (
    <>
      <EloriaHome locale={locale} design={design} />
      <div className="home-site-footer relative z-10 pb-20 md:pb-0">
        <SiteFooter locale={locale} />
      </div>
    </>
  );
}
