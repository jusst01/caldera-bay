import * as THREE from 'three';
import { ROSTER, createCarMesh } from './vehicles.js';
import { mulberry32 } from './city.js';

export function createTraffic(scene, seed = 42) {
  const rng = mulberry32(seed);
  const cars = [];
  const blockSize = 64;
  const gridCount = 18;
  const halfSize = (gridCount * blockSize) / 2;

  // Build node graph intersections
  const nodes = [];
  for (let gx = 1; gx < gridCount - 1; gx++) {
    for (let gz = 1; gz < gridCount - 1; gz++) {
      nodes.push({
        x: -halfSize + gx * blockSize,
        z: -halfSize + gz * blockSize,
        gx, gz
      });
    }
  }

  for (let i = 0; i < 24; i++) {
    const node = nodes[Math.floor(rng() * nodes.length)];
    const spec = ROSTER[Math.floor(rng() * 9)]; // civilian stealables
    const mesh = createCarMesh(spec.id);
    scene.add(mesh);

    const x = node.x + (rng() - 0.5) * 10;
    const z = node.z + (rng() - 0.5) * 10;
    mesh.position.set(x, 0, z);

    cars.push({
      mesh,
      spec,
      x, z,
      speed: 0,
      maxSpeed: (spec.topKmh / 3.6) * (0.5 + rng() * 0.3),
      heading: rng() * Math.PI * 2,
      targetNode: node,
      stolen: false,
      durability: 100
    });
  }

  return {
    cars,
    update(dt, playerPos) {
      for (const c of cars) {
        if (c.stolen) continue;
        const dx = Math.sin(c.heading);
        const dz = Math.cos(c.heading);
        c.speed = c.maxSpeed * 0.6;
        c.x += dx * c.speed * dt;
        c.z += dz * c.speed * dt;
        c.mesh.position.set(c.x, 0, c.z);
        c.mesh.rotation.y = c.heading;

        // Simple boundary wrap / turn
        if (Math.abs(c.x) > 550 || Math.abs(c.z) > 550) {
          c.heading += Math.PI;
        }
      }
    },
    markStolen(car) {
      car.stolen = true;
    }
  };
}
