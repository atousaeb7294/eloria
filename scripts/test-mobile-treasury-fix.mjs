import { readFileSync } from 'node:fs';

const css = readFileSync('src/app/home-design.css', 'utf8');
const home = readFileSync('src/components/eloria-home.tsx', 'utf8');
const labels = [
  'src/components/mobile-site-menu.tsx',
  'src/components/site-footer.tsx',
  'src/components/site-header.tsx',
  'src/components/catalog-category-navigation.tsx',
  'src/lib/treasury-editorial.ts',
].map(file => readFileSync(file, 'utf8')).join('\n');

if (!css.includes('.portal-grid .portal-entry') || !css.includes('.portal-mobile-toggle { display:none; }')) {
  throw new Error('Mobile treasury entry is not configured as a direct link.');
}
if (!home.includes('TreasuryPortal key={t.key} treasury={t} locale={locale} prefetch={false}')) {
  throw new Error('Treasury link prefetch was not disabled for the heavy home route.');
}
if (!labels.includes('گنجینهٔ بافت و اکسسوری')) {
  throw new Error('The weave treasury label was not updated.');
}
console.log('Mobile treasury fix checks passed.');
