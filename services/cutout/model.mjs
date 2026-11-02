import path from "node:path";
import { downloadVerifiedFile } from "./download.mjs";

export const MODEL_RELATIVE_PATH =
  "services/cutout/models/birefnet-lite-512.onnx";
export const MODEL_URL =
  "https://huggingface.co/studioludens/birefnet-lite-512/resolve/962e67969ec6acec9c19fab76acee4f5e22e990c/onnx/model.onnx";
export const MODEL_SHA256 =
  "1cb0fb360dadd15af77c639085d77a9df67db0c64315560c3de005f676345ac2";

/** Build-time only. Product photos never leave the application server. */
export async function ensureModel(root) {
  return downloadVerifiedFile({
    filename: path.join(root, MODEL_RELATIVE_PATH), url: MODEL_URL,
    sha256: MODEL_SHA256, bytes: 191877254,
  });
}
