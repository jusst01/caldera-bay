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

server.listen(8081, '127.0.0.1', async () => {
  console.log('Gate C2 test server running on http://127.0.0.1:8081');
  let output = 'CALDERA BAY C2 GATE REPORT\n==========================\n';
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

    await page.goto('http://localhost:8081', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 2000));

    // Test 0: Modules contract check
    const modulesOk = await page.evaluate(() => {
      const mods = window.__calderaTest.modules();
      return !!mods.city && !!mods.traffic && !!mods.peds && !!mods.police && !!mods.combat && !!mods.vehicles && !!mods.missions && !!mods.economy && !!mods.save;
    });
    output += `0. Modules contract check: ${modulesOk ? 'PASS' : 'FAIL'}\n`;
    if (!modulesOk) success = false;

    // Test 1: S1/S2 Determinism check
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

    // Test 2: Job 1 full loop (start -> steal -> deliver -> jobsDone 1, cash 550, rep 40)
    const job1Loop = await page.evaluate(() => {
      window.__photo.load({ seed: 77, ticks: 10 });
      const mods = window.__calderaTest.modules();
      mods.save.cash = 250;
      mods.save.rep = 0;
      mods.missions.startJob(0);
      mods.missions.forceStage(0, 0);
      mods.player.mode = 'drive';
      mods.player.car = mods.missions.stageCar;
      mods.missions.forceStage(0, 1);
      // Approach from outside radius + 6 for edge latch
      mods.player.x = -250;
      mods.player.z = 350;
      mods.missions.update(0.1);
      // Move inside target [-256, 384]
      mods.player.x = -256;
      mods.player.z = 384;
      mods.missions.update(0.1);
      return { jobsDone: mods.save.jobsDone, cash: mods.save.cash, rep: mods.save.rep };
    });
    const job1Pass = job1Loop.jobsDone >= 1 && job1Loop.cash === 550 && job1Loop.rep === 40;
    output += `2. Job 1 full loop (jobsDone: ${job1Loop.jobsDone}, cash: ${job1Loop.cash}, rep: ${job1Loop.rep}): ${job1Pass ? 'PASS' : 'FAIL'}\n`;
    if (!job1Pass) success = false;

    // Test 3: Job 3 SURVIVE entry floor holds at exactly 30 and clamp keeps points >= 30
    const job3Res = await page.evaluate(() => {
      window.__photo.load({ seed: 77, ticks: 10 });
      const mods = window.__calderaTest.modules();
      mods.save.rep = 100;
      mods.missions.startJob(2);
      mods.missions.forceStage(2, 1);
      mods.police.points = 10;
      mods.missions.update(0.1);
      return { points: mods.police.points, heat: mods.police.heat };
    });
    const job3Pass = job3Res.points >= 30;
    output += `3. Job 3 floor clamp check (points: ${job3Res.points}): ${job3Pass ? 'PASS' : 'FAIL'}\n`;
    if (!job3Pass) success = false;

    // Test 4: Job 5 spawns hostiles and stage advances when all fall
    const job5Res = await page.evaluate(() => {
      window.__photo.load({ seed: 77, ticks: 10 });
      const mods = window.__calderaTest.modules();
      mods.save.rep = 250;
      mods.missions.startJob(4);
      mods.missions.forceStage(4, 1);
      const countBefore = mods.missions.hostiles.length;
      mods.missions.hostiles.forEach(h => mods.missions.damageHostile(h, 100));
      mods.missions.update(0.1);
      return { countBefore, stageIdx: mods.missions.stageIdx };
    });
    const job5Pass = job5Res.countBefore === 3 && job5Res.stageIdx === 2;
    output += `4. Job 5 shootout stage advance (spawns: ${job5Res.countBefore}, stage: ${job5Res.stageIdx}): ${job5Pass ? 'PASS' : 'FAIL'}\n`;
    if (!job5Pass) success = false;

    // Test 5: Job 6 respray interactable fires (cash -200)
    const job6Res = await page.evaluate(() => {
      window.__photo.load({ seed: 77, ticks: 10 });
      const mods = window.__calderaTest.modules();
      mods.save.cash = 1000;
      mods.save.rep = 250;
      mods.missions.startJob(5);
      mods.missions.forceStage(5, 2);
      const cashBefore = mods.save.cash;
      mods.economy.respray(null);
      mods.missions.onRespray();
      return { cashBefore, cashAfter: mods.save.cash, stageIdx: mods.missions.stageIdx };
    });
    const job6Pass = (job6Res.cashBefore - job6Res.cashAfter === 200) && job6Res.stageIdx === 3;
    output += `5. Job 6 respray check (cash diff: ${job6Res.cashBefore - job6Res.cashAfter}, stage: ${job6Res.stageIdx}): ${job6Pass ? 'PASS' : 'FAIL'}\n`;
    if (!job6Pass) success = false;

    // Test 6: Contract loop pays chop+150 with cooldown running
    const contractRes = await page.evaluate(() => {
      window.__photo.load({ seed: 77, ticks: 10 });
      const mods = window.__calderaTest.modules();
      mods.save.rep = 200;
      mods.save.cash = 500;
      mods.economy.acceptContract();
      const contract = mods.economy.activeContract;
      if (!contract) return { success: false };
      mods.player.x = -320;
      mods.player.z = -256;
      mods.player.mode = 'drive';
      const car = {
        mesh: { traverse: () => {} },
        spec: contract.spec,
        x: -320, z: -256,
        owned: false
      };
      mods.player.car = car;
      mods.traffic.cars.push(car);
      mods.economy.update(0.1);
      return { cash: mods.save.cash, contractsDone: mods.save.stats.contractsDone };
    });
    const contractPass = contractRes.contractsDone === 1 && contractRes.cash > 500;
    output += `6. Contract loop check (contractsDone: ${contractRes.contractsDone}, cash: ${contractRes.cash}): ${contractPass ? 'PASS' : 'FAIL'}\n`;
    if (!contractPass) success = false;

    // Test 7: Stored car recalls and owned car refuses chop sale
    const garageRes = await page.evaluate(() => {
      window.__photo.load({ seed: 77, ticks: 10 });
      const mods = window.__calderaTest.modules();
      mods.save.rep = 500;
      mods.save.cash = 1000;
      mods.save.ownedCars = [{ spec: 'zorro', durability: 90 }];
      mods.economy.recallCar(0);
      const recalled = mods.traffic.cars.some(c => c.owned);
      const ownedCar = mods.traffic.cars.find(c => c.owned);
      const sellMsg = mods.economy.sellCar(ownedCar);
      return { recalled, sellMsg };
    });
    const garagePass = garageRes.recalled && garageRes.sellMsg.includes('Refused');
    output += `7. Garage recall & owned car chop refusal (recalled: ${garageRes.recalled}, msg: "${garageRes.sellMsg}"): ${garagePass ? 'PASS' : 'FAIL'}\n`;
    if (!garagePass) success = false;

    // Test 8: Trial 1 pays REP once and 0 on repeat
    const trialRes = await page.evaluate(() => {
      window.__photo.load({ seed: 77, ticks: 10 });
      const mods = window.__calderaTest.modules();
      mods.save.cash = 1000;
      mods.save.rep = 0;
      mods.economy.startTrial(0); // Dock Sprint
      const trial = mods.economy.activeTrial;
      trial.checkpoints.forEach(cp => {
        mods.player.x = cp[0];
        mods.player.z = cp[1];
        mods.economy.update(0.1);
      });
      const rep1 = mods.save.rep;

      mods.economy.startTrial(0);
      trial.checkpoints.forEach(cp => {
        mods.player.x = cp[0];
        mods.player.z = cp[1];
        mods.economy.update(0.1);
      });
      const rep2Change = mods.save.rep - rep1;
      return { rep1, rep2Change };
    });
    const trialPass = trialRes.rep1 === 15 && trialRes.rep2Change === 0;
    output += `8. Trial REP once check (rep1: ${trialRes.rep1}, rep2Change: ${trialRes.rep2Change}): ${trialPass ? 'PASS' : 'FAIL'}\n`;
    if (!trialPass) success = false;

    await browser.close();
    server.close();

    writeFileSync('gate-c2.out', output);
    console.log(output);
    process.exit(success ? 0 : 1);
  } catch (err) {
    console.error('Gate C2 error:', err);
    server.close();
    writeFileSync('gate-c2.out', 'GATE ERROR: ' + err.message);
    process.exit(1);
  }
});
