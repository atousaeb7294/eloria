"use server";

import { createHash } from "node:crypto";

import { Prisma } from "@/generated/prisma/client";
import { hasValidAdminSession } from "@/lib/admin-auth";
import {
  createEmptyArticleDraft,
  createProductAssistedArticleDraft,
  isValidArticleSlug,
  normalizeArticleSlug,
  type ContentArticleDraft,
  type ContentArticleStatusValue,
} from "@/lib/content-studio";
import { isAllowedProductImageUrl } from "@/lib/product-media-storage";
import { prisma, withDatabaseRetry } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

class ContentActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContentActionError";
  }
}

function localeOf(value: string): "fa" | "en" {
  return value === "en" ? "en" : "fa";
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function field(
  form: FormData,
  key: string,
  maximumLength: number,
  required = false,
): string | null {
  const raw = form.get(key);
  const value = typeof raw === "string" ? raw.trim() : "";

  if (required && !value) {
    throw new ContentActionError("همهٔ فیلدهای ضروری مقاله را کامل کنید.");
  }

  if (value.length > maximumLength) {
    throw new ContentActionError(
      "طول یکی از فیلدهای مقاله بیش از حد مجاز است.",
    );
  }

  return value || null;
}

function requiredField(
  form: FormData,
  key: string,
  maximumLength: number,
  minimumLength: number,
): string {
  const value = field(form, key, maximumLength, true)!;

  if (value.length < minimumLength) {
    throw new ContentActionError(
      "بخشی از متن مقاله برای انتشار حرفه‌ای کافی نیست.",
    );
  }

  return value;
}

function optionalImage(form: FormData): string | null {
  const value = field(form, "coverImageUrl", 1_000);

  if (value && !isAllowedProductImageUrl(value)) {
    throw new ContentActionError(
      "نشانی تصویر مقاله باید یک مسیر داخلی یا تصویر HTTPS مجاز باشد.",
    );
  }

  return value;
}

function statusFromForm(form: FormData): ContentArticleStatusValue {
  const value = field(form, "status", 20, true);

  if (
    value === "DRAFT" ||
    value === "IN_REVIEW" ||
    value === "PUBLISHED" ||
    value === "ARCHIVED"
  ) {
    return value;
  }

  throw new ContentActionError("وضعیت مقاله معتبر نیست.");
}

function articleInputFromForm(
  form: FormData,
): Omit<
  ContentArticleDraft,
  "origin" | "sourceProductId" | "sourceCollectionId"
> {
  const rawSlug = requiredField(form, "slug", 180, 3);
  const slug = normalizeArticleSlug(rawSlug);

  if (!isValidArticleSlug(slug)) {
    throw new ContentActionError(
      "نشانی مقاله باید دست‌کم سه حرف یا عدد داشته باشد و واژه‌ها با خط تیره جدا شوند.",
    );
  }

  return {
    slug,
    titleFa: requiredField(form, "titleFa", 180, 8),
    titleEn: requiredField(form, "titleEn", 180, 8),
    excerptFa: requiredField(form, "excerptFa", 360, 45),
    excerptEn: requiredField(form, "excerptEn", 360, 45),
    contentFa: requiredField(form, "contentFa", 30_000, 80),
    contentEn: requiredField(form, "contentEn", 30_000, 80),
    seoTitleFa: field(form, "seoTitleFa", 180) ?? "",
    seoTitleEn: field(form, "seoTitleEn", 180) ?? "",
    seoDescriptionFa: field(form, "seoDescriptionFa", 180) ?? "",
    seoDescriptionEn: field(form, "seoDescriptionEn", 180) ?? "",
    focusKeywordFa: field(form, "focusKeywordFa", 120) ?? "",
    focusKeywordEn: field(form, "focusKeywordEn", 120) ?? "",
    coverImageUrl: optionalImage(form),
  };
}

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function articleFingerprint(input: {
  titleFa: string;
  titleEn: string;
  excerptFa: string;
  excerptEn: string;
  contentFa: string;
  contentEn: string;
  seoTitleFa?: string | null;
  seoTitleEn?: string | null;
  seoDescriptionFa?: string | null;
  seoDescriptionEn?: string | null;
  focusKeywordFa?: string | null;
  focusKeywordEn?: string | null;
  coverImageUrl?: string | null;
}): string {
  return createHash("sha256")
    .update(JSON.stringify(input), "utf8")
    .digest("hex");
}

function contentIndexPath(
  locale: "fa" | "en",
  extra: Record<string, string> = {},
): string {
  const query = new URLSearchParams(extra);
  const suffix = query.size > 0 ? `?${query.toString()}` : "";

  return `/${locale}/admin/content${suffix}`;
}

function contentEditorPath(
  locale: "fa" | "en",
  id: string,
  extra: Record<string, string> = {},
): string {
  const query = new URLSearchParams(extra);
  const suffix = query.size > 0 ? `?${query.toString()}` : "";

  return `/${locale}/admin/content/${id}${suffix}`;
}

async function requireSession(): Promise<void> {
  if (!(await hasValidAdminSession())) {
    throw new ContentActionError("نشست مدیریت منقضی شده است.");
  }
}

function revalidateContentPaths(slug: string) {
  for (const locale of ["fa", "en"] as const) {
    revalidatePath(`/${locale}/journal`);
    revalidatePath(`/${locale}/journal/${encodeURIComponent(slug)}`);
    revalidatePath(`/${locale}/admin/content`);
  }

  revalidatePath("/sitemap.xml");
}

function publicError(error: unknown): string {
  if (error instanceof ContentActionError) {
    return error.message;
  }

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    return "این نشانی یا پیش‌نویس محصول قبلاً وجود دارد. نشانی دیگری انتخاب کنید یا همان پیش‌نویس را ویرایش کنید.";
  }

  console.error("[Eloria Content Action] Unexpected error.", error);

  return "عملیات محتوا انجام نشد. دوباره تلاش کنید.";
}

function isRedirectError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof error.digest === "string" &&
    error.digest.startsWith("NEXT_REDIRECT")
  );
}

export async function createProductArticleDraftAction(
  localeValue: string,
  form: FormData,
): Promise<void> {
  const locale = localeOf(localeValue);

  try {
    await requireSession();

    const productId = requiredField(form, "productId", 64, 36);

    if (!isUuid(productId)) {
      throw new ContentActionError("محصول انتخاب‌شده معتبر نیست.");
    }

    const article = await withDatabaseRetry(
      () =>
        prisma.$transaction(
          async (transaction) => {
            const product = await transaction.product.findFirst({
              where: {
                id: productId,
                status: {
                  in: ["ACTIVE", "OUT_OF_STOCK"],
                },
              },
              select: {
                id: true,
                slug: true,
                nameFa: true,
                nameEn: true,
                descriptionFa: true,
                descriptionEn: true,
                material: true,
                purity: true,
                metalWeight: true,
                collection: {
                  select: {
                    id: true,
                    slug: true,
                    nameFa: true,
                    nameEn: true,
                  },
                },
                images: {
                  orderBy: [
                    {
                      isPrimary: "desc",
                    },
                    {
                      displayOrder: "asc",
                    },
                  ],
                  select: {
                    imageUrl: true,
                    isPrimary: true,
                    displayOrder: true,
                  },
                },
              },
            });

            if (!product) {
              throw new ContentActionError("محصول فعال پیدا نشد.");
            }

            const existing = await transaction.contentArticle.findFirst({
              where: {
                sourceProductId: product.id,
                status: {
                  not: "ARCHIVED",
                },
              },
              select: {
                id: true,
              },
            });

            if (existing) {
              throw new ContentActionError(
                "برای این محصول یک مقالهٔ فعال یا پیش‌نویس وجود دارد. همان مقاله را ویرایش کنید.",
              );
            }

            const draft = createProductAssistedArticleDraft(product);
            const created = await transaction.contentArticle.create({
              data: {
                ...draft,
                seoTitleFa: draft.seoTitleFa || null,
                seoTitleEn: draft.seoTitleEn || null,
                seoDescriptionFa: draft.seoDescriptionFa || null,
                seoDescriptionEn: draft.seoDescriptionEn || null,
                focusKeywordFa: draft.focusKeywordFa || null,
                focusKeywordEn: draft.focusKeywordEn || null,
              },
              select: {
                id: true,
                slug: true,
              },
            });

            await transaction.contentArticleAuditEvent.create({
              data: {
                articleId: created.id,
                eventType: "ARTICLE_DRAFT_CREATED",
                payload: json({
                  origin: "PRODUCT_ASSISTED",
                  sourceProductId: product.id,
                  sourceProductSlug: product.slug,
                  contentFingerprint: articleFingerprint(draft),
                }),
              },
            });

            return created;
          },
          {
            maxWait: 5_000,
            timeout: 20_000,
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          },
        ),
      {
        attempts: 2,
        delayMilliseconds: 250,
      },
    );

    revalidateContentPaths(article.slug);

    redirect(
      contentEditorPath(locale, article.id, {
        created: "product-draft",
      }),
    );
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    redirect(
      contentIndexPath(locale, {
        error: publicError(error),
      }),
    );
  }
}

export async function createManualArticleAction(
  localeValue: string,
): Promise<void> {
  const locale = localeOf(localeValue);

  try {
    await requireSession();

    const draft = createEmptyArticleDraft();
    const article = await withDatabaseRetry(() =>
      prisma.$transaction(
        async (transaction) => {
          const created = await transaction.contentArticle.create({
            data: {
              ...draft,
              slug: `new-article-${Date.now()}`,
              titleFa: "پیش‌نویس مقالهٔ جدید",
              titleEn: "New article draft",
              excerptFa:
                "این پیش‌نویس هنوز برای انتشار آماده نیست و باید با یک خلاصهٔ دقیق، مفید و متناسب با موضوع تکمیل شود.",
              excerptEn:
                "This draft is not ready for publication and must be completed with a precise, useful summary that matches the article topic.",
              seoTitleFa: null,
              seoTitleEn: null,
              seoDescriptionFa: null,
              seoDescriptionEn: null,
              focusKeywordFa: null,
              focusKeywordEn: null,
            },
            select: {
              id: true,
              slug: true,
            },
          });

          await transaction.contentArticleAuditEvent.create({
            data: {
              articleId: created.id,
              eventType: "ARTICLE_DRAFT_CREATED",
              payload: json({
                origin: "MANUAL",
                contentFingerprint: articleFingerprint({
                  ...draft,
                  titleFa: "پیش‌نویس مقالهٔ جدید",
                  titleEn: "New article draft",
                  excerptFa:
                    "این پیش‌نویس هنوز برای انتشار آماده نیست و باید با یک خلاصهٔ دقیق، مفید و متناسب با موضوع تکمیل شود.",
                  excerptEn:
                    "This draft is not ready for publication and must be completed with a precise, useful summary that matches the article topic.",
                }),
              }),
            },
          });

          return created;
        },
        {
          maxWait: 5_000,
          timeout: 20_000,
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      ),
    );

    redirect(
      contentEditorPath(locale, article.id, {
        created: "manual-draft",
      }),
    );
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    redirect(
      contentIndexPath(locale, {
        error: publicError(error),
      }),
    );
  }
}

export async function saveContentArticleAction(
  articleId: string,
  localeValue: string,
  form: FormData,
): Promise<void> {
  const locale = localeOf(localeValue);

  if (!isUuid(articleId)) {
    redirect(
      contentIndexPath(locale, {
        error: "شناسهٔ مقاله معتبر نیست.",
      }),
    );
  }

  try {
    await requireSession();

    const input = articleInputFromForm(form);
    const nextStatus = statusFromForm(form);
    const article = await withDatabaseRetry(
      () =>
        prisma.$transaction(
          async (transaction) => {
            const existing = await transaction.contentArticle.findUnique({
              where: {
                id: articleId,
              },
              select: {
                id: true,
                slug: true,
                status: true,
                publishedAt: true,
                archivedAt: true,
                origin: true,
                sourceProductId: true,
                sourceCollectionId: true,
              },
            });

            if (!existing) {
              throw new ContentActionError("مقاله پیدا نشد.");
            }

            if (
              nextStatus === "PUBLISHED" &&
              existing.status !== "PUBLISHED" &&
              form.get("confirmPublish") !== "publish"
            ) {
              throw new ContentActionError(
                "برای انتشار، تیک تأیید انتشار عمومی را بزنید.",
              );
            }

            const now = new Date();
            const statusChanged = existing.status !== nextStatus;
            const updated = await transaction.contentArticle.update({
              where: {
                id: existing.id,
              },
              data: {
                ...input,
                seoTitleFa: input.seoTitleFa || null,
                seoTitleEn: input.seoTitleEn || null,
                seoDescriptionFa: input.seoDescriptionFa || null,
                seoDescriptionEn: input.seoDescriptionEn || null,
                focusKeywordFa: input.focusKeywordFa || null,
                focusKeywordEn: input.focusKeywordEn || null,
                status: nextStatus,
                publishedAt:
                  nextStatus === "PUBLISHED"
                    ? (existing.publishedAt ?? now)
                    : existing.publishedAt,
                archivedAt: nextStatus === "ARCHIVED" ? now : null,
              },
              select: {
                id: true,
                slug: true,
                status: true,
              },
            });

            await transaction.contentArticleAuditEvent.create({
              data: {
                articleId: updated.id,
                eventType:
                  nextStatus === "PUBLISHED" && existing.status !== "PUBLISHED"
                    ? "ARTICLE_PUBLISHED"
                    : nextStatus === "ARCHIVED" &&
                        existing.status !== "ARCHIVED"
                      ? "ARTICLE_ARCHIVED"
                      : statusChanged
                        ? "ARTICLE_STATUS_CHANGED"
                        : "ARTICLE_UPDATED",
                payload: json({
                  previousStatus: existing.status,
                  nextStatus,
                  previousSlug: existing.slug,
                  slug: updated.slug,
                  origin: existing.origin,
                  sourceProductId: existing.sourceProductId,
                  sourceCollectionId: existing.sourceCollectionId,
                  contentFingerprint: articleFingerprint(input),
                }),
              },
            });

            return {
              oldSlug: existing.slug,
              newSlug: updated.slug,
            };
          },
          {
            maxWait: 5_000,
            timeout: 20_000,
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          },
        ),
      {
        attempts: 2,
        delayMilliseconds: 250,
      },
    );

    revalidateContentPaths(article.oldSlug);

    if (article.oldSlug !== article.newSlug) {
      revalidateContentPaths(article.newSlug);
    }

    redirect(
      contentEditorPath(locale, articleId, {
        saved: "1",
      }),
    );
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    redirect(
      contentEditorPath(locale, articleId, {
        error: publicError(error),
      }),
    );
  }
}
