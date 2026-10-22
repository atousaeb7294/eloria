import { setRequestLocale } from "next-intl/server";
import { EloriaHome } from "@/components/eloria-home";
import { SiteFooter } from "@/components/site-footer";
import { getHomeDesign } from "@/lib/home-design";
import { EloriaIntroExperience } from "@/components/eloria-intro-experience";
import { Suspense } from "react";
import "../home-design.css";

export const dynamic = "force-dynamic";

async function HomeContent({ locale }: { locale: "fa" | "en" }) {
  const design = await getHomeDesign(locale);
  return <EloriaHome locale={locale} design={design} />;
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const resolvedLocale = locale === "en" ? "en" : "fa";
  return (
    <>
      <EloriaIntroExperience locale={resolvedLocale} />
      <Suspense fallback={
        <div className="eloria-home home-loading" aria-busy="true" role="status">
          <div className="palace" aria-hidden="true" />
          <p>{resolvedLocale === "fa" ? "جهان الوریا در حال آماده شدن است…" : "Preparing the world of Eloria…"}</p>
        </div>
      }>
        <HomeContent locale={resolvedLocale} />
      </Suspense>
      <div className="home-site-footer relative z-10 pb-20 md:pb-0">
        <SiteFooter locale={locale} />
      </div>
    </>
  );
}
