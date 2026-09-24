import sharp from "sharp";
import { writeFile } from "node:fs/promises";

// Reuse the real brand asset; ICO embeds PNG at each browser icon size.
const logo = "public/images/brand/eloria-logo.png";
const render = (size) => sharp(logo).resize(size, size, {
  fit: "contain", background: "#02140e",
}).png().toBuffer();
const sizes = [16, 32, 48, 64];
const frames = await Promise.all(sizes.map(render));
const header = Buffer.alloc(6 + 16 * frames.length);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(frames.length, 4);
let offset = header.length;
frames.forEach((frame, index) => {
  const entry = 6 + index * 16;
  header[entry] = sizes[index];
  header[entry + 1] = sizes[index];
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(frame.length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += frame.length;
});
await writeFile("src/app/favicon.ico", Buffer.concat([header, ...frames]));
await writeFile("src/app/icon.png", await render(64));
await writeFile("src/app/apple-icon.png", await render(180));
for (const size of [192, 512]) {
  await writeFile(`public/icons/eloria-${size}.png`, await render(size));
}
