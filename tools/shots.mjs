import puppeteer from "puppeteer-core";
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, join, extname, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFile } from 'node:fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoDir = join(__dirname, '../');
const gameDir = join(repoDir, 'game');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
};

const server = createServer((request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost');
  let pathname = decodeURIComponent(url.pathname);
  if (pathname.endsWith('/')) pathname += 'index.html';
  const file = resolve(join(gameDir, normalize(pathname)));

  try {
    const stats = statSync(file);
    if (!stats.isFile()) throw new Error('not a file');
    response.writeHead(200, {
      'content-type': MIME[extname(file).toLowerCase()] ?? 'application/octet-stream',
    });
    createReadStream(file).pipe(response);
  } catch (err) {
    response.writeHead(404).end('not found');
  }
});
server.listen(8081);

const browser = await puppeteer.launch({
  executablePath: "/root/makefun-re/art-tools/chromium/chrome-linux/chrome",
  args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio']
});
const page = await browser.newPage();
page.on('console', msg => console.log('PAGE LOG:', msg.text()));
await page.setViewport({ width: 1280, height: 720 });

const CANONICAL_SAVE = {
  version: 1,
  cash: 4210,
  rep: 520,
  missionIndex: 6,
  jobsDone: 6,
  takeover: { muelle: 100, paseo: 80, verde: 60, ceniza: 30, cumbre: 10 },
  ammo: [
    [0, 0],
    [12, 48],
    [30, 90],
    [6, 18]
  ],
  armour: 60,
  ownedCars: [
    { spec: 'zorro-gt', durability: 86 },
    { spec: 'corsario-s', durability: 91 },
    { spec: 'mula-4x4', durability: 74 },
    { spec: 'sirena', durability: 100 }
  ],
  stats: {
    carsStolen: 41,
    topSpeed: 247,
    maxHeat: 5,
    contractsDone: 9,
    trialsWon: 4,
    jobsFailed: 1
  },
  playtimeSec: 8712,
  radioStation: 0,
  lastSaveClock: '14:32'
};

async function savePageScreenshot(filename) {
  const buf = await page.screenshot({ type: 'png' });
  await writeFile(join(repoDir, 'screenshots', filename), buf);
  const st = statSync(join(repoDir, 'screenshots', filename));
  console.log(`Saved ${filename}: ${st.size} bytes`);
  if (st.size > 262144) {
    throw new Error(`${filename} exceeds 262,144 bytes (${st.size})`);
  }
}

// 1. COVER
console.log('--- COVER ---');
await page.goto('http://localhost:8081/?seed=77');
await page.waitForFunction(() => window.__photo !== undefined && window.__calderaTest !== undefined);
await page.evaluate((canonical) => {
  window.__calderaTest.stageCover(canonical);
  window.__debug.hud.setPanels('cover');
}, CANONICAL_SAVE);

const coverUnitsInfo = await page.evaluate(() => window.__calderaTest.checkCoverUnits());
console.log('Cover police units screen positions:', JSON.stringify(coverUnitsInfo, null, 2));
const visibleCount = coverUnitsInfo.filter(u => u.inFrustum).length;
console.log('Visible units in frustum:', visibleCount);
if (visibleCount < 3) {
  throw new Error(`Cover requires >=3 police units in camera frustum, found ${visibleCount}`);
}
await savePageScreenshot('cover.png');

// 2. GAMEPLAY 1 (on-foot scene with peds and stealable car prompt)
console.log('--- GAMEPLAY 1 ---');
await page.goto('http://localhost:8081/?seed=77');
await page.waitForFunction(() => window.__calderaTest !== undefined);
await page.evaluate((canonical) => {
  window.__calderaTest.stageGameplay1(canonical);
  window.__debug.hud.setPanels('full');
}, CANONICAL_SAVE);

const gp1Peds = await page.evaluate(() => window.__calderaTest.checkGameplay1Peds());
console.log('Visible Gameplay-1 peds in frustum (5-15m):', JSON.stringify(gp1Peds, null, 2));
if (gp1Peds.length < 4) {
  throw new Error(`Gameplay-1 requires >= 4 visible peds in frustum (5-15m), found ${gp1Peds.length}`);
}

const gp1State = await page.evaluate(() => {
  const state = window.__photo.state();
  const car = window.__calderaTest.stealableCar;
  const dist = Math.hypot(car.x - state.player.x, car.z - state.player.z);
  console.log('Stealable car distance:', dist);
  const promptEl = document.getElementById('prompt');
  return { onFoot: state.player.onFoot, nearCar: dist <= 10.0 ? 1 : 0, promptText: promptEl?.textContent || '', promptDisplay: promptEl?.style.display };
});
console.log('Gameplay-1 asserted state:', gp1State);
if (!gp1State.onFoot || gp1State.nearCar === 0 || gp1State.promptDisplay !== 'block') {
  throw new Error('Gameplay-1 assertions failed: ' + JSON.stringify(gp1State));
}
await savePageScreenshot('gameplay-1.png');

// 3. GAMEPLAY 2 (Garage)
console.log('--- GAMEPLAY 2 ---');
await page.goto('http://localhost:8081/?shot=end&seed=12');
await page.waitForFunction(() => window.__debug !== undefined);
await page.evaluate((canonical) => {
  window.__calderaTest.save = canonical;
  window.__debug.gameScreens.showGarage(true);
  window.__debug.updateGaragePreview('zorro-gt');
}, CANONICAL_SAVE);

await page.waitForFunction(() => {
  const garageEl = document.getElementById('screen-garage');
  return garageEl && garageEl.style.display !== 'none';
}, { timeout: 30000 });

await savePageScreenshot('gameplay-2.png');

// 4. GAMEPLAY 3 (Start)
console.log('--- GAMEPLAY 3 ---');
await page.goto('http://localhost:8081/?shot=start&seed=5');
await page.waitForFunction(() => window.__debug !== undefined);
await page.evaluate((canonical) => {
  window.__calderaTest.save = canonical;
  window.__debug.gameScreens.showStart(true);
}, CANONICAL_SAVE);

await page.waitForFunction(() => {
  const startEl = document.getElementById('screen-start');
  return startEl && startEl.style.display !== 'none';
}, { timeout: 30000 });

await savePageScreenshot('gameplay-3.png');

await browser.close();
server.close();
console.log('All screenshots captured and verified successfully!');
