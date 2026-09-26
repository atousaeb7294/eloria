"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadAdminProductImageFileAction } from "@/app/[locale]/admin/(protected)/products/assets/actions";

type Entry = {
  file: File;
  preview: string;
  status: "ready" | "uploading" | "saved" | "error";
  message?: string;
};
export function AdminImageUploader({ productId }: { productId: string }) {
  const router = useRouter();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const urls = useRef<string[]>([]);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      urls.current.forEach(URL.revokeObjectURL);
    };
  }, []);
  const update = (index: number, data: Partial<Entry>) => {
    if (mounted.current)
      setEntries((current) =>
        current.map((entry, i) =>
          i === index ? { ...entry, ...data } : entry,
        ),
      );
  };
  return (
    <form
      className="rounded-2xl border border-dashed border-[#d7bc65]/25 bg-black/10 p-4"
      onSubmit={async (event) => {
        event.preventDefault();
        if (busy || !entries.length) return;
        setBusy(true);
        setError("");
        let saved = false;
        for (let index = 0; index < entries.length; index++) {
          if (!mounted.current) break;
          const entry = entries[index];
          if (entry.status === "saved") continue;
          update(index, { status: "uploading", message: "در حال بارگذاری…" });
          try {
            const form = new FormData();
            form.set("image", entry.file);
            const result = await uploadAdminProductImageFileAction(
              productId,
              form,
            );
            update(index, {
              status: result.successful ? "saved" : "error",
              message: result.message,
            });
            saved ||= result.successful;
          } catch {
            update(index, {
              status: "error",
              message:
                "ارتباط قطع شد یا سرور درخواست را نپذیرفت. صفحه را تازه کنید و گالری را قبل از ارسال دوباره بررسی کنید.",
            });
          }
        }
        if (mounted.current) {
          setBusy(false);
          if (saved) router.refresh();
        }
      }}
    >
      <label
        htmlFor="product-image-files"
        className="block text-sm text-[#e2cc91]"
      >
        بارگذاری عکس محصول
      </label>
      <p className="mt-2 text-xs leading-6 text-[#b9ad91]">
        JPG، PNG یا WebP؛ حداکثر ۸ تصویر و ۸ مگابایت برای هر تصویر. عکس‌ها
        یکی‌یکی ذخیره می‌شوند.
      </p>
      <input
        id="product-image-files"
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        disabled={busy}
        className="mt-4 block w-full rounded-xl border border-[#cfb45f]/18 p-3 text-xs"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          setError("");
          if (
            files.length > 8 ||
            files.some((file) => file.size > 8 * 1024 * 1024 || file.size === 0)
          ) {
            setError(
              "حداکثر ۸ تصویر انتخاب کنید؛ هر تصویر باید کمتر از ۸ مگابایت باشد.",
            );
            event.target.value = "";
            return;
          }
          if (
            files.some(
              (file) =>
                file.type &&
                !["image/jpeg", "image/png", "image/webp"].includes(file.type),
            )
          ) {
            setError("فرمت تصویر باید JPG، PNG یا WebP باشد.");
            event.target.value = "";
            return;
          }
          urls.current.forEach(URL.revokeObjectURL);
          urls.current = files.map((file) => URL.createObjectURL(file));
          setEntries(
            files.map((file, i) => ({
              file,
              preview: urls.current[i],
              status: "ready",
            })),
          );
        }}
      />
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-200">
          {error}
        </p>
      )}
      <ul className="mt-3 space-y-3" aria-live="polite">
        {entries.map((entry, index) => (
          <li
            key={`${entry.file.name}-${index}`}
            className="flex items-center gap-3 text-xs"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- Local blob URL for a selected file preview. */}
            <img
              src={entry.preview}
              alt=""
              className="h-14 w-14 rounded-lg object-cover"
            />
            <div className="min-w-0">
              <p className="truncate">{entry.file.name}</p>
              <p
                className={`mt-1 leading-6 ${entry.status === "error" ? "text-red-200" : "text-emerald-100"}`}
              >
                {entry.message ?? "آمادهٔ بارگذاری"}
              </p>
            </div>
          </li>
        ))}
      </ul>
      <button
        type="submit"
        disabled={
          busy ||
          !entries.length ||
          entries.every((entry) => entry.status === "saved")
        }
        className="mt-4 min-h-11 rounded-xl bg-[#d7bb6b] px-5 text-sm font-semibold text-[#10251c] disabled:opacity-50"
      >
        {busy ? "در حال ذخیرهٔ تصاویر…" : "بارگذاری تصاویر"}
      </button>
    </form>
  );
}
