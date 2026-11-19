import http from 'node:http';
import { createReadStream, statSync, writeFileSync } from 'node:fs';
import { resolve, join, extname, normalize, sep } from 'node:path';
import puppeteer from 'puppeteer';

const root = resolve('./game');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg'
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  let pathname = decodeURIComponent(url.pathname);
  if (pathname.endsWith('/')) pathname += 'index.html';
  const file = resolve(join(root, normalize(pathname)));
  if (file !== root && !file.startsWith(root + sep)) {
    res.writeHead(403).end('forbidden');
    return;
  }
  try {
    const stats = statSync(file);
    if (!stats.isFile()) throw new Error();
    res.writeHead(200, {
      'content-type': MIME[extname(file).toLowerCase()] ?? 'application/octet-stream',
      'content-length': stats.size,
      'cache-control': 'no-store'
    });
    createReadStream(file).pipe(res);
  } catch {
    res.writeHead(404).end('not found');
  }
});

server.listen(8080, '127.0.0.1', async () => {
  console.log('Gate test server running on http://127.0.0.1:8080');
  let output = 'CALDERA BAY C1 GATE REPORT\n==========================\n';
  let success = true;

  try {
    const browser = await puppeteer.launch({
      executablePath: '/root/makefun-re/art-tools/chromium/chrome-linux/chrome',
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--enable-unsafe-swiftshader']
    });
    const page = await browser.newPage();
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

    await page.goto('http://localhost:8080', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 2000));

    // Test 1: Photo load & Determinism (two identical loads give same state hash)
    const hash1 = await page.evaluate(() => {
      window.__photo.load({ seed: 77, ticks: 60 });
      return window.__calderaTest.hash();
    });

    const hash2 = await page.evaluate(() => {
      window.__photo.load({ seed: 77, ticks: 60 });
      return window.__calderaTest.hash();
    });

    const determinismPass = (hash1 === hash2);
    output += `1. Determinism check (hash1: ${hash1}, hash2: ${hash2}): ${determinismPass ? 'PASS' : 'FAIL'}\n`;
    if (!determinismPass) success = false;

    // Test 2: Drive tour visits all five districts
    const tour = await page.evaluate(() => {
      return window.__calderaTest.driveTour();
    });
    const tourPass = tour.muelle === 'muelle' && tour.paseo === 'paseo' && tour.verde === 'verde' && tour.ceniza === 'ceniza' && tour.cumbre === 'cumbre';
    output += `2. Drive tour districts check (${JSON.stringify(tour)}): ${tourPass ? 'PASS' : 'FAIL'}\n`;
    if (!tourPass) success = false;

    // Test 3: S2 scenario (steal car, witnessed gunshot raises HEAT 1 with 2 units)
    const s2Res = await page.evaluate(() => {
      window.__photo.load({ seed: 77, ticks: 10 });
      return window.__calderaTest.onFootLoop();
    });
    const s2Pass = s2Res.stolen && s2Res.heat === 1 && s2Res.units === 2;
    output += `3. S2 Scenario check (${JSON.stringify(s2Res)}): ${s2Pass ? 'PASS' : 'FAIL'}\n`;
    if (!s2Pass) success = false;

    // Test 4: Photo renderToDataURL works
    const dataUrl = await page.evaluate(() => {
      return window.__photo.renderToDataURL();
    });
    const photoPass = typeof dataUrl === 'string' && dataUrl.startsWith('data:image/jpeg');
    output += `4. Photo renderToDataURL check: ${photoPass ? 'PASS' : 'FAIL'}\n`;
    if (!photoPass) success = false;

    await browser.close();
    server.close();

    writeFileSync('gate-c1.out', output);
    console.log(output);
    process.exit(success ? 0 : 1);
  } catch (err) {
    console.error('Gate error:', err);
    server.close();
    writeFileSync('gate-c1.out', 'GATE ERROR: ' + err.message);
    process.exit(1);
  }
});
