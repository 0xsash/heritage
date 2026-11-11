// Copies dist/ to <out>, wrapping binary assets (.glb, .hdr) as JSON
// ({ "b64": ... }) for hosts that only serve common web file types.
// The page must set window.BELFORT_WRAPPED = true (see src/core/assets.ts).
// Usage: node tools/package-wrapped.mjs <out-dir>
import fs from 'node:fs';
import path from 'node:path';

const out = process.argv[2];
if (!out) {
  console.error('usage: node tools/package-wrapped.mjs <out-dir>');
  process.exit(1);
}
const WRAP = new Set(['.glb', '.hdr']);
const files = [];
const walk = (dir, rel = '') => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const src = path.join(dir, e.name), r = path.join(rel, e.name);
    if (e.isDirectory()) { walk(src, r); continue; }
    if (e.name === 'index.html') continue;
    const dst = path.join(out, r);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    if (WRAP.has(path.extname(e.name))) {
      fs.writeFileSync(dst + '.json', JSON.stringify({ b64: fs.readFileSync(src).toString('base64') }));
      files.push(r + '.json');
    } else {
      fs.copyFileSync(src, dst);
      files.push(r);
    }
  }
};
walk('dist');
console.log(JSON.stringify(files));
