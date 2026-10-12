import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
const variants = {};
for (const [name, widths] of [['hall', [640, 960, 1672]], ['chest-atlas', [768, 1024]]]) {
  variants[name] = [];
  for (const width of widths) {
    const data = await sharp(`public/images/palace/${name}.webp`).resize({width, withoutEnlargement:true}).webp({quality:80, effort:5}).toBuffer();
    const hash = createHash('sha256').update(data).digest('hex').slice(0,12);
    const url = `/images/palace/${name}-${width}-${hash}.webp`;
    await writeFile(`public${url}`, data);
    variants[name].push({width, url, bytes:data.length});
  }
}
await writeFile('src/components/home-palace/palace-assets.json',JSON.stringify(variants,null,2)+'\n');
console.log(variants);
