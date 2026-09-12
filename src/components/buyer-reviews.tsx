import { prisma } from "@/lib/prisma";
import { BuyerReviewForm } from "@/components/buyer-review-form";
export async function BuyerReviews({
  productId,
  slug,
}: {
  productId: string;
  slug: string;
}) {
  let reviews;
  try {
    reviews = await prisma.buyerReview.findMany({
      where: { productId, status: "APPROVED" },
      select: { id: true, rating: true, displayName: true, body: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  } catch {
    return (
      <section className="mt-10 p-6">
        نظرهای خریداران موقتاً در دسترس نیست.
      </section>
    );
  }
  return (
    <section
      className="mt-10 rounded-2xl border border-[#d9b85f]/20 p-5 sm:p-8"
      dir="rtl"
    >
      <h2 className="text-xl">نظر خریداران</h2>
      {!reviews.length && <p className="mt-4">هنوز نظری منتشر نشده است.</p>}
      {reviews.map((r) => (
        <article
          key={r.id}
          className="mt-5 border-b border-white/10 pb-5 break-words"
        >
          <h3>
            {r.displayName} · {r.rating} از ۵
          </h3>
          <p className="text-xs mt-2">خریدار تأییدشده</p>
          <p className="mt-3 whitespace-pre-wrap leading-8">{r.body}</p>
        </article>
      ))}
      <BuyerReviewForm slug={slug} />
    </section>
  );
}
