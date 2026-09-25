import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 12_000;
const MAX_IMAGE_PIXELS = 40_000_000;
const STORAGE_TIMEOUT_MS = 20_000;

type ImageKind = "jpeg" | "png" | "webp";

type ValidatedImage = {
  bytes: Buffer;
  kind: ImageKind;
  extension: "jpg" | "png" | "webp";
  contentType: "image/jpeg" | "image/png" | "image/webp";
  width: number;
  height: number;
};

export class ProductMediaStorageError extends Error {
  constructor(
    message: string,
    readonly unavailable = false,
  ) {
    super(message);
    this.name = "ProductMediaStorageError";
  }
}

function safeSegment(value: string): string {
  const normalized = value.replace(/[^a-zA-Z0-9_-]/g, "");
  if (!normalized)
    throw new ProductMediaStorageError("شناسه مسیر تصویر معتبر نیست.");
  return normalized;
}

function storageConfig() {
  return {
    url: process.env.SUPABASE_URL?.trim().replace(/\/$/, "") ?? "",
    key: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "",
    bucket: process.env.ELORIA_STORAGE_BUCKET?.trim() ?? "",
  };
}

function allowedImageHosts(): Set<string> {
  const hosts = new Set<string>();

  const supabase = process.env.SUPABASE_URL?.trim();
  if (supabase) {
    try {
      const url = new URL(supabase);
      if (url.protocol === "https:") hosts.add(url.hostname.toLowerCase());
    } catch {}
  }

  for (const raw of (process.env.ELORIA_ALLOWED_IMAGE_HOSTS ?? "").split(",")) {
    const value = raw.trim();
    if (!value) continue;
    try {
      const url = new URL(value.includes("://") ? value : `https://${value}`);
      if (url.protocol === "https:") hosts.add(url.hostname.toLowerCase());
    } catch {}
  }

  return hosts;
}

export function isAllowedProductImageUrl(value: string): boolean {
  const normalized = value.trim();
  if (!normalized || normalized.length > 1000) return false;

  if (normalized.startsWith("/")) {
    // Reject protocol-relative URLs and path confusion using backslashes or
    // control characters. A local asset must be an actual same-origin path.
    return (
      !normalized.startsWith("//") &&
      !normalized.includes("\\") &&
      !/[\u0000-\u001f\u007f]/.test(normalized)
    );
  }

  try {
    const url = new URL(normalized);
    if (url.protocol !== "https:") return false;
    if (process.env.NODE_ENV !== "production") return true;
    return allowedImageHosts().has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function detectKind(bytes: Buffer): ImageKind | null {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  ) {
    return "png";
  }
  if (
    bytes.length >= 12 &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "webp";
  }
  return null;
}

async function validateImage(file: File): Promise<ValidatedImage> {
  if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
    throw new ProductMediaStorageError(
      "حجم هر تصویر باید حداکثر ۸ مگابایت باشد.",
    );
  }

  const original = Buffer.from(await file.arrayBuffer());
  const kind = detectKind(original);
  if (!kind) {
    throw new ProductMediaStorageError(
      "محتوای فایل باید JPEG، PNG یا WebP معتبر باشد.",
    );
  }

  const expectedMime = {
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
  }[kind] as ValidatedImage["contentType"];

  if (file.type && file.type !== expectedMime) {
    throw new ProductMediaStorageError(
      "نوع اعلام‌شده فایل با محتوای واقعی تصویر یکسان نیست.",
    );
  }

  try {
    const source = sharp(original, {
      animated: false,
      failOn: "error",
      limitInputPixels: MAX_IMAGE_PIXELS,
      sequentialRead: true,
    }).rotate();

    const metadata = await source.metadata();
    if (metadata.format !== kind || !metadata.width || !metadata.height) {
      throw new ProductMediaStorageError("قالب یا ابعاد تصویر معتبر نیست.");
    }

    const output = await source
      .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 85, alphaQuality: 100, effort: 5, smartSubsample: true })
      .toBuffer({ resolveWithObject: true });
    const { width, height } = output.info;

    if (
      width <= 0 ||
      height <= 0 ||
      width > MAX_IMAGE_DIMENSION ||
      height > MAX_IMAGE_DIMENSION ||
      width * height > MAX_IMAGE_PIXELS
    ) {
      throw new ProductMediaStorageError(
        "ابعاد یا تعداد پیکسل‌های تصویر بیش از حد مجاز است.",
      );
    }

    if (output.data.length > MAX_IMAGE_BYTES) {
      throw new ProductMediaStorageError(
        "حجم تصویر پردازش‌شده بیش از حد مجاز است.",
      );
    }

    return {
      bytes: output.data,
      kind: "webp",
      extension: "webp",
      contentType: "image/webp",
      width,
      height,
    };
  } catch (error) {
    if (error instanceof ProductMediaStorageError) throw error;
    console.error("[Eloria Media] Image decode or re-encode failed.", error);
    throw new ProductMediaStorageError(
      "تصویر قابل پردازش نیست یا ساختار آن آسیب‌دیده است.",
    );
  }
}

function supabaseHeaders(key: string): Record<string, string> {
  const headers: Record<string, string> = {
    apikey: key,
  };

  // Legacy service_role keys are JWTs.
  // New sb_secret_* keys must not be sent as Bearer JWTs.
  if (!key.startsWith("sb_secret_")) {
    headers.Authorization = `Bearer ${key}`;
  }

  return headers;
}

async function uploadToSupabase(
  objectPath: string,
  image: ValidatedImage,
): Promise<string> {
  const config = storageConfig();
  let response: Response;
  try {
    response = await fetch(
      `${config.url}/storage/v1/object/${encodeURIComponent(config.bucket)}/${objectPath}`,
      {
        method: "POST",
        headers: {
          ...supabaseHeaders(config.key),
          "Content-Type": image.contentType,
          "x-upsert": "false",
        },
        body: new Uint8Array(image.bytes),
        signal: AbortSignal.timeout(STORAGE_TIMEOUT_MS),
      },
    );
  } catch (error) {
    console.error("[Eloria Media] Object storage connection failed.", error);
    throw new ProductMediaStorageError(
      "اتصال به فضای تصاویر برقرار نشد. نشانی SUPABASE_URL و DNS سرور را بررسی کنید.",
      true,
    );
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("[Eloria Media] Supabase upload failed.", {
      status: response.status,
      detail: detail.slice(0, 500),
    });
    const message =
      response.status === 401 || response.status === 403
        ? "فضای تصاویر دسترسی را نپذیرفت. کلید سرور Supabase و دسترسی bucket را بررسی کنید."
        : response.status === 404
          ? "فضای تصاویر پیدا نشد. نام bucket و نشانی Supabase را بررسی کنید."
          : response.status === 413
            ? "فضای تصاویر این حجم فایل را نمی‌پذیرد. عکس کوچک‌تری انتخاب کنید."
            : "فضای تصاویر پاسخ موفق نداد. اتصال سرور به فضای ذخیره‌سازی را بررسی کنید.";
    throw new ProductMediaStorageError(message, response.status >= 500);
  }
  return `${config.url}/storage/v1/object/public/${encodeURIComponent(config.bucket)}/${objectPath}`;
}

async function uploadLocally(
  productId: string,
  filename: string,
  image: ValidatedImage,
): Promise<string> {
  const relativeDirectory = path.join("uploads", "products", productId);
  const absoluteDirectory = path.join(
    process.cwd(),
    "public",
    relativeDirectory,
  );
  await mkdir(absoluteDirectory, { recursive: true });
  await writeFile(path.join(absoluteDirectory, filename), image.bytes, {
    flag: "wx",
  });
  return `/${relativeDirectory.replaceAll(path.sep, "/")}/${filename}`;
}

export async function storeProductImage(
  productIdValue: string,
  file: File,
): Promise<string> {
  const productId = safeSegment(productIdValue);
  const image = await validateImage(file);
  const filename = `${Date.now()}-${randomUUID()}.${image.extension}`;
  const objectPath = `products/${productId}/${filename}`;
  const config = storageConfig();

  const provider = process.env.ELORIA_MEDIA_STORAGE?.trim() || "auto";
  if (!["auto", "database", "supabase", "local"].includes(provider)) {
    throw new ProductMediaStorageError(
      "مقدار ELORIA_MEDIA_STORAGE معتبر نیست.",
    );
  }
  if (provider === "local") {
    if (process.env.NODE_ENV === "production")
      throw new ProductMediaStorageError(
        "ذخیرهٔ محلی فقط در محیط توسعه مجاز است؛ database یا supabase را انتخاب کنید.",
      );
    return uploadLocally(productId, filename, image);
  }
  if (provider !== "database" && config.url && config.key && config.bucket) {
    try {
      return await uploadToSupabase(objectPath, image);
    } catch (error) {
      if (
        provider !== "auto" ||
        !(error instanceof ProductMediaStorageError) ||
        !error.unavailable
      )
        throw error;
      // Only transport/5xx failures use the durable fallback. Invalid credentials,
      // bucket permissions and rejected files remain actionable admin errors.
      console.warn(
        "[Eloria Media] Saving validated image to PostgreSQL because object storage is unavailable.",
      );
    }
  } else if (provider === "supabase") {
    throw new ProductMediaStorageError(
      "SUPABASE_URL، SUPABASE_SERVICE_ROLE_KEY و ELORIA_STORAGE_BUCKET باید تنظیم شوند.",
    );
  }
  const asset = await prisma.productMediaAsset.create({
    data: {
      productId,
      bytes: new Uint8Array(image.bytes),
      contentType: image.contentType,
    },
    select: { id: true },
  });
  return `/api/media/products/${asset.id}`;
}

function generatedProductObjectPath(rawPath: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(rawPath);
  } catch {
    return null;
  }

  const parts = decoded.split("/");
  if (parts.length !== 3 || parts[0] !== "products") return null;

  const [, productId, filename] = parts;
  if (!/^[a-zA-Z0-9_-]+$/.test(productId)) return null;
  if (
    !/^\d{10,}-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:jpg|png|webp)$/i.test(
      filename,
    )
  ) {
    return null;
  }

  return decoded;
}

export async function removeStoredProductImage(
  imageUrl: string,
): Promise<void> {
  const storedId =
    /^\/api\/media\/products\/([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i.exec(
      imageUrl,
    )?.[1];
  if (storedId) {
    await prisma.productMediaAsset
      .deleteMany({ where: { id: storedId } })
      .catch((error) => {
        console.error("[Eloria Media] Unable to remove stored image.", error);
      });
    return;
  }
  const config = storageConfig();
  const publicPrefix =
    config.url && config.bucket
      ? `${config.url}/storage/v1/object/public/${encodeURIComponent(config.bucket)}/`
      : "";

  if (publicPrefix && imageUrl.startsWith(publicPrefix)) {
    const objectPath = generatedProductObjectPath(
      imageUrl.slice(publicPrefix.length),
    );
    if (!objectPath) return;

    const encodedObjectPath = objectPath
      .split("/")
      .map(encodeURIComponent)
      .join("/");
    try {
      const response = await fetch(
        `${config.url}/storage/v1/object/${encodeURIComponent(config.bucket)}/${encodedObjectPath}`,
        {
          method: "DELETE",
          headers: supabaseHeaders(config.key),
          signal: AbortSignal.timeout(STORAGE_TIMEOUT_MS),
        },
      );
      if (!response.ok && response.status !== 404) {
        throw new Error(`Storage delete returned ${response.status}.`);
      }
    } catch (error) {
      console.error("[Eloria Media] Unable to remove Supabase object.", error);
    }
    return;
  }

  if (imageUrl.startsWith("/uploads/products/")) {
    const absolutePath = path.resolve(
      process.cwd(),
      "public",
      imageUrl.replace(/^\//, ""),
    );
    const root = `${path.resolve(process.cwd(), "public", "uploads", "products")}${path.sep}`;
    if (absolutePath.startsWith(root)) {
      await unlink(absolutePath).catch((error) => {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
          console.error("[Eloria Media] Unable to remove local object.", error);
        }
      });
    }
  }
}
