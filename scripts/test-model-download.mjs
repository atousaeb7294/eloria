import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { downloadVerifiedFile } from "../services/cutout/download.mjs";

const directory = await mkdtemp(path.join(tmpdir(), "eloria-model-test-"));
const content = Buffer.from("A pinned and verified model, used only as test bytes.");
const sha256 = createHash("sha256").update(content).digest("hex");
const filename = path.join(directory, "model.onnx");
const common = { filename, url: "https://example.invalid/model", sha256, bytes: content.length, log: () => {} };
try {
  let calls = 0;
  await downloadVerifiedFile({ ...common, fetchImpl: async (_url, options) => {
    calls++;
    if (calls === 1) return new Response(content.subarray(0, 10));
    assert.equal(options.headers.Range, "bytes=10-");
    return new Response(content.subarray(10), { status: 206, headers: { "Content-Range": `bytes 10-${content.length - 1}/${content.length}` } });
  }});
  assert.deepEqual(await readFile(filename), content);
  assert.equal(calls, 2);
  await downloadVerifiedFile({ ...common, fetchImpl: () => { throw new Error("Cached model must not download"); } });
  await rm(filename);
  await writeFile(`${filename}.part`, content.subarray(0, 7));
  await downloadVerifiedFile({ ...common, fetchImpl: async () => new Response(content) });
  assert.deepEqual(await readFile(filename), content, "Ignoring Range must replace partial bytes");
  await rm(filename);
  await writeFile(`${filename}.part`, content);
  await downloadVerifiedFile({ ...common, fetchImpl: () => { throw new Error("Complete partial file needs no download"); } });
  await rm(filename);
  await writeFile(`${filename}.part`, content.subarray(0, 7));
  await assert.rejects(downloadVerifiedFile({ ...common, attempts: 1, fetchImpl: async () => new Response(content.subarray(7), { status: 206, headers: { "Content-Range": "bytes 0-1/2" } }) }));
  assert.equal((await readFile(`${filename}.part`)).length, 7);
  await rm(`${filename}.part`);
  await assert.rejects(downloadVerifiedFile({ ...common, attempts: 1, fetchImpl: async () => new Response(Buffer.alloc(content.length, 0)) }));
  await assert.rejects(readFile(filename), "Bad checksum must never install a model");
  await assert.rejects(downloadVerifiedFile({ ...common, attempts: 1, fetchImpl: async () => new Response(Buffer.alloc(content.length + 1, 0)) }));
  await assert.rejects(readFile(filename), "Oversized input must never install a model");
  console.log("PASS: model resume, cached model, completed partial, ignored Range, invalid range, checksum and size limits.");
} finally { await rm(directory, { recursive: true, force: true }); }
