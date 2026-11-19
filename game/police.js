import * as THREE from 'three';
import { createCarMesh, createHeliMesh } from './vehicles.js';

export const CRIME_POINTS = {
  carjack: 10,
  pedHit: 15,
  mug: 15,
  gunshot: 5,
  copKill: 40,
  policeCar: 40
};

export const HEAT_THRESHOLDS = [0, 10, 30, 60, 100, 150];

const NAMES = ['PERALTA', 'GARCÍA', 'ROJAS', 'SILVA', 'MENDOZA', 'ORTIZ', 'CASTRO', 'MEDINA'];
const TACTICS = {
  1: 'PURSUIT',
  2: 'BOX-IN',
  3: 'RAMMING',
  4: 'SPOTLIGHT'
};

export function createPolice(scene) {
  let points = 0;
  let heat = 0;
  let state = 'IDLE'; // IDLE, PURSUIT, SEARCH, BUSTED
  let searchTimer = 0;
  const units = [];

  // Spawn initial police unit pool
  for (let i = 0; i < 10; i++) {
    const isHeli = i === 8;
    const mesh = isHeli ? createHeliMesh() : createCarMesh('fenix', true);
    scene.add(mesh);
    mesh.visible = false;
    units.push({
      mesh,
      isHeli,
      name: NAMES[i % NAMES.length],
      x: 0, z: 0,
      active: false
    });
  }

  const roadblockGroup = new THREE.Group();
  scene.add(roadblockGroup);

  function forceRoadblock(pos, heading) {
    roadblockGroup.clear();
    const car1 = createCarMesh('fenix', true);
    const car2 = createCarMesh('fenix', true);
    scene.add(car1);
    scene.add(car2);
    car1.position.set(pos[0] - 3.5, 0, pos[1]);
    car2.position.set(pos[0] + 3.5, 0, pos[1]);
    car1.rotation.y = heading + Math.PI / 2;
    car2.rotation.y = heading + Math.PI / 2;
    roadblockGroup.add(car1);
    roadblockGroup.add(car2);
  }

  function getHeatLevel(pts) {
    for (let h = 5; h >= 1; h--) {
      if (pts >= HEAT_THRESHOLDS[h]) return h;
    }
    return 0;
  }

  return {
    get points() { return points; },
    get heat() { return heat; },
    get state() { return state; },
    get units() { return units.filter(u => u.active); },
    forceRoadblock,
    addPoints(amt, witnessed, pedCount, unitNear) {
      if (witnessed || pedCount > 0 || unitNear) {
        points += amt;
        heat = getHeatLevel(points);
        if (heat > 0 && state === 'IDLE') state = 'PURSUIT';
      }
    },
    setPoints(pts) {
      if (pts > points) {
        points = pts;
        heat = getHeatLevel(points);
        if (heat > 0 && state === 'IDLE') state = 'PURSUIT';
      }
    },
    respray() {
      points = 0;
      heat = 0;
      state = 'IDLE';
      units.forEach(u => u.active = false);
    },
    update(dt, playerPos, playerCar) {
      heat = getHeatLevel(points);
      const targetCount = heat === 0 ? 0 : heat === 1 ? 2 : heat === 2 ? 4 : heat === 3 ? 6 : heat === 4 ? 8 : 10;

      let activeCount = 0;
      units.forEach((u, idx) => {
        if (idx < targetCount) {
          u.active = true;
          u.mesh.visible = true;
          if (!u.x && !u.z) {
            const angle = Math.random() * Math.PI * 2;
            u.x = playerPos.x + Math.sin(angle) * 40;
            u.z = playerPos.z + Math.cos(angle) * 40;
          }
          // Move toward player
          const dx = playerPos.x - u.x;
          const dz = playerPos.z - u.z;
          const dist = Math.hypot(dx, dz);
          if (dist > 8) {
            u.x += (dx / dist) * 12 * dt;
            u.z += (dz / dist) * 12 * dt;
          }
          u.mesh.position.set(u.x, u.isHeli ? 25 : 0, u.z);
          u.mesh.lookAt(playerPos.x, u.mesh.position.y, playerPos.z);
          activeCount++;
        } else {
          u.active = false;
          u.mesh.visible = false;
        }
      });
    }
  };
}
