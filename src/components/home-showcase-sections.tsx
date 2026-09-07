import { HomeNarrativeShowcase } from "@/components/home-narrative-showcase";
import { HomeSmartDiscovery } from "@/components/home-smart-discovery";

type HomeShowcaseSectionsProps = {
  locale: string;
  persianTitleClassName?: string;
};

export function HomeShowcaseSections({ locale }: HomeShowcaseSectionsProps) {
  const isPersian = locale === "fa";
  const copy = isPersian
    ? { finalEyebrow: "روایت‌های برگزیده الوریا", finalTitle: "هر قطعه، نشانی از یک افسانه" }
    : { finalEyebrow: "The Eloria collection", finalTitle: "Every creation, a story made to endure" };

  return (
    <div dir={isPersian ? "rtl" : "ltr"} className="relative z-10">
      <HomeNarrativeShowcase locale={locale} copy={copy} />
      <HomeSmartDiscovery locale={locale} />
    </div>
  );
}
