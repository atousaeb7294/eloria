import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export class ProductMediaStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProductMediaStorageError";
  }
}

function safeSegment(value: string): string {
  const normalized = value.replace(/[^a-zA-Z0-9_-]/g, "");
  if (!normalized) throw new ProductMediaStorageError("شناسه مسیر تصویر معتبر نیست.");
  return normalized;
}

function storageConfig() {
  return {
    url: process.env.SUPABASE_URL?.replace(/\/$/, "") ?? "",
    key: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "",
    bucket: process.env.ELORIA_STORAGE_BUCKET?.trim() ?? "",
  };
}

function validateImage(file: File): string {
  const extension = ALLOWED_TYPES.get(file.type);
  if (!extension) throw new ProductMediaStorageError("فرمت تصویر باید JPG، PNG یا WebP باشد.");
  if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
    throw new ProductMediaStorageError("حجم هر تصویر باید حداکثر ۸ مگابایت باشد.");
  }
  return extension;
}

async function uploadToSupabase(objectPath: string, file: File): Promise<string> {
  const config = storageConfig();
  const response = await fetch(
    `${config.url}/storage/v1/object/${encodeURIComponent(config.bucket)}/${objectPath}`,
    {
      method: "POST",
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        "Content-Type": file.type,
        "x-upsert": "false",
      },
      body: await file.arrayBuffer(),
    },
  );
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new ProductMediaStorageError(
      `آپلود تصویر انجام نشد${detail ? `: ${detail.slice(0, 150)}` : "."}`,
    );
  }
  return `${config.url}/storage/v1/object/public/${encodeURIComponent(config.bucket)}/${objectPath}`;
}

async function uploadLocally(productId: string, filename: string, file: File): Promise<string> {
  const relativeDirectory = path.join("uploads", "products", productId);
  const absoluteDirectory = path.join(process.cwd(), "public", relativeDirectory);
  await mkdir(absoluteDirectory, { recursive: true });
  await writeFile(path.join(absoluteDirectory, filename), Buffer.from(await file.arrayBuffer()));
  return `/${relativeDirectory.replaceAll(path.sep, "/")}/${filename}`;
}

export async function storeProductImage(productIdValue: string, file: File): Promise<string> {
  const productId = safeSegment(productIdValue);
  const extension = validateImage(file);
  const filename = `${Date.now()}-${randomUUID()}.${extension}`;
  const objectPath = `products/${productId}/${filename}`;
  const config = storageConfig();

  if (config.url && config.key && config.bucket) return uploadToSupabase(objectPath, file);
  if (process.env.NODE_ENV === "production") {
    throw new ProductMediaStorageError(
      "برای آپلود روی سرور، متغیرهای Supabase Storage را در .env تنظیم کنید.",
    );
  }
  return uploadLocally(productId, filename, file);
}

export async function removeStoredProductImage(imageUrl: string): Promise<void> {
  const config = storageConfig();
  const publicPrefix =
    config.url && config.bucket
      ? `${config.url}/storage/v1/object/public/${encodeURIComponent(config.bucket)}/`
      : "";

  if (publicPrefix && imageUrl.startsWith(publicPrefix)) {
    const objectPath = imageUrl.slice(publicPrefix.length);
    await fetch(
      `${config.url}/storage/v1/object/${encodeURIComponent(config.bucket)}/${objectPath}`,
      {
        method: "DELETE",
        headers: { apikey: config.key, Authorization: `Bearer ${config.key}` },
      },
    ).catch(() => undefined);
    return;
  }

  if (imageUrl.startsWith("/uploads/products/")) {
    const absolutePath = path.resolve(process.cwd(), "public", imageUrl.replace(/^\//, ""));
    const root = path.resolve(process.cwd(), "public", "uploads", "products");
    if (absolutePath.startsWith(root)) await unlink(absolutePath).catch(() => undefined);
  }
}
