// Render watak chibi sebagai urutan PNG berlatar TELUS (untuk digabung oleh ../render.py).
// Contoh:
//   node render-overlay.js --from 0 --to 192 --out ../out/kartun-babak1     (frame 0..191 => 0..6.4s)
//   node render-overlay.js --png 40,70,90 --out ../out/semak --debug        (gambar semakan + garis panduan)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => {
  if (v.startsWith('--')) a.push([v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]);
  return a;
}, []));

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.text()); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`http://localhost:${port}/src/index.html`);
await page.waitForFunction('window.READY === true', null, { timeout: 60000 });
if (args.debug) await page.evaluate(() => window.debugGuides());
const stage = await page.$('#stage');

async function grab(frame) {
  await page.evaluate((f) => window.renderFrame(f), frame);
  return stage.screenshot({ type: 'png', omitBackground: true });
}

const out = args.out || '../out/kartun';
fs.mkdirSync(out, { recursive: true });
const frames = args.png
  ? String(args.png).split(',').map(Number)
  : Array.from({ length: Number(args.to) - Number(args.from || 0) }, (_, i) => Number(args.from || 0) + i);
const t0 = Date.now();
for (const f of frames) {
  fs.writeFileSync(path.join(out, `f_${String(f).padStart(4, '0')}.png`), await grab(f));
  if (f % 30 === 0) console.log(`frame ${f} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
}
console.log('Siap:', frames.length, 'frame ->', out);
await browser.close();
server.close();
