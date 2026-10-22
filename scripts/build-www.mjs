import { cp, mkdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'www');

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

for (const entry of ['index.html', 'css', 'js', 'assets']) {
  await cp(join(root, entry), join(out, entry), { recursive: true });
}

console.log(`Built www/ from index.html, css/, js/, assets/`);
