"use client";

import {
  useActionState,
  useState,
  type ReactNode,
} from "react";

import {
  Save,
} from "lucide-react";

import type { AdminProductActionState } from "@/app/[locale]/admin/(protected)/products/actions";

import {
  createAdminProductAction,
  updateAdminProductAction,
} from "@/app/[locale]/admin/(protected)/products/actions";

export type AdminProductFormValue = {
  id?: string;
  audience?: "WOMEN" | "MEN";
  collectionId: string;
  slug: string;
  sku: string;
  nameFa: string;
  nameEn: string;
  descriptionFa: string;
  descriptionEn: string;
  legendFa: string;
  legendEn: string;
  characterImageUrl: string;
  worldSceneImageUrl: string;
  material: "GOLD" | "SILVER";
  hasGold: boolean;
  hasSilver: boolean;
  goldComponentWeight: string;
  silverComponentWeight: string;
  pricingMode: "DYNAMIC" | "MANUAL";
  price: string;
  compareAtPrice: string;
  metalWeight: string;
  purity: string;
  purityFineness: string;
  makingChargeType:
    | "NONE"
    | "FIXED"
    | "PER_GRAM"
    | "PERCENT"
    | "COMBINED";
  makingChargeFixed: string;
  makingChargePerGram: string;
  makingChargePercent: string;
  artisticFee: string;
  profitPercent: string;
  taxPercent: string;
  stock: string;
  status:
    | "DRAFT"
    | "ACTIVE"
    | "OUT_OF_STOCK"
    | "ARCHIVED";
  isFeatured: boolean;
  displayOrder: string;
  primaryImageUrl: string;
};

type CollectionOption = {
  id: string;
  nameFa: string;
  slug: string;
};

const initialState: AdminProductActionState = {
  error: null,
};

const inputClassName =
  "h-12 w-full rounded-xl border border-[#cfb45f]/20 bg-[#031a13] px-3.5 text-sm text-[#f7e7c2] outline-none transition placeholder:text-[#887c65] focus:border-[#dfc36d]/60 focus:ring-4 focus:ring-[#cfad4e]/8";

const textareaClassName =
  "min-h-32 w-full resize-y rounded-xl border border-[#cfb45f]/20 bg-[#031a13] px-3.5 py-3 text-sm leading-7 text-[#f7e7c2] outline-none transition placeholder:text-[#887c65] focus:border-[#dfc36d]/60 focus:ring-4 focus:ring-[#cfad4e]/8";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-[#d5c5a2]">
        {label}
      </span>
      {children}
      {hint ? (
        <span className="mt-1.5 block text-xs leading-6 text-[#8e836d]">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[24px] border border-[#d0b359]/16 bg-[#041d15]/78 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.16)] sm:p-6">
      <header className="mb-5 border-b border-[#d2b45b]/12 pb-4">
        <h2 className="text-lg font-semibold text-[#f1d98e]">
          {title}
        </h2>
        <p className="mt-1 text-sm leading-7 text-[#9f9278]">
          {description}
        </p>
      </header>
      {children}
    </section>
  );
}

export function AdminProductForm({
  locale,
  collections,
  value,
}: {
  locale: "fa" | "en";
  collections: CollectionOption[];
  value: AdminProductFormValue;
}) {
  const [selectedMaterial, setSelectedMaterial] = useState(value.material);
  const [hasGold, setHasGold] = useState(value.hasGold);
  const [hasSilver, setHasSilver] = useState(value.hasSilver);
  const action: (
    state: AdminProductActionState,
    formData: FormData,
  ) => Promise<AdminProductActionState> =
    value.id
      ? updateAdminProductAction.bind(
          null,
          value.id,
        )
      : createAdminProductAction;

  const [
    state,
    formAction,
    isPending,
  ] = useActionState(
    action,
    initialState,
  );

  return (
    <form
      action={formAction}
      className="space-y-5"
    >
      <input
        type="hidden"
        name="locale"
        value={locale}
      />

      {state.error ? (
        <div
          role="alert"
          className="rounded-2xl border border-red-300/20 bg-red-950/25 px-5 py-4 text-sm leading-7 text-red-100"
        >
          {state.error}
        </div>
      ) : null}

      <FormSection
        title="هویت محصول"
        description="نام، آدرس صفحه، دسته‌بندی و اطلاعات اصلی اثر"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="نام فارسی *">
            <input
              className={inputClassName}
              defaultValue={value.nameFa}
              name="nameFa"
              required
            />
          </Field>

          <Field label="نام انگلیسی *">
            <input
              className={inputClassName}
              defaultValue={value.nameEn}
              dir="ltr"
              name="nameEn"
              required
            />
          </Field>

          <Field
            label="شناسه URL *"
            hint="نمونه: eloria-golden-necklace"
          >
            <input
              className={inputClassName}
              defaultValue={value.slug}
              dir="ltr"
              name="slug"
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              required
            />
          </Field>

          <Field label="کد SKU">
            <input
              className={inputClassName}
              defaultValue={value.sku}
              dir="ltr"
              name="sku"
            />
          </Field>

          <Field label="مناسب برای" hint="انتخاب آقایان، اثر را در فیلتر مخاطب آقایان نمایش می‌دهد و افسانه‌ای از شخصیت‌های مرد اختصاص می‌دهد.">
            <select name="audience" defaultValue={value.audience ?? "WOMEN"} className={inputClassName}>
              <option value="WOMEN">بانوان</option>
              <option value="MEN">آقایان</option>
            </select>
          </Field>
          <Field label="نوع اثر *" hint="این گزینه فقط نوع محصول را برای فیلتر تمام آثار مشخص می‌کند؛ گنجینه‌ها بر اساس فلز و مخاطب ساخته می‌شوند.">
            <select
              className={inputClassName}
              defaultValue={value.collectionId}
              name="collectionId"
              required
            >
              <option value="">
                انتخاب نوع اثر
              </option>
              {collections.map(
                (collection) => (
                  <option
                    key={collection.id}
                    value={collection.id}
                  >
                    {collection.nameFa} — {collection.slug}
                  </option>
                ),
              )}
            </select>
          </Field>

          <Field label="فلز مبنای قیمت‌گذاری">
            <select
              className={inputClassName}
              value={selectedMaterial}
              onChange={(event) => setSelectedMaterial(event.target.value as "GOLD" | "SILVER")}
              name="material"
            >
              <option value="GOLD">طلا</option>
              <option value="SILVER">نقره</option>
            </select>
          </Field>

          <div className="md:col-span-2 rounded-2xl border border-[#cfb45f]/18 bg-[#061f17]/65 p-4">
            <p className="text-sm text-[#ead79f]">ترکیب فلز و عضویت در گنجینه‌ها</p>
            <p className="mt-1 text-xs leading-6 text-[#9f9278]">هر دو گزینه را برای اثر ترکیبی فعال کنید. اثر به‌صورت هم‌زمان در گنجینهٔ طلا و نقره نمایش داده می‌شود.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-3 rounded-xl border border-[#d9b85f]/20 p-3 text-sm text-[#e8d39a]">
                <input name="hasGold" type="checkbox" checked={hasGold} onChange={(event) => setHasGold(event.target.checked)} className="size-4 accent-[#d8ba62]" /> دارای طلا
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-[#d8e2e5]/16 p-3 text-sm text-[#dfe8ea]">
                <input name="hasSilver" type="checkbox" checked={hasSilver} onChange={(event) => setHasSilver(event.target.checked)} className="size-4 accent-[#c9d5d9]" /> دارای نقره
              </label>
              {hasGold ? <Field label="وزن طلای به‌کاررفته (گرم)"><input className={inputClassName} defaultValue={value.goldComponentWeight} inputMode="decimal" name="goldComponentWeight" /></Field> : null}
              {hasSilver ? <Field label="وزن نقرهٔ به‌کاررفته (گرم)"><input className={inputClassName} defaultValue={value.silverComponentWeight} inputMode="decimal" name="silverComponentWeight" /></Field> : null}
            </div>
          </div>

          <Field label="آدرس تصویر اصلی">
            <input
              className={inputClassName}
              defaultValue={value.primaryImageUrl}
              dir="ltr"
              name="primaryImageUrl"
              placeholder="/images/products/example.jpg"
            />
          </Field>

          <Field label="ترتیب نمایش">
            <input
              className={inputClassName}
              defaultValue={value.displayOrder}
              inputMode="numeric"
              name="displayOrder"
              type="number"
            />
          </Field>
        </div>
      </FormSection>

      <FormSection
        title="توضیحات و روایت"
        description="متن معرفی محصول در نسخه فارسی و انگلیسی"
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="توضیحات فارسی">
            <textarea
              className={textareaClassName}
              defaultValue={value.descriptionFa}
              name="descriptionFa"
            />
          </Field>

          <Field label="English description">
            <textarea
              className={textareaClassName}
              defaultValue={value.descriptionEn}
              dir="ltr"
              name="descriptionEn"
            />
          </Field>

          <Field label="روایت فارسی">
            <textarea
              className={textareaClassName}
              defaultValue={value.legendFa}
              name="legendFa"
            />
          </Field>

          <Field label="English legend">
            <textarea
              className={textareaClassName}
              defaultValue={value.legendEn}
              dir="ltr"
              name="legendEn"
            />
          </Field>
          <Field label="تصویر شخصیت این اثر" hint="نشانی تصویر ایرانی که خودتان طراحی و در فضای تصاویر بارگذاری کرده‌اید">
            <input className={inputClassName} defaultValue={value.characterImageUrl} dir="ltr" name="characterImageUrl" type="url" placeholder="https://..." />
          </Field>
          <Field label="تصویر فضای افسانه" hint="منظره، شهر یا صحنه‌ای از دنیای همین اثر">
            <input className={inputClassName} defaultValue={value.worldSceneImageUrl} dir="ltr" name="worldSceneImageUrl" type="url" placeholder="https://..." />
          </Field>
        </div>
      </FormSection>

      <FormSection
        title="قیمت‌گذاری"
        description="طلا: ارزش طلا + اجرت ۸٪ + سود ۷٪ اصل طلا + کار هنری؛ مالیات فروش صفر است. نقره: اونس دلاری ÷ ۱۰٫۳۱ × دلار × وزن + کار هنری. بسته‌بندی هر قطعه ۷۰٬۰۰۰؛ ارسال هر سفارش ۱۷۰٬۰۰۰ تومان. در بازار بسته، آخرین نرخ ثبت‌شده بدون افزایش استفاده می‌شود."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="روش قیمت‌گذاری">
            <select
              className={inputClassName}
              defaultValue={value.pricingMode}
              name="pricingMode"
            >
              <option value="DYNAMIC">پویا</option>
              <option value="MANUAL">دستی</option>
            </select>
          </Field>

          <Field label="قیمت دستی (تومان)" hint="مبلغ کامل قطعه با کار هنری؛ بدون بسته‌بندی و ارسال. بسته‌بندی خودکار اضافه می‌شود.">
            <input
              className={inputClassName}
              defaultValue={value.price}
              inputMode="decimal"
              name="price"
            />
          </Field>

          <Field label="قیمت قبل از تخفیف">
            <input
              className={inputClassName}
              defaultValue={value.compareAtPrice}
              inputMode="decimal"
              name="compareAtPrice"
            />
          </Field>

          <Field label="وزن فلز (گرم)">
            <input
              className={inputClassName}
              defaultValue={value.metalWeight}
              inputMode="decimal"
              name="metalWeight"
            />
          </Field>

          {selectedMaterial === "GOLD" ? <>
          <Field label="عنوان عیار">
            <input
              className={inputClassName}
              defaultValue={value.purity}
              name="purity"
              placeholder="18K"
            />
          </Field>

          <Field label="خلوص عددی">
            <input
              className={inputClassName}
              defaultValue={value.purityFineness}
              inputMode="numeric"
              max="1000"
              min="1"
              name="purityFineness"
              type="number"
            />
          </Field>

          </> : <><input type="hidden" name="purity" value="925" /><input type="hidden" name="purityFineness" value="925" /></>}

          <Field label="نوع اجرت">
            <input type="hidden" name="makingChargeType" value={selectedMaterial === "GOLD" ? "PERCENT" : "NONE"} />
            <select
              className={inputClassName}
              value={selectedMaterial === "GOLD" ? "PERCENT" : "NONE"}
              disabled
            >
              <option value="NONE">بدون اجرت</option>
              <option value="FIXED">مبلغ ثابت</option>
              <option value="PER_GRAM">به‌ازای گرم</option>
              <option value="PERCENT">درصدی</option>
              <option value="COMBINED">ترکیبی</option>
            </select>
          </Field>

          <Field label="اجرت ثابت">
            <input
              className={inputClassName}
              value={"0"}
              readOnly
              inputMode="decimal"
              name="makingChargeFixed"
            />
          </Field>

          <Field label="اجرت هر گرم">
            <input
              className={inputClassName}
              value={"0"}
              readOnly
              inputMode="decimal"
              name="makingChargePerGram"
            />
          </Field>

          <Field label="درصد اجرت">
            <input
              className={inputClassName}
              value={selectedMaterial === "GOLD" ? "8" : "0"}
              readOnly
              inputMode="decimal"
              name="makingChargePercent"
            />
          </Field>

          <Field label="هزینه هنری">
            <input
              className={inputClassName}
              defaultValue={value.artisticFee}
              inputMode="decimal"
              name="artisticFee"
            />
          </Field>

          <Field label="درصد سود">
            <input
              className={inputClassName}
              value={selectedMaterial === "GOLD" ? "7" : "0"}
              readOnly
              inputMode="decimal"
              name="profitPercent"
            />
          </Field>

          <Field label="درصد مالیات فروش">
            <input
              className={inputClassName}
              value="0"
              readOnly
              inputMode="decimal"
              name="taxPercent"
            />
          </Field>
        </div>
      </FormSection>

      <FormSection
        title="انتشار و موجودی"
        description="کنترل نمایش محصول در فروشگاه و تعداد قابل فروش"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="موجودی">
            <input
              className={inputClassName}
              defaultValue={value.stock}
              inputMode="numeric"
              min="0"
              name="stock"
              type="number"
            />
          </Field>

          <Field label="وضعیت انتشار">
            <select
              className={inputClassName}
              defaultValue={value.status}
              name="status"
            >
              <option value="DRAFT">پیش‌نویس</option>
              <option value="ACTIVE">منتشرشده</option>
              <option value="OUT_OF_STOCK">ناموجود</option>
              <option value="ARCHIVED">بایگانی‌شده</option>
            </select>
          </Field>

          <label className="flex min-h-12 items-center gap-3 self-end rounded-xl border border-[#cfb45f]/20 bg-[#031a13] px-4 text-sm text-[#d5c5a2]">
            <input
              defaultChecked={value.isFeatured}
              name="isFeatured"
              type="checkbox"
              className="h-4 w-4 accent-[#d8ba62]"
            />
            نمایش در آثار منتخب
          </label>
        </div>
      </FormSection>

      <div className="sticky bottom-4 z-20 flex justify-end rounded-2xl border border-[#d4b75f]/18 bg-[#02160f]/92 p-3 shadow-[0_20px_70px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <button
          disabled={isPending}
          type="submit"
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#b9983f,#efd37b)] px-7 text-sm font-semibold text-[#10251c] transition hover:brightness-105 disabled:cursor-wait disabled:opacity-60"
        >
          <Save className="h-5 w-5" />
          {isPending
            ? "در حال ذخیره…"
            : value.id
              ? "ذخیره تغییرات"
              : "ساخت محصول"}
        </button>
      </div>
    </form>
  );
}
