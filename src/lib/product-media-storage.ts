import { createHash, createHmac, randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

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

function s3Config() {
  return {
    endpoint: process.env.ELORIA_S3_ENDPOINT?.replace(/\/$/, "") ?? "",
    region: process.env.ELORIA_S3_REGION?.trim() || "us-east-1",
    bucket: process.env.ELORIA_S3_BUCKET?.trim() ?? "",
    accessKey: process.env.ELORIA_S3_ACCESS_KEY?.trim() ?? "",
    secretKey: process.env.ELORIA_S3_SECRET_KEY?.trim() ?? "",
    publicUrl: process.env.ELORIA_S3_PUBLIC_URL?.replace(/\/$/, "") ?? "",
  };
}

function hmac(key: Buffer | string, value: string): Buffer {
  return createHmac("sha256", key).update(value).digest();
}

function awsEncodePath(value: string): string {
  return value.split("/").map(encodeURIComponent).join("/");
}

async function signedS3Request(
  method: "PUT" | "DELETE",
  objectPath: string,
  body: Buffer,
  contentType?: string,
): Promise<Response> {
  const config = s3Config();
  const endpoint = new URL(config.endpoint);
  const canonicalUri = `/${encodeURIComponent(config.bucket)}/${awsEncodePath(objectPath)}`;
  const timestamp = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
  const date = timestamp.slice(0, 8);
  const payloadHash = createHash("sha256").update(body).digest("hex");
  const signedHeaderNames = contentType
    ? "content-type;host;x-amz-content-sha256;x-amz-date"
    : "host;x-amz-content-sha256;x-amz-date";
  const canonicalHeaders = [
    ...(contentType ? [`content-type:${contentType}`] : []),
    `host:${endpoint.host}`,
    `x-amz-content-sha256:${payloadHash}`,
    `x-amz-date:${timestamp}`,
    "",
  ].join("\n");
  const canonicalRequest = [
    method,
    canonicalUri,
    "",
    canonicalHeaders,
    signedHeaderNames,
    payloadHash,
  ].join("\n");
  const scope = `${date}/${config.region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    timestamp,
    scope,
    createHash("sha256").update(canonicalRequest).digest("hex"),
  ].join("\n");
  const dateKey = hmac(`AWS4${config.secretKey}`, date);
  const regionKey = hmac(dateKey, config.region);
  const serviceKey = hmac(regionKey, "s3");
  const signingKey = hmac(serviceKey, "aws4_request");
  const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex");

  return fetch(`${config.endpoint}${canonicalUri}`, {
    method,
    headers: {
      ...(contentType ? { "Content-Type": contentType } : {}),
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": timestamp,
      Authorization: `AWS4-HMAC-SHA256 Credential=${config.accessKey}/${scope}, SignedHeaders=${signedHeaderNames}, Signature=${signature}`,
    },
    ...(method === "PUT" ? { body: new Uint8Array(body) } : {}),
    signal: AbortSignal.timeout(STORAGE_TIMEOUT_MS),
  });
}

function s3Configured(): boolean {
  const config = s3Config();
  return Boolean(config.endpoint && config.bucket && config.accessKey && config.secretKey && config.publicUrl);
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

  const s3PublicUrl = process.env.ELORIA_S3_PUBLIC_URL?.trim();
  if (s3PublicUrl) {
    try {
      const url = new URL(s3PublicUrl);
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
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
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
    throw new ProductMediaStorageError("حجم هر تصویر باید حداکثر ۸ مگابایت باشد.");
  }

  const original = Buffer.from(await file.arrayBuffer());
  const kind = detectKind(original);
  if (!kind) {
    throw new ProductMediaStorageError("محتوای فایل باید JPEG، PNG یا WebP معتبر باشد.");
  }

  const expectedMime = {
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
  }[kind] as ValidatedImage["contentType"];

  if (file.type && file.type !== expectedMime) {
    throw new ProductMediaStorageError("نوع اعلام‌شده فایل با محتوای واقعی تصویر یکسان نیست.");
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

    let pipeline = source;
    if (kind === "jpeg") {
      pipeline = pipeline.jpeg({ quality: 92, mozjpeg: true });
    } else if (kind === "png") {
      pipeline = pipeline.png({ compressionLevel: 9, adaptiveFiltering: true });
    } else {
      pipeline = pipeline.webp({ quality: 92, smartSubsample: true });
    }

    const output = await pipeline.toBuffer({ resolveWithObject: true });
    const { width, height } = output.info;

    if (
      width <= 0 ||
      height <= 0 ||
      width > MAX_IMAGE_DIMENSION ||
      height > MAX_IMAGE_DIMENSION ||
      width * height > MAX_IMAGE_PIXELS
    ) {
      throw new ProductMediaStorageError("ابعاد یا تعداد پیکسل‌های تصویر بیش از حد مجاز است.");
    }

    if (output.data.length > MAX_IMAGE_BYTES) {
      throw new ProductMediaStorageError("حجم تصویر پردازش‌شده بیش از حد مجاز است.");
    }

    return {
      bytes: output.data,
      kind,
      extension: kind === "jpeg" ? "jpg" : kind,
      contentType: expectedMime,
      width,
      height,
    };
  } catch (error) {
    if (error instanceof ProductMediaStorageError) throw error;
    console.error("[Eloria Media] Image decode or re-encode failed.", error);
    throw new ProductMediaStorageError("تصویر قابل پردازش نیست یا ساختار آن آسیب‌دیده است.");
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

async function uploadToSupabase(objectPath: string, image: ValidatedImage): Promise<string> {
  const config = storageConfig();
  const response = await fetch(
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

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("[Eloria Media] Supabase upload failed.", {
      status: response.status,
      detail: detail.slice(0, 500),
    });
    throw new ProductMediaStorageError(
      "آپلود تصویر در فضای ذخیره‌سازی انجام نشد.",
    );
  }
  return `${config.url}/storage/v1/object/public/${encodeURIComponent(config.bucket)}/${objectPath}`;
}

async function uploadToS3(objectPath: string, image: ValidatedImage): Promise<string> {
  const response = await signedS3Request("PUT", objectPath, image.bytes, image.contentType);
  if (!response.ok) {
    console.error("[Eloria Media] S3 upload failed.", { status: response.status });
    throw new ProductMediaStorageError("آپلود تصویر در فضای ابری داخلی انجام نشد.");
  }
  return `${s3Config().publicUrl}/${awsEncodePath(objectPath)}`;
}

async function uploadLocally(
  productId: string,
  filename: string,
  image: ValidatedImage,
): Promise<string> {
  const relativeDirectory = path.join("uploads", "products", productId);
  const absoluteDirectory = path.join(process.cwd(), "public", relativeDirectory);
  await mkdir(absoluteDirectory, { recursive: true });
  await writeFile(path.join(absoluteDirectory, filename), image.bytes, { flag: "wx" });
  return `/${relativeDirectory.replaceAll(path.sep, "/")}/${filename}`;
}

export async function storeProductImage(productIdValue: string, file: File): Promise<string> {
  const productId = safeSegment(productIdValue);
  const image = await validateImage(file);
  const filename = `${Date.now()}-${randomUUID()}.${image.extension}`;
  const objectPath = `products/${productId}/${filename}`;
  const config = storageConfig();

  if (s3Configured()) return uploadToS3(objectPath, image);
  if (config.url && config.key && config.bucket) return uploadToSupabase(objectPath, image);
  if (process.env.NODE_ENV === "production") {
    throw new ProductMediaStorageError(
      "برای آپلود روی سرور، Object Storage پارس‌پک یا Supabase Storage را تنظیم کنید.",
    );
  }
  return uploadLocally(productId, filename, image);
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

export async function removeStoredProductImage(imageUrl: string): Promise<void> {
  const domesticStorage = s3Config();
  const domesticPrefix = s3Configured() ? `${domesticStorage.publicUrl}/` : "";
  if (domesticPrefix && imageUrl.startsWith(domesticPrefix)) {
    const objectPath = generatedProductObjectPath(imageUrl.slice(domesticPrefix.length));
    if (!objectPath) return;
    try {
      const response = await signedS3Request("DELETE", objectPath, Buffer.alloc(0));
      if (!response.ok && response.status !== 404) throw new Error(`S3 delete returned ${response.status}.`);
    } catch (error) {
      console.error("[Eloria Media] Unable to remove S3 object.", error);
    }
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
    const absolutePath = path.resolve(process.cwd(), "public", imageUrl.replace(/^\//, ""));
    const root = `${path.resolve(process.cwd(), "public", "uploads", "products")}${path.sep}`;
    if (absolutePath.startsWith(root)) {
      await unlink(absolutePath).catch(error => {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
          console.error("[Eloria Media] Unable to remove local object.", error);
        }
      });
    }
  }
}
