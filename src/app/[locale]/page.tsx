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
  const design = await getHomeDesign(resolvedLocale);
  return (
    <>
      <EloriaIntroExperience locale={resolvedLocale} />
      <EloriaHome locale={resolvedLocale} design={design} />
      <div className="home-site-footer relative z-10 pb-20 md:pb-0">
        <SiteFooter locale={locale} />
      </div>
    </>
  );
}
