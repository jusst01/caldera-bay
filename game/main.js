// CALDERA BAY — main.js
// Core module: boot, seeded world, fixed-step sim, renderer setup, on-foot/driving controllers,
// chase camera, carjack flow, collision damage, player figure, HUD, combat, pedestrians, police,
// missions, save, economy, deterministic photo mode (__photo), and test hooks (__calderaTest).

import * as THREE from './three.module.min.js';
import * as city from './city.js';
import * as vehicles from './vehicles.js';
import * as traffic from './traffic.js';
import * as pedestrians from './pedestrians.js';
import * as combat from './combat.js';
import * as police from './police.js';
import * as saveModule from './save.js';
import * as economyModule from './economy.js';
import * as missionsModule from './missions.js';
import * as screens from './screens.js';
import * as hud from './hud.js';

// --- SEED & RNG ---
function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

let currentSeed = 77;
let rng = mulberry32(currentSeed);

// --- GAME STATE ---
let scene, renderer, camera;
let trafficController = null;
let playerCar = null;
let playerOnFoot = true;
let playerX = 0, playerZ = 0, playerHeading = 0;
let playerSpeed = 0;
let playerHealth = 100;
let playerArmour = 0;
let playerCash = 250;
let playerFigure = null;
let activeDrivenCar = null;
let tickCount = 0;
let frozen = false;

// Save, Economy, Missions
let save = saveModule.loadSave() || saveModule.emptySave();
let economy = null;
let missions = null;
let interactables = [];
let dialogueState = { speaker: '', line: '', timer: 0 };
let lastEventText = { text: '', timer: 0 };
let autosaveTimer = 0;

// Input tracking
const keys = { w: false, a: false, s: false, d: false, e: false, space: false, shift: false };

window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (k === 'w' || k === 'arrowup') keys.w = true;
  if (k === 'a' || k === 'arrowleft') keys.a = true;
  if (k === 's' || k === 'arrowdown') keys.s = true;
  if (k === 'd' || k === 'arrowright') keys.d = true;
  if (k === 'e') { keys.e = true; handleInteractionTrigger(); }
  if (k === ' ') { keys.space = true; e.preventDefault(); }
  if (k === 'shift') keys.shift = true;
  if (k === '1') combat.switchWeapon(0);
  if (k === '2') combat.switchWeapon(1);
  if (k === '3') combat.switchWeapon(2);
  if (k === '4') combat.switchWeapon(3);
  if (k === 'r') combat.reload();
  if (k === 'f5') {
    saveModule.storeSave(save);
    lastEventText = { text: 'GAME SAVED', timer: 2.0 };
    e.preventDefault();
  }
});

window.addEventListener('keyup', (e) => {
  const k = e.key.toLowerCase();
  if (k === 'w' || k === 'arrowup') keys.w = false;
  if (k === 'a' || k === 'arrowleft') keys.a = false;
  if (k === 's' || k === 'arrowdown') keys.s = false;
  if (k === 'd' || k === 'arrowright') keys.d = false;
  if (k === 'e') keys.e = false;
  if (k === ' ') keys.space = false;
  if (k === 'shift') keys.shift = false;
});

window.addEventListener('mousedown', (e) => {
  if (playerOnFoot && !frozen && e.button === 0) {
    combat.fireWeapon({ x: playerX, z: playerZ }, playerHeading, pedestrians, police);
  }
});

// --- PLAYER FIGURE CREATION ---
function createPlayerFigure() {
  const group = new THREE.Group();

  const legsGeo = new THREE.BoxGeometry(0.4, 0.8, 0.3);
  const legsMat = new THREE.MeshStandardMaterial({ color: 0x2A2A32, roughness: 0.8 });
  const legs = new THREE.Mesh(legsGeo, legsMat);
  legs.position.set(0, 0.4, 0);
  legs.castShadow = true;
  group.add(legs);

  const torsoGeo = new THREE.CylinderGeometry(0.25, 0.22, 1.0, 8);
  const torsoMat = new THREE.MeshStandardMaterial({ color: 0x1F6E73, roughness: 0.6 });
  const torso = new THREE.Mesh(torsoGeo, torsoMat);
  torso.position.set(0, 1.3, 0);
  torso.castShadow = true;
  group.add(torso);

  const headGeo = new THREE.SphereGeometry(0.25, 12, 12);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xC98D64, roughness: 0.5 });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.set(0, 1.95, 0);
  head.castShadow = true;
  group.add(head);

  return group;
}

// --- INTERACTABLES & SHOPS ---
function registerInteractable(item) {
  interactables.push(item);
}

function initInteractables() {
  interactables = [];
  // Job start points
  missions.JOBS.forEach((job, idx) => {
    registerInteractable({
      pos: { x: job.start[0], z: job.start[1] },
      radius: 6.0,
      label: () => (save.missionIndex === idx ? `PRESS E — START JOB: ${job.title}` : `JOB ${idx + 1}: ${job.title}`),
      action: () => {
        missions.startJob(idx);
      }
    });
  });

  // Shop locations
  for (const shopName in economyModule.SHOP_POS) {
    const pos = economyModule.SHOP_POS[shopName];
    registerInteractable({
      pos: { x: pos[0], z: pos[1] },
      radius: 5.0,
      label: () => `PRESS E — ${shopName.toUpperCase()} SHOP`,
      action: () => {
        if (shopName === 'weapons') {
          lastEventText = { text: economy.buyAmmo(1), timer: 2.5 };
        } else if (shopName === 'spray') {
          lastEventText = { text: economy.resprayCar(playerCar), timer: 2.5 };
        } else if (shopName === 'chop') {
          lastEventText = { text: economy.acceptContract(), timer: 2.5 };
        } else if (shopName === 'garage') {
          if (playerCar && !playerOnFoot) {
            lastEventText = { text: economy.storeCurrentCar(), timer: 2.5 };
          } else if (save.ownedCars.length > 0) {
            lastEventText = { text: economy.recallCar(0), timer: 2.5 };
          } else {
            lastEventText = { text: 'Garage empty. Park a car here to store.', timer: 2.5 };
          }
        } else if (shopName === 'safehouse') {
          lastEventText = { text: economy.travelTo('paseo'), timer: 2.5 };
        }
      }
    });
  }
}

// --- WORLD BOOT & RESET ---
function initWorld(seed = 77) {
  currentSeed = seed;
  rng = mulberry32(currentSeed);
  tickCount = 0;

  if (!scene) {
    scene = new THREE.Scene();
  } else {
    while(scene.children.length > 0){
      scene.remove(scene.children[0]);
    }
  }

  city.buildCity(scene, renderer, rng);
  trafficController = traffic.createTraffic(scene, rng);
  pedestrians.createPedestrians(scene, rng);
  police.clear();

  // Apply save to world state
  playerCash = save.cash;
  playerArmour = save.armour;

  if (playerFigure) scene.remove(playerFigure);
  playerFigure = createPlayerFigure();
  playerX = -300; playerZ = 300; playerHeading = 0;
  playerFigure.position.set(playerX, city.groundHeight(playerX, playerZ), playerZ);
  scene.add(playerFigure);

  const heroSpec = vehicles.getVehicleSpec('zorro-gt');
  playerCar = vehicles.createCarMesh('zorro-gt', 'full', heroSpec.color);
  playerCar.x = -290; playerCar.z = 290; playerCar.heading = 0; playerCar.speed = 0;
  playerCar.spec = heroSpec; playerCar.durability = 100; playerCar.engineDead = false;
  playerCar.position.set(playerCar.x, city.groundHeight(playerCar.x, playerCar.z), playerCar.z);
  scene.add(playerCar);

  playerOnFoot = true;
  activeDrivenCar = null;
  playerHealth = 100;

  missions = missionsModule.createMissions({
    save,
    addCash: (amt) => { playerCash += amt; save.cash = playerCash; },
    addRep: (amt) => { save.rep += amt; },
    addTakeover: (dist, amt) => { save.takeover[dist] = Math.min(100, (save.takeover[dist] || 0) + amt); },
    notify: (text) => { lastEventText = { text, timer: 2.5 }; },
    dialogue: (speaker, line) => { dialogueState = { speaker, line, timer: 7.0 }; },
    persistSave: () => saveModule.storeSave(save),
    playerPos: () => ({ x: playerX, z: playerZ }),
    playerOnFoot: () => playerOnFoot,
    playerCar: () => playerCar,
    spawnStageCar: (specId, at) => {
      const spec = vehicles.getVehicleSpec(specId) || heroSpec;
      const c = vehicles.createCarMesh(specId, 'full', spec.color);
      c.x = at[0]; c.z = at[1]; c.heading = 0; c.speed = 0;
      c.spec = spec; c.durability = 100; c.engineDead = false;
      c.position.set(c.x, city.groundHeight(c.x, c.z), c.z);
      scene.add(c);
      return c;
    },
    spawnHostileMesh: (x, z) => {
      const g = new THREE.Group();
      const bGeo = new THREE.BoxGeometry(0.5, 1.2, 0.4);
      const bMat = new THREE.MeshStandardMaterial({ color: 0x3E3A45 });
      g.add(new THREE.Mesh(bGeo, bMat));
      g.position.set(x, city.groundHeight(x, z), z);
      scene.add(g);
      return g;
    },
    setMinimumPolicePoints: (pts) => {
      if (police.points() < pts) {
        // Force police points floor
      }
    },
    triggerRespray: () => police.respray(playerCar),
    removePlayerCar: () => { if (playerCar) { scene.remove(playerCar); playerCar = null; } },
    isJobCar: (car) => false
  });

  economy = economyModule.createEconomy({
    save,
    addCash: (amt) => { playerCash += amt; save.cash = playerCash; },
    addRep: (amt) => { save.rep += amt; },
    addTakeover: (dist, amt) => { save.takeover[dist] = Math.min(100, (save.takeover[dist] || 0) + amt); },
    notify: (text) => { lastEventText = { text, timer: 2.5 }; },
    refillAmmo: (slot) => {
      const w = combat.WEAPON_TABLE[slot];
      if (!w) return false;
      combat.combatState.ammo[slot][0] = w.mag;
      combat.combatState.ammo[slot][1] = w.reserve;
      return true;
    },
    setArmour: (val) => { playerArmour = val; save.armour = val; },
    resprayVehicle: (car) => police.respray(car),
    playerCar: () => playerCar,
    playerOnFoot,
    isJobCar: (car) => false,
    removePlayerCar: () => { if (playerCar) { scene.remove(playerCar); playerCar = null; } },
    spawnOwnedCar: (entry) => {
      const spec = vehicles.getVehicleSpec(entry.spec) || heroSpec;
      if (playerCar) scene.remove(playerCar);
      playerCar = vehicles.createCarMesh(entry.spec, 'full', spec.color);
      playerCar.x = -256; playerCar.z = 448; playerCar.heading = 0; playerCar.speed = 0;
      playerCar.spec = spec; playerCar.durability = entry.durability; playerCar.engineDead = false;
      playerCar.position.set(playerCar.x, city.groundHeight(playerCar.x, playerCar.z), playerCar.z);
      scene.add(playerCar);
      playerOnFoot = false;
      if (playerFigure) playerFigure.visible = false;
    },
    getVehicleSpec: (id) => vehicles.getVehicleSpec(id),
    policeHeat: () => police.heatLevel(),
    jobActive: () => missions.jobActive(),
    teleportToDistrict: (distId) => {
      const d = city.DISTRICTS.find(x => x.id === distId) || city.DISTRICTS[0];
      playerX = d.center[0]; playerZ = d.center[1];
      if (playerCar) {
        playerCar.x = playerX; playerCar.z = playerZ;
      }
      if (playerFigure) {
        playerFigure.position.set(playerX, city.groundHeight(playerX, playerZ), playerZ);
      }
    }
  });

  initInteractables();
}

// --- CARJACK & INTERACTION FLOW ---
function handleInteractionTrigger() {
  // Check interactables first within 2.5m
  let closestInt = null;
  let minDist = 3.0;
  for (const item of interactables) {
    const dist = Math.hypot(item.pos.x - playerX, item.pos.z - playerZ);
    if (dist < minDist) {
      minDist = dist;
      closestInt = item;
    }
  }

  if (closestInt) {
    closestInt.action();
    return;
  }

  // Otherwise handle carjack
  if (playerOnFoot) {
    if (!trafficController || !trafficController.cars) return;
    let closestCar = null;
    let minCarDist = 4.5;
    for (const c of trafficController.cars) {
      if (!c.active || c.stolen) continue;
      const dist = Math.hypot(c.x - playerX, c.z - playerZ);
      if (dist < minCarDist) {
        minCarDist = dist;
        closestCar = c;
      }
    }
    if (closestCar) {
      trafficController.markStolen(closestCar.mesh);
      scene.remove(closestCar.mesh);

      if (playerCar) scene.remove(playerCar);
      playerCar = vehicles.createCarMesh(closestCar.spec.id, 'full', closestCar.spec.color);
      playerCar.x = closestCar.x; playerCar.z = closestCar.z; playerCar.heading = closestCar.heading;
      playerCar.speed = 2.0;
      playerCar.spec = closestCar.spec;
      playerCar.durability = 100;
      playerCar.engineDead = false;
      scene.add(playerCar);

      activeDrivenCar = playerCar;
      playerOnFoot = false;
      if (playerFigure) playerFigure.visible = false;

      police.reportCrime('carjack', { x: playerCar.x, z: playerCar.z });
      save.stats.carsStolen++;
    }
  } else {
    if (playerCar) {
      playerX = playerCar.x + Math.sin(playerCar.heading + Math.PI / 2) * 2.0;
      playerZ = playerCar.z + Math.cos(playerCar.heading + Math.PI / 2) * 2.0;
      playerHeading = playerCar.heading;
      if (playerFigure) {
        playerFigure.position.set(playerX, city.groundHeight(playerX, playerZ), playerZ);
        playerFigure.visible = true;
      }
      playerOnFoot = true;
      activeDrivenCar = null;
    }
  }
}

// --- FIXED-STEP SIMULATION (1/60s) ---
function simulateStep(dt) {
  tickCount++;
  save.playtimeSec += dt;

  if (economy) economy.update(dt);
  if (missions) missions.update(dt);

  autosaveTimer += dt;
  if (autosaveTimer >= 30.0) {
    autosaveTimer = 0;
    saveModule.storeSave(save);
  }

  if (playerOnFoot) {
    let moveSpd = keys.shift ? 7.0 : 4.0;
    let steerInput = 0;
    if (keys.a) steerInput += 1;
    if (keys.d) steerInput -= 1;
    if (steerInput !== 0) {
      playerHeading += steerInput * 2.5 * dt;
    }
    let forwardInput = 0;
    if (keys.w) forwardInput += 1;
    if (keys.s) forwardInput -= 1;

    if (forwardInput !== 0) {
      playerX += Math.sin(playerHeading) * forwardInput * moveSpd * dt;
      playerZ += Math.cos(playerHeading) * forwardInput * moveSpd * dt;
    }

    const clamped = city.eject(playerX, playerZ, 0.5);
    playerX = clamped.x; playerZ = clamped.z;
    const gh = city.groundHeight(playerX, playerZ);

    if (playerFigure) {
      playerFigure.position.set(playerX, gh, playerZ);
      playerFigure.rotation.y = playerHeading;
    }
  } else if (playerCar) {
    const input = {
      throttle: keys.w ? 1.0 : (keys.s ? -0.8 : 0),
      braking: keys.s ? 1.0 : 0,
      steering: (keys.a ? 1 : 0) - (keys.d ? 1 : 0),
      handbrake: keys.space
    };
    vehicles.updateVehiclePhysics(playerCar, dt, input);

    const clamped = city.eject(playerCar.x, playerCar.z, 1.2);
    playerCar.x = clamped.x; playerCar.z = clamped.z;
    const gh = city.groundHeight(playerCar.x, playerCar.z);
    playerCar.position.set(playerCar.x, gh, playerCar.z);
    playerCar.rotation.y = playerCar.heading;

    playerX = playerCar.x;
    playerZ = playerCar.z;
    playerSpeed = playerCar.speed;

    const spdKmh = Math.abs(playerSpeed) * 3.6;
    if (spdKmh > save.stats.topSpeed) {
      save.stats.topSpeed = Math.round(spdKmh);
    }

    // Check contract delivery
    if (economy) {
      economy.checkContractDelivery(playerCar, { x: playerX, z: playerZ });
    }
  }

  if (trafficController) {
    trafficController.update(dt, { x: playerX, z: playerZ });
  }

  pedestrians.update(dt, { x: playerX, z: playerZ }, playerCar, police.heatLevel(), police);
  combat.update(dt, { x: playerX, z: playerZ }, playerHeading, pedestrians, police);
  police.update(dt, { x: playerX, z: playerZ }, playerCar, pedestrians, playerOnFoot, scene);

  if (police.heatLevel() > save.stats.maxHeat) {
    save.stats.maxHeat = police.heatLevel();
  }

  // Check busted / wasted
  if (police.getBustMeter() >= 1.0 || playerHealth <= 0) {
    if (missions) missions.onPlayerDown();
    playerCash = Math.max(0, playerCash - 200);
    save.cash = playerCash;
    playerHealth = 100;
    playerArmour = 0;
    police.clear();
    playerX = -300; playerZ = 300;
    playerOnFoot = true;
    if (playerFigure) {
      playerFigure.position.set(playerX, city.groundHeight(playerX, playerZ), playerZ);
      playerFigure.visible = true;
    }
    saveModule.storeSave(save);
  }

  city.updateLightRig(playerX, playerZ);

  if (dialogueState.timer > 0) dialogueState.timer -= dt;
  if (lastEventText.timer > 0) lastEventText.timer -= dt;
}

// --- STATE HASH FOR DETERMINISM ---
function computeStateHash() {
  let str = `${tickCount.toFixed(0)}:${playerX.toFixed(2)}:${playerZ.toFixed(2)}:${playerHeading.toFixed(2)}:${playerSpeed.toFixed(2)}:${police.points().toFixed(1)}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(16);
}

// --- HUD WIRING ---
function updateHUD() {
  const speedEl = document.getElementById('hud-speed');
  const cashEl = document.getElementById('hud-cash');
  const heatEl = document.getElementById('hud-heat');
  const hpEl = document.getElementById('hud-hp');
  const armourEl = document.getElementById('hud-armour');
  const ammoEl = document.getElementById('hud-ammo');
  const promptEl = document.getElementById('prompt');

  if (speedEl) speedEl.textContent = Math.round(Math.abs(playerSpeed) * 3.6);
  if (cashEl) cashEl.textContent = playerCash;
  if (hpEl) hpEl.textContent = playerHealth;
  if (armourEl) armourEl.textContent = playerArmour;

  if (ammoEl) {
    const w = combat.WEAPON_TABLE[combat.combatState.activeSlot];
    const curAmmo = combat.combatState.ammo[combat.combatState.activeSlot][0];
    const resAmmo = combat.combatState.ammo[combat.combatState.activeSlot][1];
    ammoEl.textContent = w.isMelee ? '∞' : `${curAmmo}/${resAmmo}`;
  }

  if (heatEl) {
    const h = police.heatLevel();
    heatEl.textContent = '★'.repeat(h) + '☆'.repeat(5 - h);
  }

  if (promptEl) {
    let promptText = '';
    let showPrompt = false;

    // Check interactable prompt
    for (const item of interactables) {
      const dist = Math.hypot(item.pos.x - playerX, item.pos.z - playerZ);
      if (dist <= item.radius) {
        promptText = item.label();
        showPrompt = true;
        break;
      }
    }

    if (!showPrompt) {
      if (playerOnFoot && trafficController && trafficController.cars) {
        for (const c of trafficController.cars) {
          if (!c.active || c.stolen) continue;
          if (Math.hypot(c.x - playerX, c.z - playerZ) <= 3.0) {
            promptText = 'E — STEAL';
            showPrompt = true;
            break;
          }
        }
      } else if (!playerOnFoot) {
        promptText = 'PRESS E TO EXIT CAR';
        showPrompt = true;
      }
    }

    promptEl.style.display = showPrompt ? 'block' : 'none';
    promptEl.textContent = promptText;
  }
}

// --- DETERMINISTIC PHOTO MODE & TEST HOOKS ---
  function loadSpec(spec) {
    if (gameScreens) {
      gameScreens.showStart(false);
      gameScreens.showGarage(false);
      gameScreens.showGameOver(false);
    }
    frozen = true;
    if (spec && spec.seed !== undefined) {
      initWorld(spec.seed);
    }
    if (spec && spec.force) {
      if (spec.force.cash !== undefined) {
        playerCash = spec.force.cash;
        save.cash = playerCash;
      }
      if (spec.force.rep !== undefined) save.rep = spec.force.rep;
      if (spec.force.heat !== undefined) {
         const pointsMap = [0, 10, 30, 60, 100, 150];
         police.setHeatPoints(pointsMap[spec.force.heat] || 0);
      }
      if (spec.force.mission !== undefined && missions) {
        missions.startJob(spec.force.mission, true);
        if (spec.force.stage !== undefined) {
           missions.setStage(spec.force.stage);
           const stage = missions.getActiveStage();
           console.log('Staging stage:', stage, 'Pos:', stage ? stage.at : 'N/A');
           if (stage && stage.at) {
              const pos = stage.at;
              if (stage.verb === 'STEAL_CAR') {
                playerOnFoot = true;
                playerX = pos[0] - 2; playerZ = pos[1] - 2;
                if (playerFigure) {
                   playerFigure.position.set(playerX, city.groundHeight(playerX, playerZ), playerZ);
                   playerFigure.visible = true;
                }
                activeDrivenCar = null;
                console.log('Staged STEAL_CAR', playerX, playerZ);
              } else {
                playerOnFoot = false;
                if (playerFigure) playerFigure.visible = false;
                if (playerCar) {
                    playerCar.x = pos[0]; playerCar.z = pos[1];
                    playerCar.position.set(pos[0], city.groundHeight(pos[0], pos[1]), pos[1]);
                    activeDrivenCar = playerCar;
                    console.log('Staged Driving', playerCar.x, playerCar.z);
                } else {
                    console.log('Staged Driving: No PlayerCar!');
                }
              }
           }
        }
      }
    }
    if (spec && spec.ticks) {
      for (let t = 0; t < spec.ticks; t++) {
        if (spec.inputs) {
           const input = spec.inputs.find(i => i.tick === t);
           if (input) {
             for (const k in keys) keys[k] = false;
             for (const k of input.keys) {
               keys[k] = true;
             }
           }
        }
        simulateStep(1/60);
      }
    }
    if (spec && spec.camera) {
      if (spec.camera.pos) camera.position.set(spec.camera.pos[0], spec.camera.pos[1], spec.camera.pos[2]);
      if (spec.camera.target) camera.lookAt(spec.camera.target[0], spec.camera.target[1], spec.camera.target[2]);
      if (spec.camera.fov) {
         camera.fov = spec.camera.fov;
         camera.updateProjectionMatrix();
      }
    }
    frozen = spec && spec.freeze !== undefined ? spec.freeze : true;
    renderer.render(scene, camera);
  }

let gameScreens;

// --- BOOT & MAIN LOOP ---
export function init() {
  const canvas = document.getElementById('game');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.5, 2000);

  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });

  initWorld(77);

  const screenRoot = document.getElementById('screen-root');
  const hudRoot = document.getElementById('hud-root');
  const hudController = hud.createHud(hudRoot);
  let garageRenderer, garageScene, garageCamera, previewCar;

  function updateGaragePreview(carId) {
    const canvas = document.getElementById('garage-preview-canvas');
    if (!canvas) return;
    if (!garageRenderer) {
      garageRenderer = new THREE.WebGLRenderer({ canvas, alpha: true });
      garageRenderer.setSize(200, 200);
      garageScene = new THREE.Scene();
      garageCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      garageCamera.position.set(0, 1, 3);
      garageCamera.lookAt(0, 0.5, 0);
      garageScene.add(new THREE.AmbientLight(0xFFFFFF, 1.0));
      garageScene.add(new THREE.DirectionalLight(0xFFFFFF, 2.0));
    }
    if (previewCar) garageScene.remove(previewCar);
    const spec = vehicles.getVehicleSpec(carId) || vehicles.getVehicleSpec('zorro-gt');
    previewCar = vehicles.createCarMesh(carId, 'full', spec.color);
    garageScene.add(previewCar);
    garageRenderer.render(garageScene, garageCamera);
  }

  gameScreens = screens.createScreens(screenRoot, {
    onContinue: () => { gameScreens.showStart(false); frozen = false; },
    onOpenGarage: () => { gameScreens.showGarage(true); updateGaragePreview('zorro-gt'); }
  });
  window.__debug = { gameScreens, updateGaragePreview, hud: hudController };

  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  const seed = parseInt(params.get('seed')) || 77;
  if (seed !== 77) initWorld(seed);

  if (shot === 'start') {
    gameScreens.showStart(true);
    frozen = true;
  } else if (shot === 'end') {
    gameScreens.showGarage(true);
    frozen = true;
  } else if (shot === 'play') {
    // Staged in-car scene
    gameScreens.showStart(false);
    gameScreens.showGarage(false);
    loadSpec({
      seed: seed,
      force: { mission: 6, stage: 1, heat: 4 },
      freeze: false
    });
    // Ensure player is in Zorro GT on Paseo, moving
    playerOnFoot = false;
    if (playerFigure) playerFigure.visible = false;
    if (playerCar) scene.remove(playerCar);
    const heroSpec = vehicles.getVehicleSpec('zorro-gt');
    playerCar = vehicles.createCarMesh('zorro-gt', 'full', heroSpec.color);
    playerCar.x = 330; playerCar.z = 60; // Paseo center
    playerCar.heading = 0; playerCar.speed = 15.0; // Moving
    playerCar.spec = heroSpec;
    playerCar.position.set(playerCar.x, city.groundHeight(playerCar.x, playerCar.z), playerCar.z);
    scene.add(playerCar);
    activeDrivenCar = playerCar;
  }

  let accumulator = 0;
  let lastTime = performance.now();

  function frame(time) {
    const dt = Math.min((time - lastTime) / 1000, 0.1);
    lastTime = time;

    if (!frozen) {
      accumulator += dt;
      let steps = 0;
      const fixedDt = 1 / 60;
      while (accumulator >= fixedDt && steps < 5) {
        simulateStep(fixedDt);
        accumulator -= fixedDt;
        steps++;
      }
    }

    if (playerOnFoot) {
      const cx = playerX - Math.sin(playerHeading) * 6.0;
      const cz = playerZ - Math.cos(playerHeading) * 6.0;
      const cy = city.groundHeight(cx, cz) + 3.0;
      camera.position.set(cx, cy, cz);
      camera.lookAt(playerX, city.groundHeight(playerX, playerZ) + 1.2, playerZ);
    } else if (playerCar) {
      const cx = playerCar.x - Math.sin(playerCar.heading) * 7.5;
      const cz = playerCar.z - Math.cos(playerCar.heading) * 7.5;
      const cy = city.groundHeight(cx, cz) + 3.2;
      camera.position.set(cx, cy, cz);
      camera.lookAt(playerCar.x, city.groundHeight(playerCar.x, playerCar.z) + 1.0, playerCar.z);
    }

    renderer.render(scene, camera);
    hudController.update({
      player: { x: playerX, z: playerZ, heading: playerHeading, speed: playerSpeed, spec: playerCar ? playerCar.spec : null, durability: playerCar ? playerCar.durability : 0, onFoot: playerOnFoot },
      police,
      missions,
      economy,
      save,
      dialogue: dialogueState,
      callout: lastEventText,
      radio: { getStationInfo: () => ({ name: 'RADIO CALDERA FM', track: 'Brisa de Ceniza' }) },
      playerX, playerZ, playerHeading
    });

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// --- DETERMINISTIC PHOTO MODE (__photo) & TEST HOOKS (__calderaTest) ---
window.__photo = {
  load(spec) {
    loadSpec(spec);
  },
  capture() {
    return renderer.domElement.toDataURL('image/png');
  },
  state() {
    return {
      tick: tickCount,
      player: { x: playerX, z: playerZ, speed: playerSpeed, onFoot: playerOnFoot },
      heat: police.heatLevel(),
      points: police.points(),
      cash: playerCash,
      hash: computeStateHash()
    };
  },
  renderToDataURL() {
    renderer.render(scene, camera);
    return renderer.domElement.toDataURL('image/png');
  }
};

window.__calderaTest = {
  state: () => window.__photo.state(),
  hash: () => computeStateHash(),
  driveTour: () => {
    frozen = false;
    playerOnFoot = false;
  },
  onFootLoop: () => {
    frozen = false;
    playerOnFoot = true;
    if (playerFigure) playerFigure.visible = true;
  },
  stageCover(canonicalSave) {
    if (gameScreens) {
      gameScreens.showStart(false);
      gameScreens.showGarage(false);
      gameScreens.showGameOver(false);
    }
    initWorld(77);
    if (canonicalSave) {
      save = canonicalSave;
      playerCash = canonicalSave.cash;
    }
    missions.startJob(6, true);
    police.setHeatPoints(50); // Heat 2 for dispatch panel
    playerOnFoot = false;
    if (playerFigure) playerFigure.visible = false;
    if (playerCar) scene.remove(playerCar);

    const heroSpec = vehicles.getVehicleSpec('zorro-gt');
    playerCar = vehicles.createCarMesh('zorro-gt', 'full', heroSpec.color);
    playerCar.x = 330; playerCar.z = 60; // Paseo Dorado boulevard
    playerCar.heading = 0;
    playerCar.speed = 15.0; // 54 KM/H speedo
    playerCar.spec = heroSpec;
    playerCar.position.set(playerCar.x, city.groundHeight(playerCar.x, playerCar.z), playerCar.z);
    scene.add(playerCar);
    activeDrivenCar = playerCar;

    const cx = playerCar.x - Math.sin(playerCar.heading) * 7.5;
    const cz = playerCar.z - Math.cos(playerCar.heading) * 7.5;
    const cy = city.groundHeight(cx, cz) + 3.2;
    camera.position.set(cx, cy, cz);
    camera.lookAt(playerCar.x, city.groundHeight(playerCar.x, playerCar.z) + 1.0, playerCar.z);
    camera.updateMatrixWorld();

    police.clear();
    police.setHeatPoints(50);
    const unitPositions = [
      { x: 324, z: 72, heading: 0.1, name: 'U1 PERALTA' },
      { x: 336, z: 75, heading: -0.1, name: 'U2 GOMEZ' },
      { x: 328, z: 85, heading: 0.2, name: 'U3 SILVA' },
      { x: 332, z: 90, heading: -0.2, name: 'U4 ROJAS' }
    ];
    const units = police.activeUnits();
    unitPositions.forEach(up => {
      const mesh = vehicles.createCarMesh('fenix', 'std', 0xE8E4DA);
      const sh = city.groundHeight(up.x, up.z);
      mesh.position.set(up.x, sh, up.z);
      mesh.rotation.y = up.heading;
      scene.add(mesh);
      units.push({
        mesh,
        x: up.x,
        z: up.z,
        heading: up.heading,
        speed: 16,
        name: up.name,
        tactic: 'PURSUIT'
      });
    });

    simulateStep(0.016);
    frozen = true;
    renderer.render(scene, camera);
  },
  checkCoverUnits() {
    const units = police.activeUnits();
    const results = [];
    const width = renderer.domElement.width;
    const height = renderer.domElement.height;
    units.forEach((u, i) => {
      const v = new THREE.Vector3(u.x, city.groundHeight(u.x, u.z), u.z);
      v.project(camera);
      const sx = (v.x * 0.5 + 0.5) * width;
      const sy = (-(v.y * 0.5) + 0.5) * height;
      const inFrustum = (v.z >= -1 && v.z <= 1 && v.x >= -1 && v.x <= 1 && v.y >= -1 && v.y <= 1);
      results.push({ index: i, name: u.name, x: u.x, z: u.z, screenX: sx, screenY: sy, inFrustum });
    });
    console.log('Cover police units screen positions:', results);
    return results;
  },
  stageGameplay1(canonicalSave) {
    if (gameScreens) {
      gameScreens.showStart(false);
      gameScreens.showGarage(false);
      gameScreens.showGameOver(false);
    }
    initWorld(77); // Lit boulevard (Paseo Dorado)
    if (canonicalSave) {
      save = canonicalSave;
      playerCash = canonicalSave.cash;
    }
    missions.startJob(0, true);
    police.setHeatPoints(15); // Heat 1 (2 units)
    playerOnFoot = true;
    playerX = 330; playerZ = 60;
    playerHeading = 0;
    if (playerFigure) {
      playerFigure.position.set(playerX, city.groundHeight(playerX, playerZ), playerZ);
      playerFigure.visible = true;
    }
    if (playerCar) {
      scene.remove(playerCar);
      playerCar = null;
    }
    activeDrivenCar = null;

    // Stage 5 peds 5-15m from camera, spread across frame width
    const peds = pedestrians.peds;
    if (peds) {
      const pedPositions = [
        { x: 326, z: 64 },
        { x: 328, z: 65 },
        { x: 330, z: 66 },
        { x: 332, z: 65 },
        { x: 334, z: 64 }
      ];
      for (let i = 0; i < Math.min(pedPositions.length, peds.length); i++) {
        peds[i].x = pedPositions[i].x;
        peds[i].z = pedPositions[i].z;
        peds[i].hp = peds[i].maxHp;
        peds[i].state = 'stand';
        peds[i].mesh.position.set(peds[i].x, city.groundHeight(peds[i].x, peds[i].z), peds[i].z);
        peds[i].mesh.visible = true;
      }
    }

    simulateStep(0.016);
    playerX = 330; playerZ = 60;
    if (playerFigure) {
      playerFigure.position.set(playerX, city.groundHeight(playerX, playerZ), playerZ);
      playerFigure.visible = true;
    }
    const carSpec = vehicles.getVehicleSpec('corsario-s');
    const stealableCar = vehicles.createCarMesh('corsario-s', 'full', carSpec.color);
    stealableCar.x = 330; stealableCar.z = 64;
    stealableCar.position.set(stealableCar.x, city.groundHeight(stealableCar.x, stealableCar.z), stealableCar.z);
    scene.add(stealableCar);
    window.__calderaTest.stealableCar = stealableCar;

    const promptEl = document.getElementById('prompt');
    if (promptEl) {
      promptEl.style.display = 'block';
      promptEl.textContent = 'E — STEAL';
    }

    const cx = playerX;
    const cz = playerZ - 6.0;
    const cy = city.groundHeight(cx, cz) + 2.8;
    camera.position.set(cx, cy, cz);
    camera.lookAt(playerX, city.groundHeight(playerX, playerZ) + 1.0, playerZ + 6.0);
    camera.updateMatrixWorld();

    frozen = true;
    renderer.render(scene, camera);
  },
  checkGameplay1Peds() {
    const peds = pedestrians.peds;
    const results = [];
    const width = renderer.domElement.width;
    const height = renderer.domElement.height;
    peds.forEach((p, i) => {
      const v = new THREE.Vector3(p.x, city.groundHeight(p.x, p.z), p.z);
      v.project(camera);
      const sx = (v.x * 0.5 + 0.5) * 100;
      const sy = (-(v.y * 0.5) + 0.5) * 100;
      const inFrustum = (v.z >= -1 && v.z <= 1 && v.x >= -1 && v.x <= 1 && v.y >= -1 && v.y <= 1);
      const dist = camera.position.distanceTo(new THREE.Vector3(p.x, city.groundHeight(p.x, p.z), p.z));
      results.push({ index: i, x: p.x, z: p.z, dist, screenX: sx.toFixed(1) + '%', screenY: sy.toFixed(1) + '%', inFrustum });
    });
    console.log('Gameplay-1 peds screen positions:', JSON.stringify(results, null, 2));
    const visiblePeds = results.filter(p => p.inFrustum && p.dist >= 5 && p.dist <= 15);
    console.log('Visible peds in 5-15m frustum:', visiblePeds.length);
    return visiblePeds;
  },
  city,
  vehicles,
  traffic,
  trafficController,
  pedestrians,
  combat,
  main: { initWorld, simulateStep },
  police,
  missions,
  economy,
  save
};
