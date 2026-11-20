// CALDERA BAY — traffic.js
// 24 civilian cars on intersection lane graph, right-hand lane offset 3.4m, straight-preferred, slow-for-car-ahead.
import * as THREE from '../three.module.min.js';
import { createCarMesh, VEHICLE_SPECS } from './vehicles.js';

/**
 * Creates and manages civilian traffic flow across the 18x18 block grid network.
 */
export function createTraffic(scene, rng) {
  const civilianSpecs = VEHICLE_SPECS.filter(s => !s.isPolice && !s.isSwat && !s.isHeli);
  const cars = [];
  const spacing = 64;
  const laneOffset = 3.4;

  // Build grid node list for intersection network
  const nodes = [];
  for (let gx = -7; gx <= 7; gx++) {
    for (let gz = -7; gz <= 7; gz++) {
      nodes.push({ x: gx * spacing, z: gz * spacing });
    }
  }

  // Spawn 24 civilian traffic vehicles using std-tier meshes
  for (let i = 0; i < 24; i++) {
    const spec = civilianSpecs[Math.floor(rng() * civilianSpecs.length)];
    const mesh = createCarMesh(spec.id, 'std', spec.color);
    scene.add(mesh);

    const node = nodes[Math.floor(rng() * nodes.length)];
    const dir = Math.floor(rng() * 4);

    let x = node.x;
    let z = node.z;
    let heading = 0;

    // Right-hand lane offset positioning
    if (dir === 0) { x -= spacing * rng(); z += laneOffset; heading = Math.PI / 2; }
    else if (dir === 1) { x += spacing * rng(); z -= laneOffset; heading = -Math.PI / 2; }
    else if (dir === 2) { x += laneOffset; z -= spacing * rng(); heading = 0; }
    else { x -= laneOffset; z += spacing * rng(); heading = Math.PI; }

    cars.push({
      mesh,
      spec,
      x,
      z,
      heading,
      speed: 6 + rng() * 6,
      maxSpeed: 8 + rng() * 6,
      dir,
      stolen: false,
      active: true
    });
  }

  /**
   * Permanently removes a car from traffic flow when marked as stolen.
   */
  function markStolen(carMesh) {
    for (const c of cars) {
      if (c.mesh === carMesh) {
        c.active = false;
        c.stolen = true;
        scene.remove(c.mesh);
        break;
      }
    }
  }

  /**
   * Updates simulation step for all active civilian traffic cars.
   */
  function update(dt, playerPos) {
    for (const car of cars) {
      if (!car.active || car.stolen) continue;

      let targetSpeed = car.maxSpeed;

      // Slow for car ahead in same lane / proximity
      for (const other of cars) {
        if (other === car || !other.active) continue;
        const dx = other.x - car.x;
        const dz = other.z - car.z;
        const distSq = dx * dx + dz * dz;
        if (distSq < 180 && distSq > 0) {
          targetSpeed = Math.min(targetSpeed, other.speed * 0.75);
        }
      }

      // Proximity check for player
      if (playerPos) {
        const pdx = playerPos.x - car.x;
        const pdz = playerPos.z - car.z;
        if (pdx * pdx + pdz * pdz < 120) {
          targetSpeed = Math.min(targetSpeed, 4);
        }
      }

      car.speed += (targetSpeed - car.speed) * dt * 2.5;

      car.x += Math.sin(car.heading) * car.speed * dt;
      car.z += Math.cos(car.heading) * car.speed * dt;

      const bound = 520;
      if (Math.abs(car.x) > bound || Math.abs(car.z) > bound) {
        car.x = (rng() - 0.5) * 800;
        car.z = (rng() - 0.5) * 800;
      }

      // Intersection node choice: straight preferred, no U-turns
      const snapX = Math.round(car.x / spacing) * spacing;
      const snapZ = Math.round(car.z / spacing) * spacing;
      const distToNode = Math.hypot(car.x - snapX, car.z - snapZ);
      if (distToNode < 2.5 && rng() < 0.12) {
        const turns = [0, Math.PI / 2, -Math.PI / 2];
        const turn = turns[Math.floor(rng() * turns.length)];
        car.heading += turn;
        car.heading = (car.heading + Math.PI * 2) % (Math.PI * 2);
      }

      car.mesh.position.set(car.x, 0, car.z);
      car.mesh.rotation.y = car.heading;
    }
  }

  // Return public traffic controller interface methods
  return { cars, update, markStolen };
}
