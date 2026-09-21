import { redirect } from "next/navigation";

export default async function LegacyMenTreasury({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}/products?collection=men`);
}
