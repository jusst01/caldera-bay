// game/main.js — Caldera Bay main entry point, HUD, radio, screens, shop menus, photo mode

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
import { createHud } from './hud.js';
import { createRadio } from './radio.js';

const container = document.getElementById('game-canvas') || document.getElementById('game');
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
let hud = createHud(ctx, hudRoot);
let radio = createRadio(save);

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
let screenOpen = true; // start screen open by default on boot

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

// First gesture starts radio
function handleFirstGesture() {
  radio.start();
  window.removeEventListener('pointerdown', handleFirstGesture);
  window.removeEventListener('keydown', handleFirstGesture);
}
window.addEventListener('pointerdown', handleFirstGesture);
window.addEventListener('keydown', handleFirstGesture);

// Keys state
const keys = { w: false, a: false, s: false, d: false, e: false, space: false };
window.addEventListener('keydown', e => {
  if (screenOpen) return;
  if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') keys.w = true;
  if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') keys.s = true;
  if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') keys.a = true;
  if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') keys.d = true;
  if (e.key === 'e' || e.key === 'E') handleInteractOrCarjack();
  if (e.key === 'f' || e.key === 'F') handleMug();
  if (e.key === 'r' || e.key === 'R') {
    const st = radio.cycle();
    ctx.notify(`Radio: ${st.name} — ${st.track}`);
  }
  if (e.key === '1') combat.setSlot(0);
  if (e.key === '2') combat.setSlot(1);
  if (e.key === '3') combat.setSlot(2);
  if (e.key === '4') combat.setSlot(3);
  if (e.key === 'F5') { persistSave(); ctx.notify('Game Saved.'); }
  if (e.key === 'Escape') {
    hud.closeMenu();
    hud.hideGarageScreen();
  }
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
    let closestInteractable = null;
    let minDist = 3.2;

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
        ctx.notify(`Mugged pedestrian for $${cashStolen}`);
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
    ctx.notify('BUSTED: -10% cash penalty');
  } else {
    save.cash = Math.max(0, save.cash - 200);
    for (let s = 1; s <= 3; s++) {
      combat.ammo[s][1] = Math.floor(combat.ammo[s][1] / 2);
    }
    combat.health = 100;
    ctx.notify('WASTED: -$200 penalty, half ammo lost');
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
function openMenu(opts) {
  screenOpen = true;
  hud.openMenu(opts);
}

function openGarage() {
  if (police.heat >= 1) {
    ctx.notify('Garage refused: Police pursuit active!');
    return;
  }
  screenOpen = true;
  hud.showGarageScreen({
    onClose: () => {
      screenOpen = false;
    }
  });
}

// Boot start screen
hud.showStartScreen(
  () => {
    screenOpen = false;
    applySaveToWorld();
    ctx.notify('Game Resumed.');
  },
  () => {
    save = emptySave();
    persistSave();
    applySaveToWorld();
    screenOpen = false;
    ctx.notify('New Game Started.');
  }
);

// Fixed timestep sim
let accumulator = 0;
let dtStep = 1 / 60;

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

  // Proximity prompts
  let promptText = null;
  const missionInteractable = missions.armJobStart();
  const allInteractables = [...interactables];
  if (missionInteractable) allInteractables.push(missionInteractable);

  for (const item of allInteractables) {
    const dist = Math.hypot(item.pos[0] - player.x, item.pos[1] - player.z);
    if (dist <= (item.radius || 6)) {
      const lbl = typeof item.label === 'function' ? item.label() : item.label;
      if (lbl) {
        promptText = lbl;
        break;
      }
    }
  }

  if (!promptText && player.mode === 'foot') {
    for (const c of traffic.cars) {
      const dist = Math.hypot(c.x - player.x, c.z - player.z);
      if (dist < 6.0) {
        promptText = `E — STEAL ${c.spec.name.toUpperCase()}`;
        break;
      }
    }
  }
  hud.showPrompt(promptText);
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

  if (!screenOpen) {
    accumulator += frameDt;
    let steps = 0;
    while (accumulator >= dtStep && steps < 5) {
      simStep(dtStep);
      accumulator -= dtStep;
      steps++;
    }
  }

  updateCamera();
  renderer.render(scene, camera);

  if (!screenOpen) {
    hud.update({
      player,
      police,
      save,
      missions,
      economy,
      radio,
      simTime,
      lastEvent,
      dialogueLine
    });
  }
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
    screenOpen = false;
    hud.hideStartScreen();
    hud.hideGarageScreen();
    hud.closeMenu();

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
      if (spec.force.station !== undefined && radio) {
        save.radioStation = spec.force.station;
      }
      if (spec.force.screen === 'start') {
        screenOpen = true;
        hud.showStartScreen(() => {}, () => {});
      } else if (spec.force.screen === 'garage') {
        screenOpen = true;
        hud.showGarageScreen({});
      }
      if (spec.force.panels !== undefined) {
        hud.setPanels(spec.force.panels);
      }
      if (spec.force.dialogue !== undefined) {
        dialogueLine = spec.force.dialogue;
      }
      if (spec.force.event !== undefined) {
        lastEvent = spec.force.event;
      }
    }

    if (spec.ticks) {
      for (let t = 0; t < spec.ticks; t++) {
        simStep(1 / 60);
      }
    }

    // One HUD update pass after freeze
    hud.update({ player, police, save, missions, economy, radio, simTime, lastEvent, dialogueLine });
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
    return { city, traffic, peds, police, combat, vehicles: { ROSTER }, missions, economy, save, player, playerMesh, hud, radio };
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
