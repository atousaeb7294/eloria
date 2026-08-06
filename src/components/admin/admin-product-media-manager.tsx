import { ImagePlus, Save, Star, Trash2, Upload } from "lucide-react";
import {
  addAdminProductImageUrlAction,
  deleteAdminProductImageAction,
  updateAdminProductImageAction,
  uploadAdminProductImagesAction,
} from "@/app/[locale]/admin/(protected)/products/assets/actions";

type ImageValue = { id: string; imageUrl: string; altFa: string | null; altEn: string | null; isPrimary: boolean; displayOrder: number };
const input = "h-11 w-full rounded-xl border border-[#cfb45f]/20 bg-[#031a13] px-3 text-sm text-[#f7e7c2] outline-none placeholder:text-[#887c65] focus:border-[#dfc36d]/60";

export function AdminProductMediaManager({ productId, locale, images, saved, error }: {
  productId: string; locale: "fa" | "en"; images: ImageValue[]; saved: boolean; error?: string;
}) {
  return <section className="overflow-hidden rounded-[26px] border border-[#d0b359]/16 bg-[#041d15]/82">
    <header className="border-b border-[#d0b359]/12 px-5 py-5"><h2 className="flex items-center gap-2 font-semibold text-[#efd782]"><ImagePlus className="size-5"/>گالری محصول</h2><p className="mt-1 text-xs leading-6 text-[#958a73]">آپلود چند تصویر، تعیین ترتیب و انتخاب تصویر اصلی</p></header>
    <div className="space-y-5 p-4 sm:p-6">
      {saved ? <div className="rounded-xl border border-emerald-300/20 bg-emerald-950/20 p-3 text-sm text-emerald-100">تصاویر ذخیره شدند.</div> : null}
      {error ? <div className="rounded-xl border border-red-300/20 bg-red-950/20 p-3 text-sm text-red-100">{error}</div> : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <form action={uploadAdminProductImagesAction.bind(null, productId, locale)} className="rounded-2xl border border-dashed border-[#d7bc65]/25 bg-black/10 p-4">
          <p className="text-sm text-[#e2cc91]">آپلود فایل</p><p className="mt-1 text-xs leading-6 text-[#8f846f]">JPG، PNG یا WebP؛ حداکثر ۸ فایل و ۸ مگابایت برای هر فایل</p>
          <input accept="image/jpeg,image/png,image/webp" className="mt-4 block w-full rounded-xl border border-[#cfb45f]/18 bg-[#031a13] p-3 text-xs text-[#cfc0a3]" multiple name="images" required type="file" />
          <button className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl bg-[linear-gradient(135deg,#a98a36,#e4c96f)] px-5 text-sm font-semibold text-[#10251c]"><Upload className="size-4"/>بارگذاری</button>
        </form>
        <form action={addAdminProductImageUrlAction.bind(null, productId, locale)} className="rounded-2xl border border-[#d7bc65]/16 bg-black/10 p-4">
          <p className="text-sm text-[#e2cc91]">افزودن با آدرس تصویر</p>
          <div className="mt-4 grid gap-3"><input className={input} dir="ltr" name="imageUrl" placeholder="https://... یا /images/..." required/><div className="grid gap-3 sm:grid-cols-2"><input className={input} name="altFa" placeholder="متن جایگزین فارسی"/><input className={input} dir="ltr" name="altEn" placeholder="English alt"/></div></div>
          <button className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl border border-[#d2b65e]/24 bg-[#d0b258]/8 px-5 text-sm text-[#e0c875]"><ImagePlus className="size-4"/>افزودن</button>
        </form>
      </div>
      {images.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{images.map(image => <article key={image.id} className="overflow-hidden rounded-2xl border border-[#d0b359]/14 bg-[#02150f]/80">
        <div className="relative aspect-[4/3] bg-black/20">
          {/* eslint-disable-next-line @next/next/no-img-element -- Admin-entered URLs can be local or remote and must render without a fixed image host allowlist. */}
          <img alt={image.altFa || "تصویر محصول"} className="h-full w-full object-cover" src={image.imageUrl}/>
          {image.isPrimary ? <span className="absolute start-3 top-3 inline-flex items-center gap-1 rounded-full bg-[#061a12]/90 px-2.5 py-1 text-[11px] text-[#f0d478]"><Star className="size-3 fill-current"/>اصلی</span> : null}</div>
        <form action={updateAdminProductImageAction.bind(null, productId, image.id, locale)} className="space-y-3 p-4"><input className={input} defaultValue={image.altFa ?? ""} name="altFa" placeholder="متن فارسی"/><input className={input} defaultValue={image.altEn ?? ""} dir="ltr" name="altEn" placeholder="English alt"/><div className="grid grid-cols-[1fr_auto] gap-3"><input className={input} defaultValue={image.displayOrder} name="displayOrder" type="number"/><label className="flex items-center gap-2 rounded-xl border border-[#cfb45f]/18 bg-[#031a13] px-3 text-xs text-[#cdbd9e]"><input defaultChecked={image.isPrimary} name="isPrimary" type="checkbox"/>اصلی</label></div><button className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#d2b65e]/20 bg-[#d0b258]/8 text-sm text-[#e0c875]"><Save className="size-4"/>ذخیره</button></form>
        <form action={deleteAdminProductImageAction.bind(null, productId, image.id, locale)} className="border-t border-[#d0b359]/10 p-3"><button className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-red-300/15 bg-red-950/15 text-sm text-red-200"><Trash2 className="size-4"/>حذف</button></form>
      </article>)}</div> : <div className="grid min-h-32 place-items-center rounded-2xl border border-dashed border-[#d0b359]/18 text-sm text-[#91866f]">هنوز تصویری ثبت نشده است.</div>}
    </div>
  </section>;
}
