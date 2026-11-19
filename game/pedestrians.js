import * as THREE from 'three';
import { mulberry32 } from './city.js';

export function createPedestrians(scene, seed = 123) {
  const rng = mulberry32(seed);
  const peds = [];
  const archetypes = [
    { type: 'worker', hp: 30, color: 0x445566, wallet: [5, 20] },
    { type: 'tourist', hp: 30, color: 0xccaa44, wallet: [10, 40] },
    { type: 'thug', hp: 45, color: 0x662222, wallet: [15, 30] }
  ];

  const geo = new THREE.CapsuleGeometry(0.4, 1.2, 4, 8);

  for (let i = 0; i < 48; i++) {
    const arch = archetypes[Math.floor(rng() * archetypes.length)];
    const mat = new THREE.MeshStandardMaterial({ color: arch.color, roughness: 0.8, flatShading: true });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    scene.add(mesh);

    const x = (rng() - 0.5) * 1000;
    const z = (rng() - 0.5) * 1000;
    mesh.position.set(x, 0.9, z);

    peds.push({
      mesh,
      arch,
      x, z,
      hp: arch.hp,
      maxHp: arch.hp,
      state: 'walk', // walk, flee, down
      heading: rng() * Math.PI * 2,
      wallet: Math.floor(arch.wallet[0] + rng() * (arch.wallet[1] - arch.wallet[0]))
    });
  }

  return {
    peds,
    update(dt, playerPos, heatLevel, lastGunshotTime, simTime) {
      for (const p of peds) {
        if (p.hp <= 0) {
          p.state = 'down';
          p.mesh.rotation.x = Math.PI / 2;
          continue;
        }

        const distToPlayer = Math.hypot(p.x - playerPos.x, p.z - playerPos.z);
        const gunshotRecent = (simTime - lastGunshotTime) < 3.0;
        const fleeGunshot = gunshotRecent && distToPlayer < 60;
        const fleeHeat = heatLevel >= 3 && distToPlayer < 20;

        if (fleeGunshot || fleeHeat) {
          p.state = 'flee';
          const angle = Math.atan2(p.x - playerPos.x, p.z - playerPos.z);
          p.heading = angle + (rng() - 0.5) * 0.5;
          const speed = 4.5;
          p.x += Math.sin(p.heading) * speed * dt;
          p.z += Math.cos(p.heading) * speed * dt;
        } else {
          p.state = 'walk';
          const speed = 1.2;
          p.x += Math.sin(p.heading) * speed * dt;
          p.z += Math.cos(p.heading) * speed * dt;
          if (rng() < 0.02) p.heading += (rng() - 0.5) * Math.PI;
        }

        // Recycle if too far from player (>170m)
        if (distToPlayer > 170) {
          const angle = rng() * Math.PI * 2;
          const dist = 120 + rng() * 40;
          p.x = playerPos.x + Math.sin(angle) * dist;
          p.z = playerPos.z + Math.cos(angle) * dist;
          p.hp = p.maxHp;
          p.state = 'walk';
          p.mesh.rotation.x = 0;
        }

        p.mesh.position.set(p.x, 0.9, p.z);
        p.mesh.rotation.y = p.heading;
      }
    },
    witnessesAt(x, z, radius) {
      let count = 0;
      for (const p of peds) {
        if (p.hp > 0 && p.state === 'walk') {
          if (Math.hypot(p.x - x, p.z - z) <= radius) {
            count++;
          }
        }
      }
      return count;
    }
  };
}
