import { HomeNarrativeShowcase } from "@/components/home-narrative-showcase";
type HomeShowcaseSectionsProps = {
    locale: string;
    persianTitleClassName?: string;
};
type HomeCopy = {
    trustEyebrow: string;
    trustTitle: string;
    trustDescription: string;
    finalEyebrow: string;
    finalTitle: string;
    finalDescription: string;
    finalPrimary: string;
    finalSecondary: string;
    principles: Array<{
        title: string;
        description: string;
    }>;
};
export function HomeShowcaseSections({ locale }: HomeShowcaseSectionsProps) {
    const isPersian = locale === "fa";
    const copy: HomeCopy = isPersian
        ? {
            trustEyebrow: "انتخاب با اطمینان",
            trustTitle: "زیبایی باید با وضوح همراه باشد",
            trustDescription: "اطلاعات هر اثر روشن و منظم ارائه می‌شود تا مشخصات، موجودی و قیمت را پیش از انتخاب بدون ابهام ببینید.",
            finalEyebrow: "آغاز یک روایت",
            finalTitle: "اثری را انتخاب کنید که امضای سلیقه شما باشد",
            finalDescription: "تمام آثار الوریا را ببینید و انتخاب خود را براساس دسته‌بندی، جنس، موجودی و بازه قیمت دقیق‌تر کنید.",
            finalPrimary: "تماشای تمام آثار",
            finalSecondary: "مرور گنجینه‌ها",
            principles: [
                {
                    title: "مشخصات روشن",
                    description: "جنس، ویژگی‌ها و جزئیات هر اثر پیش از انتخاب به‌صورت شفاف نمایش داده می‌شود.",
                },
                {
                    title: "موجودی مشخص",
                    description: "وضعیت موجودی هر اثر روشن است تا انتخاب شما بدون ابهام انجام شود.",
                },
                {
                    title: "قیمت‌گذاری شفاف",
                    description: "اطلاعات قیمت با ساختاری خوانا ارائه می‌شود تا تصمیم‌گیری ساده‌تر و مطمئن‌تر باشد.",
                }
            ],
        }
        : {
            trustEyebrow: "Choose with clarity",
            trustTitle: "Beauty should be accompanied by clarity",
            trustDescription: "Each creation is presented clearly so you can review specifications, availability and pricing before choosing.",
            finalEyebrow: "Begin a narrative",
            finalTitle: "Choose a creation that reflects your signature taste",
            finalDescription: "Browse every Eloria creation and refine your selection by category, material, availability and price range.",
            finalPrimary: "View all creations",
            finalSecondary: "Browse collections",
            principles: [
                {
                    title: "Clear specifications",
                    description: "Material, features and essential details are presented clearly before you choose.",
                },
                {
                    title: "Visible availability",
                    description: "Availability is shown clearly so you can choose without uncertainty.",
                },
                {
                    title: "Transparent pricing",
                    description: "Pricing information is presented in a readable structure for a clearer decision.",
                }
            ],
        };
    return (<div dir={isPersian ? "rtl" : "ltr"} className="relative z-10">
      <HomeNarrativeShowcase locale={locale} copy={copy}/>

    <section className="relative isolate overflow-hidden py-16 sm:py-20 lg:py-24" data-eloria-trust-section="true">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(18,90,66,.10),transparent_38%)]"/>

        <div aria-hidden="true" className="pointer-events-none absolute inset-x-[10%] top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(216,183,96,.15),transparent)]"/>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className={locale === "fa"
            ? "font-sans text-[11px] font-medium leading-6 tracking-normal text-[#d9c27e]/62 sm:text-[12px]"
            : "text-[10px] font-medium tracking-[0.18em] text-[#d9c27e]/62 sm:text-[11px]"}>
              {copy.trustEyebrow}
            </p>

            <h2 className={locale === "fa"
            ? "font-persian-title mx-auto mt-4 max-w-2xl text-2xl text-[#f1e4c7] sm:text-3xl"
            : "mx-auto mt-4 max-w-2xl text-2xl font-semibold leading-tight text-[#f1e4c7] sm:text-3xl"}>
              {copy.trustTitle}
            </h2>

            <p className={locale === "fa"
            ? "font-sans mx-auto mt-4 max-w-2xl text-[13px] leading-8 tracking-normal text-[#d2c4a5]/66 sm:text-sm"
            : "mx-auto mt-4 max-w-2xl text-sm leading-8 text-[#d2c4a5]/66"}>
              {copy.trustDescription}
            </p>
          </div>

          <div className="mx-auto mt-10 grid max-w-5xl gap-4 sm:mt-12 md:grid-cols-3 md:gap-5">
            {copy.principles.map((principle) => (<article key={principle.title} className="group relative overflow-hidden rounded-[24px] border border-[#d7b65e]/10 bg-[linear-gradient(160deg,rgba(7,34,25,.58),rgba(3,18,13,.42))] px-5 py-6 shadow-[0_16px_50px_rgba(0,0,0,.16)] transition duration-500 hover:-translate-y-1 hover:border-[#d7b65e]/20 hover:bg-[linear-gradient(160deg,rgba(8,39,29,.68),rgba(3,18,13,.48))] motion-reduce:transform-none sm:px-6 sm:py-7">
                  <div aria-hidden="true" className="mb-5 h-px w-10 bg-[linear-gradient(90deg,#d7b65e,transparent)] opacity-55 transition-all duration-500 group-hover:w-14 group-hover:opacity-80"/>

                  <h3 className={locale === "fa"
                ? "font-persian-title text-[15px] text-[#efe2c4]/92"
                : "text-[14px] font-semibold tracking-[0.02em] text-[#efe2c4]/92"}>
                    {principle.title}
                  </h3>

                  <p className={locale === "fa"
                ? "font-sans mt-3 text-[12px] leading-7 tracking-normal text-[#cdbf9f]/62 sm:text-[13px]"
                : "mt-3 text-[12px] leading-7 text-[#cdbf9f]/62 sm:text-[13px]"}>
                    {principle.description}
                  </p>

                  <div aria-hidden="true" className="pointer-events-none absolute -bottom-10 -end-10 h-24 w-24 rounded-full bg-[#d7b65e]/[0.025] blur-2xl"/>
                </article>))}
          </div>
        </div>
      </section>


    </div>);
}
