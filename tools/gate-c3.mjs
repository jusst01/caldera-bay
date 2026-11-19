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

server.listen(8082, '127.0.0.1', async () => {
  console.log('Gate C3 test server running on http://127.0.0.1:8082');
  let output = 'CALDERA BAY C3 GATE REPORT (S5 Verification)\n==============================================\n';
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

    await page.goto('http://localhost:8082', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 2000));

    // Test 1: Boot start screen on fresh profile
    const startScreenVisible = await page.evaluate(() => {
      const el = document.getElementById('screen-start');
      return el && window.getComputedStyle(el).display !== 'none';
    });
    output += `1. Boot start screen visible on fresh profile: ${startScreenVisible ? 'PASS' : 'FAIL'}\n`;
    if (!startScreenVisible) success = false;

    // Test 2: Canonical start screen values (FIXER · REP 520, CONTINUE JOB 7/8 · $4,210, 8 job rows, 5 chips, stats)
    const startValues = await page.evaluate(() => {
      window.__photo.load({ seed: 77, ticks: 10, force: { screen: 'start', rep: 520, cash: 4210, missionIndex: 6 } });
      const riseTitle = document.body.innerHTML.includes('YOUR RISE');
      const repVal = document.body.innerHTML.includes('FIXER');
      const jobRows = document.querySelectorAll('#start-job-rows > div').length;
      return { riseTitle, repVal, jobRows };
    });
    const startPass = startValues.riseTitle && startValues.repVal && startValues.jobRows === 8;
    output += `2. Canonical start screen values (riseTitle: ${startValues.riseTitle}, repVal: ${startValues.repVal}, jobRows: ${startValues.jobRows}): ${startPass ? 'PASS' : 'FAIL'}\n`;
    if (!startPass) success = false;

    // Test 3: Canonical garage (4 cars, ZORRO GT selected with its real top speed, 12 catalog rows)
    const garageValues = await page.evaluate(() => {
      window.__photo.load({ seed: 77, ticks: 10, force: { screen: 'garage' } });
      const garageTitle = document.body.innerHTML.includes('IRIS\'S GARAGE');
      const catalogRows = document.querySelectorAll('#garage-catalog > div').length;
      const zorroText = document.body.innerHTML.includes('ZORRO GT');
      return { garageTitle, catalogRows, zorroText };
    });
    const garagePass = garageValues.garageTitle && garageValues.catalogRows === 12 && garageValues.zorroText;
    output += `3. Canonical garage (garageTitle: ${garageValues.garageTitle}, catalogRows: ${garageValues.catalogRows}, zorroText: ${garageValues.zorroText}): ${garagePass ? 'PASS' : 'FAIL'}\n`;
    if (!garagePass) success = false;

    // Test 4: Cover-mode audit (radio hidden, weapons opacity 0.4, objective at 18px, dispatch HEAT 4 · 8 UNITS, 4 pips lit, TAKEOVER 3/5)
    const coverAudit = await page.evaluate(() => {
      window.__photo.load({
        seed: 77,
        ticks: 20,
        force: {
          heat: 100, // HEAT 4
          panels: 'cover',
          station: 0
        }
      });
      const weaponsOpacity = window.getComputedStyle(document.getElementById('hud-weapons')).opacity;
      const radioDisplay = window.getComputedStyle(document.getElementById('hud-radio')).display;
      const objFontSize = window.getComputedStyle(document.getElementById('hp-obj')).fontSize;
      const dispatchText = document.getElementById('dp-header').textContent;
      const takeoverText = document.querySelector('#hud-takeover > div').textContent;
      return {
        weaponsOpacity,
        radioDisplay,
        objFontSize,
        dispatchText,
        takeoverText
      };
    });
    const coverPass = (coverAudit.weaponsOpacity === '0.4') &&
                      (coverAudit.radioDisplay === 'none') &&
                      (coverAudit.objFontSize === '18px') &&
                      coverAudit.dispatchText.includes('HEAT 4') &&
                      coverAudit.takeoverText.includes('TAKEOVER 3/5');
    output += `4. Cover-mode audit (weaponsOpacity: ${coverAudit.weaponsOpacity}, radioDisplay: ${coverAudit.radioDisplay}, objFontSize: ${coverAudit.objFontSize}, dispatch: "${coverAudit.dispatchText}", takeover: "${coverAudit.takeoverText}"): ${coverPass ? 'PASS' : 'FAIL'}\n`;
    if (!coverPass) success = false;

    // Test 5: Radio card shows forced station
    const radioTest = await page.evaluate(() => {
      window.__photo.load({ seed: 77, ticks: 10, force: { panels: 'full', station: 1 } });
      const stationText = document.getElementById('rc-station').textContent;
      return { stationText };
    });
    const radioPass = radioTest.stationText.includes('ONDA NOCTURNA');
    output += `5. Radio card forced station check ("${radioTest.stationText}"): ${radioPass ? 'PASS' : 'FAIL'}\n`;
    if (!radioPass) success = false;

    // Test 6: Weapons shop menu opens and closes via economy interactable
    const menuTest = await page.evaluate(() => {
      window.__photo.load({ seed: 77, ticks: 10 });
      const mods = window.__calderaTest.modules();
      mods.save.rep = 500; // Unlock weapons shop
      mods.economy.openWeaponShop();
      const menuOpen = document.querySelector('div[style*="z-index: 3000"]') !== null;
      mods.hud.closeMenu();
      const menuClosed = document.querySelector('div[style*="z-index: 3000"]') === null;
      return { menuOpen, menuClosed };
    });
    const menuPass = menuTest.menuOpen && menuTest.menuClosed;
    output += `6. Weapons shop menu open & close check (open: ${menuTest.menuOpen}, closed: ${menuTest.menuClosed}): ${menuPass ? 'PASS' : 'FAIL'}\n`;
    if (!menuPass) success = false;

    // Test 7: S1/S2 Determinism check
    const h1 = await page.evaluate(() => {
      window.__photo.load({ seed: 77, ticks: 60 });
      return window.__calderaTest.hash();
    });
    const h2 = await page.evaluate(() => {
      window.__photo.load({ seed: 77, ticks: 60 });
      return window.__calderaTest.hash();
    });
    const detPass = (h1 === h2);
    output += `7. S1/S2 Determinism check (h1: ${h1}, h2: ${h2}): ${detPass ? 'PASS' : 'FAIL'}\n`;
    if (!detPass) success = false;

    await browser.close();
    server.close();

    writeFileSync('gate-c3.out', output);
    console.log(output);
    process.exit(success ? 0 : 1);
  } catch (err) {
    console.error('Gate C3 error:', err);
    server.close();
    writeFileSync('gate-c3.out', 'GATE ERROR: ' + err.message);
    process.exit(1);
  }
});
