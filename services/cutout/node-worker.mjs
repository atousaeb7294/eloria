import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";
import { MODEL_RELATIVE_PATH } from "./model.mjs";

const MAX_BYTES = 8 * 1024 * 1024;
sharp.concurrency(1);
sharp.cache(false);

// Remove tiny, disconnected mask noise; never erode thin connected cords.
function clearSpecks(alpha, width, height) {
  const visited = new Uint8Array(alpha.length);
  const queue = new Int32Array(alpha.length);
  const minimum = Math.max(4, Math.floor(alpha.length * 0.00015));
  for (let start = 0; start < alpha.length; start++) {
    if (visited[start] || alpha[start] <= 2) continue;
    let head = 0,
      tail = 1;
    queue[0] = start;
    visited[start] = 1;
    while (head < tail) {
      const index = queue[head++],
        x = index % width,
        y = Math.floor(index / width);
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx,
            ny = y + dy,
            next = ny * width + nx;
          if (
            nx < 0 ||
            nx >= width ||
            ny < 0 ||
            ny >= height ||
            visited[next] ||
            alpha[next] <= 2
          )
            continue;
          visited[next] = 1;
          queue[tail++] = next;
        }
    }
    if (tail < minimum) for (let i = 0; i < tail; i++) alpha[queue[i]] = 0;
  }
}

/** Alpha-only edit: keep original product colors, proportions and inner holes. */
export async function composeCutout(rgba, width, height, mask = null) {
  const pixels = width * height;
  if (rgba.length !== pixels * 4 || (mask && mask.length !== pixels))
    throw new Error("INVALID_IMAGE");
  const alpha = new Uint8Array(pixels);
  for (let i = 0; i < pixels; i++)
    alpha[i] = Math.round(rgba[i * 4 + 3] * (mask ? mask[i] / 255 : 1));
  if (mask) clearSpecks(alpha, width, height);
  let visible = 0,
    transparent = 0,
    max = 0;
  let left = width,
    top = height,
    right = -1,
    bottom = -1;
  for (let i = 0; i < pixels; i++) {
    const value = alpha[i];
    if (value >= 16) visible++;
    else transparent++;
    max = Math.max(max, value);
    if (value > 2) {
      const x = i % width,
        y = Math.floor(i / width);
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
  if (
    visible / pixels < 0.008 ||
    transparent / pixels < 0.02 ||
    max < 200 ||
    right < left
  )
    throw new Error("UNCERTAIN_MASK");
  const cropWidth = right - left + 1,
    cropHeight = bottom - top + 1;
  const cropped = Buffer.alloc(cropWidth * cropHeight * 4);
  let radius = 0;
  for (let y = top; y <= bottom; y++)
    for (let x = left; x <= right; x++) {
      const source = y * width + x,
        target = ((y - top) * cropWidth + x - left) * 4;
      cropped[target] = rgba[source * 4];
      cropped[target + 1] = rgba[source * 4 + 1];
      cropped[target + 2] = rgba[source * 4 + 2];
      cropped[target + 3] = alpha[source];
      if (alpha[source] > 2)
        radius = Math.max(
          radius,
          Math.hypot(
            x - left + 0.5 - cropWidth / 2,
            y - top + 0.5 - cropHeight / 2,
          ),
        );
    }
  const naturalSide = Math.max(
    cropWidth,
    cropHeight,
    Math.ceil((2 * radius) / 0.92),
    2,
  );
  const scale = Math.min(1, 1280 / naturalSide);
  const side = Math.min(1280, naturalSide);
  const outWidth = Math.max(1, Math.round(cropWidth * scale));
  const outHeight = Math.max(1, Math.round(cropHeight * scale));
  const jewel = await sharp(cropped, {
    raw: { width: cropWidth, height: cropHeight, channels: 4 },
  })
    .resize(outWidth, outHeight, { fit: "fill", withoutEnlargement: true })
    .png()
    .toBuffer();
  const output = await sharp({
    create: {
      width: side,
      height: side,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: jewel,
        left: Math.floor((side - outWidth) / 2),
        top: Math.floor((side - outHeight) / 2),
      },
    ])
    .png()
    .toBuffer();
  if (output.length > MAX_BYTES) throw new Error("OUTPUT_TOO_LARGE");
  return output;
}

export async function prepare(raw, root = process.cwd()) {
  if (!raw.length || raw.length > MAX_BYTES) throw new Error("INVALID_IMAGE");
  const input = sharp(raw, { limitInputPixels: 40_000_000, failOn: "error" });
  const metadata = await input.metadata();
  if (
    !["png", "jpeg", "webp"].includes(metadata.format) ||
    (metadata.pages ?? 1) !== 1
  )
    throw new Error("INVALID_IMAGE");
  const { data, info } = await input
    .rotate()
    .toColourspace("srgb")
    .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  let transparent = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] < 16) transparent++;
  if (transparent / (width * height) >= 0.02)
    return composeCutout(data, width, height);

  const modelPath = path.join(root, MODEL_RELATIVE_PATH);
  if (!existsSync(modelPath)) throw new Error("MODEL_MISSING");
  const available = process.availableMemory?.() ?? 0;
  if (available > 0 && available < 2304 * 1024 * 1024)
    throw new Error("SERVER_MEMORY");
  const ort = await import("onnxruntime-node");
  const inputSize = 512;
  const rgb = await sharp(data, { raw: { width, height, channels: 4 } })
    .removeAlpha()
    .resize(inputSize, inputSize, { fit: "fill" })
    .raw()
    .toBuffer();
  const plane = inputSize * inputSize,
    values = new Float32Array(plane * 3);
  const mean = [0.485, 0.456, 0.406],
    std = [0.229, 0.224, 0.225];
  for (let i = 0; i < plane; i++)
    for (let c = 0; c < 3; c++)
      values[c * plane + i] = (rgb[i * 3 + c] / 255 - mean[c]) / std[c];
  const session = await ort.InferenceSession.create(modelPath, {
    executionProviders: ["cpu"],
    intraOpNumThreads: 1,
    interOpNumThreads: 1,
    executionMode: "sequential",
    enableCpuMemArena: false,
    logSeverityLevel: 3,
  });
  try {
    const result = await session.run({
      [session.inputNames[0]]: new ort.Tensor("float32", values, [
        1,
        3,
        inputSize,
        inputSize,
      ]),
    });
    const output = result[session.outputNames[0]];
    if (output.data.length !== plane) throw new Error("INVALID_MODEL_OUTPUT");
    const probabilities = Float32Array.from(
      output.data,
      (value) => 1 / (1 + Math.exp(-value)),
    );
    let min = 1,
      max = 0;
    for (const value of probabilities) {
      min = Math.min(min, value);
      max = Math.max(max, value);
    }
    if (max - min < 0.001) throw new Error("UNCERTAIN_MASK");
    const smallMask = Buffer.from(
      probabilities.map((value) =>
        Math.round((255 * (value - min)) / (max - min)),
      ),
    );
    const mask = await sharp(smallMask, {
      raw: { width: inputSize, height: inputSize, channels: 1 },
    })
      .resize(width, height, { fit: "fill" })
      .greyscale()
      .raw()
      .toBuffer();
    return await composeCutout(data, width, height, mask);
  } finally {
    await session.release();
  }
}

async function main() {
  const disconnected = () => process.exit(1);
  process.on("disconnect", disconnected);
  try {
    const chunks = [];
    let size = 0;
    for await (const chunk of process.stdin) {
      size += chunk.length;
      if (size > MAX_BYTES) throw new Error("INVALID_IMAGE");
      chunks.push(chunk);
    }
    const output = await prepare(Buffer.concat(chunks));
    await new Promise((resolve, reject) =>
      process.stdout.write(output, (error) =>
        error ? reject(error) : resolve(),
      ),
    );
  } catch (error) {
    process.exitCode =
      error.message === "MODEL_MISSING"
        ? 3
        : error.message === "SERVER_MEMORY"
          ? 4
          : 2;
    process.stderr.write("Cutout preparation failed.\n");
  } finally {
    process.off("disconnect", disconnected);
    if (process.connected) process.disconnect();
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
)
  await main();
