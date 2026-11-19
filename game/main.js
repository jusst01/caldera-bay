import * as THREE from 'three';
import { createCity, districtAt, mulberry32 } from './city.js';
import { ROSTER, createCarMesh } from './vehicles.js';
import { createTraffic } from './traffic.js';
import { createPedestrians } from './pedestrians.js';
import { createCombat } from './combat.js';
import { createPolice, CRIME_POINTS } from './police.js';

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

// Keys state
const keys = { w: false, a: false, s: false, d: false, e: false, space: false };
window.addEventListener('keydown', e => {
  if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') keys.w = true;
  if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') keys.s = true;
  if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') keys.a = true;
  if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') keys.d = true;
  if (e.key === 'e' || e.key === 'E') handleCarjack();
  if (e.key === '1') combat.setSlot(0);
  if (e.key === '2') combat.setSlot(1);
  if (e.key === '3') combat.setSlot(2);
  if (e.key === '4') combat.setSlot(3);
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
  if (e.key === 'e' || e.key === 'E') keys.e = false;
});

let simTime = 0;
let lastGunshotTime = -999;

function handleCarjack() {
  if (player.mode === 'foot') {
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

// Fixed timestep sim
let accumulator = 0;
const dtStep = 1 / 60;

function simStep(dt) {
  simTime += dt;

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
  }

  traffic.update(dt, { x: player.x, z: player.z });
  peds.update(dt, { x: player.x, z: player.z }, police.heat, lastGunshotTime, simTime);
  police.update(dt, { x: player.x, z: player.z }, player.car);

  const distId = districtAt(player.x, player.z);
  statusEl.textContent = `District: ${distId.toUpperCase()} | Mode: ${player.mode} | Heat: ${police.heat} (Pts: ${police.points}) | Units: ${police.units.length} | HP: ${combat.health}`;
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
  let str = `${player.x.toFixed(2)},${player.z.toFixed(2)},${police.points},${police.heat},${simTime.toFixed(2)}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}

window.__photo = {
  load(spec) {
    seed = spec.seed ?? 77;
    simTime = 0;
    scene.clear();
    city = createCity(scene, seed);
    traffic = createTraffic(scene, seed);
    peds = createPedestrians(scene, seed);
    police = createPolice(scene);

    if (spec.ticks) {
      for (let t = 0; t < spec.ticks; t++) {
        simStep(1 / 60);
      }
    }
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
    // Position player near first traffic car
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

    // Carjack & Gunshot
    handleCarjack();
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
