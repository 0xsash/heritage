#!/usr/bin/env node
// Critic loop, step 1: shoot the fixed camera frames for a round.
//
//   npm run build && npm run preview &        (serve the game)
//   node tools/critic/capture.cjs <round> [--url http://localhost:4173] [--only id,id] [--software]
//
// Writes critic/rounds/<round>/<shot-id>.png. Use --software on machines
// without a GPU (renders with SwiftShader; slow but faithful).
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const args = process.argv.slice(2);
const round = args[0];
if (!round) {
  console.error('usage: capture.cjs <round> [--url URL] [--only id,id] [--software]');
  process.exit(1);
}
const opt = (name, def) => (args.includes(name) ? args[args.indexOf(name) + 1] : def);
const url = opt('--url', 'http://localhost:4173');
const only = opt('--only', '');
const software = args.includes('--software');
const root = path.resolve(__dirname, '../..');
const { shots } = JSON.parse(fs.readFileSync(path.join(__dirname, 'shots.json'), 'utf8'));
const outDir = path.join(root, 'critic', 'rounds', String(round));
fs.mkdirSync(outDir, { recursive: true });

(async () => {
  const browser = await chromium.launch({
    args: software ? ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] : [],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${url}/?autostart&dpr=1&q=high`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.belfort && window.belfort.pose, null, { timeout: 300000 });
  for (const shot of shots) {
    if (only && !only.split(',').includes(shot.id)) continue;
    await page.evaluate((p) => window.belfort.pose(p), shot.pose);
    await page.waitForTimeout(software ? 9000 : 2500); // let the camera, shadows and AO settle
    await page.screenshot({ path: path.join(outDir, `${shot.id}.png`), timeout: 300000 });
    console.log('shot', shot.id);
  }
  if (errors.length) console.log('page errors:\n' + errors.join('\n'));
  await browser.close();
})();
