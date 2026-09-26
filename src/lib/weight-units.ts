export type WeightUnit = "gram" | "soot";

/** Exact decimal conversion; database precision is one soot (0.001 gram). */
export function weightToGrams(raw: string, unit: string = "gram"): string | null {
  if (unit !== "gram" && unit !== "soot") throw new Error("واحد وزن معتبر نیست.");
  const value = raw.trim().replace(/[۰-۹]/g, d => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, d => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[٬,]/g, "").replace(/٫/g, ".");
  if (!value) return null;
  if (value.length > 40 || !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(value))
    throw new Error("وزن را به‌صورت عدد مثبت وارد کنید.");
  const [whole = "0", fraction = ""] = value.split(".");
  const precision = unit === "gram" ? 3 : 0;
  if (/[1-9]/.test(fraction.slice(precision)))
    throw new Error("دقت وزن یک سوت است؛ گرم تا سه رقم اعشار و سوت بدون اعشار وارد شود.");
  const soot = BigInt(whole || "0") * (unit === "gram" ? 1000n : 1n)
    + BigInt(precision ? fraction.slice(0, 3).padEnd(3, "0") : "0");
  if (soot > 9999999999n) throw new Error("وزن واردشده بیش از محدوده مجاز است.");
  return `${soot / 1000n}.${String(soot % 1000n).padStart(3, "0")}`;
}

export function gramsToSoot(grams: string): string {
  const normalized = weightToGrams(grams);
  return normalized === null ? "" : BigInt(normalized.replace(".", "")).toString();
}

export function readWeightGrams(form: FormData, key: string, fallback: string | null = null): string | null {
  const raw = form.get(key);
  const unit = form.get(`${key}Unit`) ?? "gram";
  if ((raw !== null && typeof raw !== "string") || typeof unit !== "string")
    throw new Error("وزن یا واحد وزن معتبر نیست.");
  return weightToGrams(raw ?? "", unit) ?? fallback;
}
