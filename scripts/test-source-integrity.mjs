import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const conflicts = [];
function inspect(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) {
      if (!['node_modules', 'generated', '.next', '.git'].includes(entry.name)) inspect(file);
    } else if (/\.(?:tsx?|[cm]?js|css|scss|json|prisma|sql)$/.test(entry.name)) {
      if (/^(?:<{7} .*|={7}|>{7} .*)\r?$/m.test(readFileSync(file, 'utf8'))) {
        conflicts.push(relative(process.cwd(), file));
      }
    }
  }
}
for (const directory of ['src', 'scripts', 'tests', 'prisma']) inspect(directory);
if (conflicts.length) {
  console.error('Unresolved Git merge markers:\n' + conflicts.join('\n'));
  process.exitCode = 1;
} else {
  console.log('PASS: no unresolved Git merge markers in application, tests or schema.');
}
