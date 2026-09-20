import { HomeNarrativeShowcase } from "@/components/home-narrative-showcase";
import { HomeSmartDiscovery } from "@/components/home-smart-discovery";

type HomeShowcaseSectionsProps = {
  locale: string;
  persianTitleClassName?: string;
};

export function HomeShowcaseSections({ locale }: HomeShowcaseSectionsProps) {
  const isPersian = locale === "fa";
  const copy = isPersian
    ? { finalEyebrow: "ویترین زندهٔ الوریا", finalTitle: "هر اثر، یک فصل" }
    : { finalEyebrow: "The living Eloria edit", finalTitle: "Every creation, a chapter" };

  return (
    <div dir={isPersian ? "rtl" : "ltr"} className="relative z-10">
      <HomeNarrativeShowcase locale={locale} copy={copy} />
      <HomeSmartDiscovery locale={locale} />
    </div>
  );
}
