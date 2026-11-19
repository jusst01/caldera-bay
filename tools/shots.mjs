import http from 'node:http';
import { createReadStream, statSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
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

server.listen(8085, '127.0.0.1', async () => {
  console.log('Shot renderer server running on http://127.0.0.1:8085');
  mkdirSync('./screenshots', { recursive: true });

  const shots = [
    { name: '1-cover.jpg', query: '?shot=cover' },
    { name: '2-onfoot.jpg', query: '?shot=onfoot' },
    { name: '3-garage.jpg', query: '?shot=garage' },
    { name: '4-start.jpg', query: '?shot=start' }
  ];

  try {
    const browser = await puppeteer.launch({
      executablePath: '/root/makefun-re/art-tools/chromium/chrome-linux/chrome',
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--enable-unsafe-swiftshader']
    });
    const page = await browser.newPage();
    await page.setCacheEnabled(false);
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
    await page.setViewport({ width: 1280, height: 720 });

    for (const shot of shots) {
      console.log(`Rendering ${shot.name} with query ${shot.query}...`);
      await page.goto('about:blank');
      await page.goto(`http://127.0.0.1:8085/${shot.query}`, { waitUntil: 'domcontentloaded' });
      await new Promise(r => setTimeout(r, 3000));

      let quality = 85;
      let buffer = null;
      while (quality >= 60) {
        buffer = await page.screenshot({ type: 'jpeg', quality });
        if (buffer.length <= 256 * 1024) break;
        quality -= 5;
      }

      const outPath = join('./screenshots', shot.name);
      writeFileSync(outPath, buffer);
      console.log(`Saved ${shot.name}: ${buffer.length} bytes (quality ${quality})`);
    }

    await browser.close();
    server.close();
    console.log('All screenshots rendered successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Screenshot error:', err);
    server.close();
    process.exit(1);
  }
});
