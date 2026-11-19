import * as THREE from 'three';
import { createCity, districtAt, mulberry32 } from './city.js';
import { ROSTER, createCarMesh, getVehicleSpec } from './vehicles.js';
import { createTraffic } from './traffic.js';
import { createPedestrians } from './pedestrians.js';
import { createCombat } from './combat.js';
import { createPolice, CRIME_POINTS } from './police.js';
import { loadSave, storeSave, emptySave, canonicalSave, takeoverCount } from './save.js';
import { createMissions, JOBS } from './missions.js';
import { createEconomy, SHOP_POS, TRIALS } from './economy.js';

const container = document.getElementById('game');
const statusEl = document.getElementById('status');
const hudRoot = document.getElementById('hud-root');

const renderer = new THREE.WebGLRenderer({ canvas: container, antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x11141b);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.5, 2000);

let seed = 77;
let city = createCity(scene, seed);
let traffic = createTraffic(scene, seed);
let peds = createPedestrians(scene, seed);
let combat = createCombat(hudRoot);
let police = createPolice(scene);

// Save state
let save = loadSave() || emptySave();

function changed() {
  persistSave();
}

// Context for missions and economy
const ctx = {
  scene,
  get player() { return player; },
  get playerMesh() { return playerMesh; },
  get traffic() { return traffic; },
  get peds() { return peds; },
  get police() { return police; },
  get combat() { return combat; },
  get save() { return save; },
  get city() { return city; },
  get missions() { return missions; },
  get economy() { return economy; },
  addCash(amt) { save.cash += amt; changed(); },
  notify(text) {
    lastEvent = { text, time: simTime };
    console.log('NOTIFY:', text);
  },
  dialogue(speaker, text) {
    dialogueLine = { speaker, text, time: simTime };
  },
  changed,
  openMenu,
  openGarage
};

let missions = createMissions(ctx);
let economy = createEconomy(ctx);

// Interactables registry
let interactables = [];
function registerInteractable(item) {
  interactables.push(item);
}
economy.registerInteractables(registerInteractable);

// Player state
let player = {
  mode: 'foot', // 'foot' or 'drive'
  x: 0,
  z: 0,
  heading: 0,
  speed: 0,
  car: null,
  health: 100
};

// Player mesh on foot
const playerGeo = new THREE.CapsuleGeometry(0.4, 1.2, 4, 8);
const playerMat = new THREE.MeshStandardMaterial({ color: 0x3366cc, roughness: 0.7, flatShading: true });
const playerMesh = new THREE.Mesh(playerGeo, playerMat);
playerMesh.castShadow = true;
scene.add(playerMesh);

// Notification and dialogue state
let lastEvent = { text: '', time: -999 };
let dialogueLine = { speaker: '', text: '', time: -999 };

function applySaveToWorld() {
  combat.health = 100;
  combat.armour = save.armour;
  if (save.ammo) {
    for (let i = 0; i < 4; i++) {
      if (save.ammo[i]) {
        combat.ammo[i][0] = save.ammo[i][0];
        combat.ammo[i][1] = save.ammo[i][1];
      }
    }
  }
}
applySaveToWorld();

function gatherSave() {
  save.armour = combat.armour;
  save.ammo = combat.ammo.map(a => [...a]);
}

function persistSave() {
  if (window.__isPhotoLoading) return;
  gatherSave();
  storeSave(save);
}

// Keys state
const keys = { w: false, a: false, s: false, d: false, e: false, space: false };
window.addEventListener('keydown', e => {
  if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') keys.w = true;
  if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') keys.s = true;
  if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') keys.a = true;
  if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') keys.d = true;
  if (e.key === 'e' || e.key === 'E') handleInteractOrCarjack();
  if (e.key === 'f' || e.key === 'F') handleMug();
  if (e.key === '1') combat.setSlot(0);
  if (e.key === '2') combat.setSlot(1);
  if (e.key === '3') combat.setSlot(2);
  if (e.key === '4') combat.setSlot(3);
  if (e.key === 'F5') { persistSave(); notify('Game Saved.'); }
  if (e.key === ' ') {
    if (player.mode === 'foot') {
      combat.shoot(() => {
        lastGunshotTime = simTime;
        const witnesses = peds.witnessesAt(player.x, player.z, 30) + 1;
        police.addPoints(CRIME_POINTS.gunshot, witnesses > 0, witnesses, 0);
      });
    }
  }
});
window.addEventListener('keyup', e => {
  if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') keys.w = false;
  if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') keys.s = false;
  if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') keys.a = false;
  if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') keys.d = false;
});

let simTime = 0;
let lastGunshotTime = -999;

function handleInteractOrCarjack() {
  if (player.mode === 'foot') {
    // Check interactables first
    let closestInteractable = null;
    let minDist = 3.0;

    // Include mission start interactable if available
    const missionInteractable = missions.armJobStart();
    const allInteractables = [...interactables];
    if (missionInteractable) allInteractables.push(missionInteractable);

    for (const item of allInteractables) {
      const dist = Math.hypot(item.pos[0] - player.x, item.pos[1] - player.z);
      if (dist <= (item.radius || 6) && dist < minDist) {
        minDist = dist;
        closestInteractable = item;
      }
    }

    if (closestInteractable) {
      closestInteractable.action();
      return;
    }

    // Otherwise carjack traffic car
    for (const c of traffic.cars) {
      const dist = Math.hypot(c.x - player.x, c.z - player.z);
      if (dist < 6.0) {
        player.mode = 'drive';
        player.car = c;
        traffic.markStolen(c);
        scene.remove(playerMesh);
        const witnesses = peds.witnessesAt(player.x, player.z, 30) + 1;
        police.addPoints(CRIME_POINTS.carjack, witnesses > 0, witnesses, 0);
        break;
      }
    }
  } else {
    player.mode = 'foot';
    player.x = player.car.x + 2;
    player.z = player.car.z;
    playerMesh.position.set(player.x, 0.9, player.z);
    scene.add(playerMesh);
    player.car = null;
  }
}

function handleMug() {
  if (player.mode !== 'foot') return;
  for (const p of peds.peds) {
    if (p.hp > 0 && !p.mugged) {
      const dist = Math.hypot(p.x - player.x, p.z - player.z);
      if (dist <= 2.3) {
        p.mugged = true;
        p.state = 'flee';
        const cashStolen = p.wallet || 20;
        save.cash += cashStolen;
        notify(`Mugged pedestrian for $${cashStolen}`);
        const witnesses = peds.witnessesAt(player.x, player.z, 30) + 1;
        police.addPoints(CRIME_POINTS.mug, witnesses > 0, witnesses, 0);
        changed();
        break;
      }
    }
  }
}

function onBustedOrWasted(type) {
  missions.onPlayerDown();
  if (type === 'busted') {
    save.cash = Math.floor(save.cash * 0.9);
    notify('BUSTED: -10% cash penalty');
  } else {
    save.cash = Math.max(0, save.cash - 200);
    for (let s = 1; s <= 3; s++) {
      combat.ammo[s][1] = Math.floor(combat.ammo[s][1] / 2);
    }
    combat.health = 100;
    notify('WASTED: -$200 penalty, half ammo lost');
  }
  police.respray();
  player.x = SHOP_POS.safehouse[0];
  player.z = SHOP_POS.safehouse[1];
  if (player.mode === 'drive' && player.car) {
    const idx = traffic.cars.indexOf(player.car);
    if (idx >= 0) traffic.cars.splice(idx, 1);
    scene.remove(player.car.mesh);
  }
  player.mode = 'foot';
  player.car = null;
  scene.add(playerMesh);
  playerMesh.position.set(player.x, 0.9, player.z);
  persistSave();
}

// Menus and UI overlays
let activeMenuEl = null;
function openMenu({ title, build }) {
  closeMenu();
  const menuData = build();
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:rgba(20,20,28,0.95); color:#fff; padding:20px; border-radius:8px; border:1px solid #444; z-index:1000; min-width:320px; font-family:sans-serif;';

  let html = `<h2 style="margin:0 0 10px;font-size:18px;color:#f2b441;">${title}</h2>`;
  if (menuData.subtitle) html += `<div style="margin-bottom:15px;color:#aaa;font-size:14px;">${menuData.subtitle}</div>`;
  html += `<div style="display:flex;flex-direction:column;gap:8px;">`;
  menuData.rows.forEach((row, idx) => {
    html += `<button data-idx="${idx}" style="padding:10px;background:#2a3442;color:#fff;border:none;border-radius:4px;cursor:pointer;text-align:left;font-size:14px;">[${idx+1}] ${row.label}</button>`;
  });
  html += `</div>`;
  el.innerHTML = html;
  document.body.appendChild(el);
  activeMenuEl = el;

  el.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-idx'));
      const row = menuData.rows[idx];
      const res = row.action();
      if (res === 'close') {
        closeMenu();
      } else {
        if (typeof res === 'string') notify(res);
        closeMenu();
        openMenu({ title, build });
      }
    });
  });
}

function closeMenu() {
  if (activeMenuEl) {
    activeMenuEl.remove();
    activeMenuEl = null;
  }
}

function openGarage() {
  openMenu({
    title: 'IRIS\'S GARAGE — CHOP & REPAIR',
    build: () => {
      const rows = [];
      save.ownedCars.forEach((car, i) => {
        const spec = getVehicleSpec(car.spec);
        rows.push({
          label: `Recall ${spec.name} (Cond ${car.durability})`,
          action: () => economy.recallCar(i)
        });
        rows.push({
          label: `Repair ${spec.name} ($80)`,
          action: () => economy.repairStoredCar(i)
        });
        rows.push({
          label: `Sell ${spec.name} ($${spec.chop})`,
          action: () => economy.sellStoredCar(i)
        });
      });
      rows.push({ label: 'Store Current Vehicle', action: () => economy.storeCurrentCar() });
      rows.push({ label: 'Leave Garage', action: () => 'close' });
      return {
        subtitle: `Owned Cars: ${save.ownedCars.length}/4 | Cash: $${save.cash}`,
        rows
      };
    }
  });
}

// Fixed timestep sim
let accumulator = 0;
const dtStep = 1 / 60;

function simStep(dt) {
  simTime += dt;
  save.playtimeSec += dt;

  if (player.mode === 'foot') {
    let speed = 4.0;
    if (keys.w) player.z -= speed * dt;
    if (keys.s) player.z += speed * dt;
    if (keys.a) player.x -= speed * dt;
    if (keys.d) player.x += speed * dt;

    if (city.collideCircle(player.x, player.z, 0.5)) {
      player.x = Math.max(-576, Math.min(576, player.x));
      player.z = Math.max(-576, Math.min(576, player.z));
    }

    playerMesh.position.set(player.x, 0.9, player.z);
  } else if (player.mode === 'drive' && player.car) {
    const c = player.car;
    let accel = 0;
    if (keys.w) accel = 15;
    if (keys.s) accel = -10;
    if (keys.a) c.heading += 2.0 * dt;
    if (keys.d) c.heading -= 2.0 * dt;

    c.speed += accel * dt;
    c.speed *= 0.98;
    c.x += Math.sin(c.heading) * c.speed * dt;
    c.z += Math.cos(c.heading) * c.speed * dt;

    c.mesh.position.set(c.x, 0, c.z);
    c.mesh.rotation.y = c.heading;

    player.x = c.x;
    player.z = c.z;

    const absSpeed = Math.abs(c.speed * 3.6);
    if (absSpeed > save.stats.topSpeed) {
      save.stats.topSpeed = Math.round(absSpeed);
    }
  }

  traffic.update(dt, { x: player.x, z: player.z });
  peds.update(dt, { x: player.x, z: player.z }, police.heat, lastGunshotTime, simTime);
  police.update(dt, { x: player.x, z: player.z }, player.car);
  missions.update(dt);
  economy.update(dt);

  if (police.heat > save.stats.maxHeat) {
    save.stats.maxHeat = police.heat;
  }

  if (combat.health <= 0) {
    onBustedOrWasted('wasted');
  }

  const distId = districtAt(player.x, player.z);
  const obj = missions.currentObjective();
  const objStr = obj ? ` | Job: ${obj.jobLabel} - ${obj.objective}` : '';
  statusEl.textContent = `District: ${distId.toUpperCase()} | Mode: ${player.mode} | Heat: ${police.heat} (Pts: ${police.points}) | Cash: $${save.cash} | REP: ${save.rep}${objStr}`;
}

// Camera follow
function updateCamera() {
  if (player.mode === 'foot') {
    camera.position.set(player.x, player.y + 4, player.z + 6);
    camera.lookAt(player.x, player.y + 1, player.z);
  } else if (player.mode === 'drive' && player.car) {
    const c = player.car;
    const cx = c.x - Math.sin(c.heading) * 8;
    const cz = c.z - Math.cos(c.heading) * 8;
    camera.position.set(cx, c.mesh.position.y + 3.5, cz);
    camera.lookAt(c.x, c.mesh.position.y + 1, c.z);
  }
}

let lastTime = performance.now();
function animate(now) {
  requestAnimationFrame(animate);
  const frameDt = Math.min((now - lastTime) / 1000, 0.2);
  lastTime = now;

  accumulator += frameDt;
  let steps = 0;
  while (accumulator >= dtStep && steps < 5) {
    simStep(dtStep);
    accumulator -= dtStep;
    steps++;
  }

  updateCamera();
  renderer.render(scene, camera);
}
requestAnimationFrame(animate);

function computeStateHash() {
  let str = `${player.x.toFixed(2)},${player.z.toFixed(2)},${police.points},${police.heat},${save.cash},${save.rep},${simTime.toFixed(2)}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}

window.__isPhotoLoading = false;

window.__photo = {
  load(spec) {
    window.__isPhotoLoading = true;
    seed = spec.seed ?? 77;
    simTime = 0;
    scene.clear();
    city = createCity(scene, seed);
    traffic = createTraffic(scene, seed);
    peds = createPedestrians(scene, seed);
    police = createPolice(scene);
    missions.reset();
    economy.reset();

    if (spec.force) {
      if (spec.force.cash !== undefined) save.cash = spec.force.cash;
      if (spec.force.rep !== undefined) save.rep = spec.force.rep;
      if (spec.force.missionIndex !== undefined) save.missionIndex = spec.force.missionIndex;
      if (spec.force.heat !== undefined) police.setPoints(spec.force.heat >= 150 ? 150 : spec.force.heat >= 100 ? 100 : spec.force.heat >= 60 ? 60 : spec.force.heat >= 30 ? 30 : 10);
    }

    if (spec.ticks) {
      for (let t = 0; t < spec.ticks; t++) {
        simStep(1 / 60);
      }
    }
    window.__isPhotoLoading = false;
  },
  state() {
    return {
      player: { x: player.x, z: player.z, mode: player.mode },
      police: { points: police.points, heat: police.heat },
      simTime,
      hash: computeStateHash()
    };
  },
  setCamera(pos, target, fov) {
    camera.position.set(pos[0], pos[1], pos[2]);
    camera.lookAt(target[0], target[1], target[2]);
    if (fov) camera.fov = fov;
    camera.updateProjectionMatrix();
  },
  renderToDataURL() {
    renderer.render(scene, camera);
    return container.toDataURL('image/jpeg', 0.85);
  }
};

window.__calderaTest = {
  state() {
    return window.__photo.state();
  },
  hash() {
    return computeStateHash();
  },
  modules() {
    return { city, traffic, peds, police, combat, vehicles: { ROSTER }, missions, economy, save, player, playerMesh };
  },
  driveTour() {
    const tourResults = {};
    const districtCenters = {
      muelle: [-300, 300],
      paseo: [330, 60],
      verde: [300, -300],
      ceniza: [-300, -300],
      cumbre: [0, -500]
    };
    for (const [id, center] of Object.entries(districtCenters)) {
      player.x = center[0];
      player.z = center[1];
      simStep(1/60);
      tourResults[id] = districtAt(player.x, player.z);
    }
    return tourResults;
  },
  onFootLoop() {
    window.__photo.load({ seed: 77, ticks: 10 });
    player.x = traffic.cars[0].x - 1;
    player.z = traffic.cars[0].z;
    player.mode = 'foot';
    scene.add(playerMesh);
    playerMesh.position.set(player.x, 0.9, player.z);

    if (peds.peds.length > 0) {
      peds.peds[0].x = player.x + 2;
      peds.peds[0].z = player.z;
      peds.peds[0].hp = 30;
      peds.peds[0].state = 'walk';
    }

    handleInteractOrCarjack();
    lastGunshotTime = simTime;
    police.addPoints(CRIME_POINTS.gunshot, true, 2, 0);

    for (let i = 0; i < 30; i++) {
      simStep(1/60);
    }

    return {
      stolen: player.car !== null,
      heat: police.heat,
      points: police.points,
      units: police.units.length
    };
  }
};
