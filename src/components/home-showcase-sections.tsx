import { HomeNarrativeShowcase } from "@/components/home-narrative-showcase";
import { HomeSmartDiscovery } from "@/components/home-smart-discovery";

type HomeShowcaseSectionsProps = {
  locale: string;
  persianTitleClassName?: string;
};

export function HomeShowcaseSections({ locale }: HomeShowcaseSectionsProps) {
  const isPersian = locale === "fa";
  const copy = isPersian
    ? { finalEyebrow: "گزیده آثار الوریا", finalTitle: "هر اثر، روایتی برای ماندن" }
    : { finalEyebrow: "The Eloria collection", finalTitle: "Every creation, a story made to endure" };

  return (
    <div dir={isPersian ? "rtl" : "ltr"} className="relative z-10">
      <HomeSmartDiscovery locale={locale} />
      <HomeNarrativeShowcase locale={locale} copy={copy} />
    </div>
  );
}
