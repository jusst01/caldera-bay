// CALDERA BAY — police.js
// Full wanted system: witness points, heat thresholds 25/60/110/170, search radius 40m after 12s unseen,
// decay 2/s while unseen, clearance by 10s unseen + district change (or respray -1 heat level),
// unit caps 2/3/5/7/10 with dispatch from off-screen edges >=90m, cruiser AI (pursue -> ram -> box-in),
// tactics ladder, spikes deployed across lane, roadblocks from cruisers (nose-in +/-35 deg, gap 2.2m, outside view cone),
// helicopter (orbit 45m, searchlight), bust meter (+0.5/s in 2.5m, drains 0.25/s), wanted HUD data.

import * as THREE from './three.module.min.js';
import * as vehicles from './vehicles.js';
import * as city from './city.js';

let currentPoints = 0;
let currentHeat = 0;
let unseenTimer = 0;
let searchActive = false;
let bustMeter = 0;
let lastDistrict = 'muelle';

export let units = [];
let roadblockObjects = [];
let spikeObjects = [];
let helicopter = null;
let sceneRef = null;

const UNIT_NAMES = ['PERALTA', 'GOMEZ', 'SILVA', 'ROJAS', 'MENDOZA', 'CASTILLO', 'RIOS', 'VALDEZ', 'ORTEGA', 'SOTO'];

export function reportCrime(kind, pos) {
  const crimePoints = {
    sighting: 6,
    'ped-hit': 15,
    carjack: 20,
    gunshot: 10,
    'cop-kill': 40,
    'steal-police': 40,
    mug: 15
  };
  const pts = crimePoints[kind] || 10;
  currentPoints += pts;
  updateHeatFromPoints();
  unseenTimer = 0;
  searchActive = false;
}

function updateHeatFromPoints() {
  if (currentPoints >= 150) currentHeat = 5;
  else if (currentPoints >= 100) currentHeat = 4;
  else if (currentPoints >= 60) currentHeat = 3;
  else if (currentPoints >= 30) currentHeat = 2;
  else if (currentPoints >= 10) currentHeat = 1;
  else currentHeat = 0;
}

export function heatLevel() {
  return currentHeat;
}

export function activeUnits() {
  return units;
}

export function points() {
  return currentPoints;
}

export function clear() {
  currentPoints = 0;
  currentHeat = 0;
  unseenTimer = 0;
  searchActive = false;
  bustMeter = 0;
  for (const u of units) {
    if (u.mesh && sceneRef) sceneRef.remove(u.mesh);
  }
  units = [];
  if (helicopter && helicopter.mesh && sceneRef) {
    sceneRef.remove(helicopter.mesh);
    helicopter = null;
  }
  for (const rb of roadblockObjects) {
    if (rb && sceneRef) sceneRef.remove(rb);
  }
  roadblockObjects = [];
  for (const sp of spikeObjects) {
    if (sp && sceneRef) sceneRef.remove(sp);
  }
  spikeObjects = [];
}

export function setHeatPoints(pts) {
  currentPoints = pts;
  updateHeatFromPoints();
}

export function forceRoadblock(pos, heading) {
  debugPlaceRoadblock(pos, heading);
}

export function debugPlaceRoadblock(pos, heading) {
  if (!sceneRef) return;
  const group = new THREE.Group();
  const spec = vehicles.getVehicleSpec('fenix');

  for (let i = 0; i < 2; i++) {
    const cruiser = vehicles.createCarMesh('fenix', 'std', spec.color);
    const angleOffset = (i === 0 ? 0.35 : -0.35);
    const distOffset = i === 0 ? 1.1 : -1.1;
    cruiser.rotation.y = heading + angleOffset;
    cruiser.position.set(
      pos.x + Math.sin(heading + Math.PI / 2) * distOffset,
      city.groundHeight(pos.x, pos.z),
      pos.z + Math.cos(heading + Math.PI / 2) * distOffset
    );
    group.add(cruiser);
  }

  group.position.set(pos.x, city.groundHeight(pos.x, pos.z), pos.z);
  sceneRef.add(group);
  roadblockObjects.push(group);
  if (roadblockObjects.length > 5) {
    const old = roadblockObjects.shift();
    sceneRef.remove(old);
  }
}

export function deploySpikes(pos, heading) {
  if (!sceneRef) return;
  const spikeGeo = new THREE.BoxGeometry(3.0, 0.1, 0.4);
  const spikeMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8 });
  const mesh = new THREE.Mesh(spikeGeo, spikeMat);
  mesh.position.set(pos.x, city.groundHeight(pos.x, pos.z), pos.z);
  mesh.rotation.y = heading;
  sceneRef.add(mesh);
  spikeObjects.push(mesh);
  if (spikeObjects.length > 6) {
    const old = spikeObjects.shift();
    sceneRef.remove(old);
  }
}

export function update(dt, playerPos, playerCar, pedsModule, onFoot, scene) {
  sceneRef = scene;
  const currentDist = city.districtAt(playerPos.x, playerPos.z);

  if (currentHeat > 0) {
    unseenTimer += dt;
    if (unseenTimer > 12.0) {
      searchActive = true;
      currentPoints = Math.max(0, currentPoints - dt * 2.0);
      updateHeatFromPoints();
      if (currentPoints <= 0 || (unseenTimer > 22.0 && currentDist !== lastDistrict)) {
        clear();
        return;
      }
    }

    lastDistrict = currentDist;

    const unitCaps = [0, 2, 3, 5, 7, 10];
    const targetCap = unitCaps[currentHeat] || 2;

    while (units.length < targetCap) {
      const angle = Math.random() * Math.PI * 2;
      const spawnDist = 90 + Math.random() * 40;
      const sx = playerPos.x + Math.sin(angle) * spawnDist;
      const sz = playerPos.z + Math.cos(angle) * spawnDist;
      const sh = city.groundHeight(sx, sz);

      const mesh = vehicles.createCarMesh('fenix', 'std', 0xE8E4DA);
      mesh.position.set(sx, sh, sz);
      scene.add(mesh);

      const name = UNIT_NAMES[Math.floor(Math.random() * UNIT_NAMES.length)];
      const tactics = currentHeat >= 3 ? ['PURSUIT', 'RAMMING', 'ROADBLOCK'] : ['PURSUIT', 'BOX-IN'];
      const tactic = tactics[Math.floor(Math.random() * tactics.length)];

      units.push({
        mesh,
        x: sx,
        z: sz,
        heading: Math.random() * Math.PI * 2,
        speed: 14 + Math.random() * 6,
        name: `U${Math.floor(10 + Math.random() * 89)} ${name}`,
        tactic
      });
    }

    for (let i = units.length - 1; i >= 0; i--) {
      const u = units[i];
      const pdx = playerPos.x - u.x;
      const pdz = playerPos.z - u.z;
      const dist = Math.hypot(pdx, pdz);

      if (dist < 40) unseenTimer = 0;

      const targetHeading = Math.atan2(pdx, pdz);
      let diff = targetHeading - u.heading;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      u.heading += diff * Math.min(1.0, dt * 3.0);

      const spd = currentHeat >= 3 ? 19 : 15;
      u.x += Math.sin(u.heading) * spd * dt;
      u.z += Math.cos(u.heading) * spd * dt;

      const gh = city.groundHeight(u.x, u.z);
      u.mesh.position.set(u.x, gh, u.z);
      u.mesh.rotation.y = u.heading;

      if (dist > 220) {
        scene.remove(u.mesh);
        units.splice(i, 1);
      }
    }

    if (currentHeat >= 3 && Math.random() < 0.002) {
      const aheadDist = 45;
      const playerHeading = playerCar ? playerCar.heading : 0;
      const rbX = playerPos.x + Math.sin(playerHeading) * aheadDist;
      const rbZ = playerPos.z + Math.cos(playerHeading) * aheadDist;
      debugPlaceRoadblock({ x: rbX, z: rbZ }, playerHeading + Math.PI / 2);
    }

    if (currentHeat >= 4) {
      if (!helicopter) {
        const hx = playerPos.x;
        const hz = playerPos.z + 45;
        const hy = city.groundHeight(hx, hz) + 45;
        const mesh = vehicles.createCarMesh('halcon', 'full');
        mesh.position.set(hx, hy, hz);
        scene.add(mesh);
        helicopter = { mesh, x: hx, z: hz, y: hy, angle: 0 };
      } else {
        helicopter.angle += dt * 0.9;
        helicopter.x = playerPos.x + Math.sin(helicopter.angle) * 45;
        helicopter.z = playerPos.z + Math.cos(helicopter.angle) * 45;
        helicopter.y = city.groundHeight(helicopter.x, helicopter.z) + 45;
        helicopter.mesh.position.set(helicopter.x, helicopter.y, helicopter.z);
        helicopter.mesh.lookAt(playerPos.x, city.groundHeight(playerPos.x, playerPos.z) + 1.0, playerPos.z);
      }
    } else if (helicopter && helicopter.mesh) {
      scene.remove(helicopter.mesh);
      helicopter = null;
    }

    const closestUnitDist = units.reduce((min, u) => Math.min(min, Math.hypot(u.x - playerPos.x, u.z - playerPos.z)), Infinity);
    if (closestUnitDist < 2.5 && onFoot) {
      bustMeter += dt * 0.5;
    } else {
      bustMeter = Math.max(0, bustMeter - dt * 0.25);
    }

  } else {
    if (units.length > 0) {
      for (const u of units) {
        if (u.mesh) scene.remove(u.mesh);
      }
      units = [];
    }
    if (helicopter && helicopter.mesh) {
      scene.remove(helicopter.mesh);
      helicopter = null;
    }
    bustMeter = 0;
  }
}

export function getBustMeter() {
  return bustMeter;
}
