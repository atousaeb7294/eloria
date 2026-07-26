import {
    getTranslations,
    setRequestLocale,
  } from "next-intl/server";
  
  import { AmbientEffects } from "@/components/ambient-effects";
  import {
    CollectionCards,
    type CollectionCardItem,
  } from "@/components/collection-cards";
  import { SiteHeader } from "@/components/site-header";
  
  type CollectionsPageProps = {
    params: Promise<{
      locale: string;
    }>;
  };
  
  export default async function CollectionsPage({
    params,
  }: CollectionsPageProps) {
    const { locale } = await params;
  
    setRequestLocale(locale);
  
    const t = await getTranslations(
      "Collections",
    );
  
    const collections: CollectionCardItem[] = [
      {
        slug: "necklaces",
        title: t("necklacesTitle"),
        description: t(
          "necklacesDescription",
        ),
        imageSrc:
          "/images/collections/necklaces.jfif",
        number: "01",
      },
      {
        slug: "bracelets",
        title: t("braceletsTitle"),
        description: t(
          "braceletsDescription",
        ),
        imageSrc:
          "/images/collections/bracelet.jpg",
        number: "02",
      },
      {
        slug: "earrings",
        title: t("earringsTitle"),
        description: t(
          "earringsDescription",
        ),
        imageSrc:
          "/images/collections/earring.jpg",
        number: "03",
      },
    ];
  
    return (
      <main className="relative min-h-screen overflow-hidden bg-[#02150f] text-[#f5efe4]">
        <div
          aria-hidden="true"
          className="fixed inset-0 bg-[radial-gradient(circle_at_50%_6%,rgba(25,145,104,0.22),transparent_35%),radial-gradient(circle_at_10%_65%,rgba(216,180,88,0.1),transparent_30%),linear-gradient(180deg,#052c20_0%,#02170f_48%,#010b08_100%)]"
        />
  
        <div
          aria-hidden="true"
          className="fixed inset-0 opacity-[0.06] [background-image:linear-gradient(30deg,transparent_24%,rgba(245,214,132,0.6)_25%,rgba(245,214,132,0.6)_26%,transparent_27%,transparent_74%,rgba(245,214,132,0.6)_75%,rgba(245,214,132,0.6)_76%,transparent_77%)] [background-size:70px_70px]"
        />
  
        <div
          aria-hidden="true"
          className="fixed -left-52 top-1/3 size-[32rem] rounded-full bg-[#d5aa48]/8 blur-[140px]"
        />
  
        <div
          aria-hidden="true"
          className="fixed -right-52 bottom-0 size-[36rem] rounded-full bg-[#168461]/14 blur-[150px]"
        />
  
        <AmbientEffects />
  
        <SiteHeader />
  
        <section className="relative z-20 mx-auto max-w-[1240px] px-5 pb-28 pt-40 sm:px-8 sm:pt-44">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-medium tracking-[0.26em] text-[#d9bd78]">
              {t("eyebrow")}
            </p>
  
            <h1 className="mt-5 text-4xl font-medium leading-[1.5] text-[#f7f0e4] sm:text-5xl md:text-6xl">
              {t("title")}
            </h1>
  
            <div className="mx-auto mt-6 h-px w-28 bg-gradient-to-r from-transparent via-[#d6b66a] to-transparent" />
  
            <p className="mx-auto mt-6 max-w-2xl text-sm leading-8 text-white/60 sm:text-base">
              {t("description")}
            </p>
          </div>
  
          <CollectionCards
            items={collections}
            enterLabel={t("enterCollection")}
          />
        </section>
      </main>
    );
  }