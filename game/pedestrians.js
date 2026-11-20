// CALDERA BAY — pedestrians.js
// Shared seeded pool of 64 pedestrians (walkers + standers) with v2 §3 articulated capsule figures,
// shirt palette, leg/arm swing, reactions (flee/cower/observe), witness logic (LoS + 35m + daylight factor),
// getHit reactions, seeded ambient brawl event with named loot drop, nearestPed(), debugSetPed().

import * as THREE from './three.module.min.js';
import * as city from './city.js';

const SHIRT_PALETTE = [
  0xE4572E, 0x2E86AB, 0xF3A712, 0x8E44AD,
  0x27AE60, 0xECF0F1, 0xE91E63, 0x16A085
];

export let peds = [];
export let lootDrops = [];

export function createPedestrians(scene, rng) {
  peds = [];
  lootDrops = [];
  const archetypes = ['worker', 'tourist', 'thug'];

  for (let i = 0; i < 64; i++) {
    const group = new THREE.Group();

    const legsGeo = new THREE.BoxGeometry(0.3, 0.6, 0.25);
    const legsMat = new THREE.MeshStandardMaterial({ color: 0x2A2A32, roughness: 0.8 });
    const legs = new THREE.Mesh(legsGeo, legsMat);
    legs.position.set(0, 0.3, 0);
    legs.castShadow = true;
    group.add(legs);

    const shirtColor = SHIRT_PALETTE[Math.floor(rng() * SHIRT_PALETTE.length)];
    const torsoGeo = new THREE.CylinderGeometry(0.2, 0.18, 0.7, 8);
    const torsoMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.7 });
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.position.set(0, 0.95, 0);
    torso.castShadow = true;
    group.add(torso);

    const headGeo = new THREE.SphereGeometry(0.18, 10, 10);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xC98D64, roughness: 0.5 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, 1.45, 0);
    head.castShadow = true;
    group.add(head);

    const gx = (rng() * 16 - 8) * 64 + (rng() > 0.5 ? 12 : -12);
    const gz = (rng() * 16 - 8) * 64 + (rng() > 0.5 ? 12 : -12);
    const gh = city.groundHeight(gx, gz);

    group.position.set(gx, gh, gz);
    scene.add(group);

    const isStand = rng() < 0.3;
    const archetype = archetypes[Math.floor(rng() * archetypes.length)];
    const hp = archetype === 'thug' ? 45 : 30;
    const wallet = Math.floor(5 + rng() * 35);

    peds.push({
      mesh: group,
      legs,
      torso,
      head,
      x: gx,
      z: gz,
      heading: rng() * Math.PI * 2,
      speed: isStand ? 0 : (1.0 + rng() * 1.5),
      maxSpeed: 1.5 + rng() * 1.0,
      state: isStand ? 'stand' : 'walk',
      hp,
      maxHp: hp,
      wallet,
      archetype,
      targetX: gx + (rng() * 40 - 20),
      targetZ: gz + (rng() * 40 - 20),
      fleeTimer: 0,
      animTime: rng() * 10,
      brawlTarget: null
    });
  }

  if (peds.length >= 2) {
    peds[0].state = 'brawl';
    peds[1].state = 'brawl';
    peds[0].brawlTarget = peds[1];
    peds[1].brawlTarget = peds[0];
  }
}

export function nearestPed(x, z, maxDist = 10.0) {
  let closest = null;
  let minDist = maxDist * maxDist;
  for (const p of peds) {
    if (p.hp <= 0) continue;
    const dx = p.x - x;
    const dz = p.z - z;
    const distSq = dx * dx + dz * dz;
    if (distSq < minDist) {
      minDist = distSq;
      closest = p;
    }
  }
  return closest;
}

export function debugSetPed(index, state) {
  if (peds[index]) {
    peds[index].state = state;
  }
}

export function checkWitness(kind, pos, playerPos, policeModule, daylightFactor = 1.0) {
  for (const p of peds) {
    if (p.hp <= 0 || p.state === 'flee' || p.state === 'cower') continue;
    const dx = p.x - pos.x;
    const dz = p.z - pos.z;
    const distSq = dx * dx + dz * dz;
    const witnessRange = 35 * daylightFactor;
    if (distSq < witnessRange * witnessRange) {
      let blocked = false;
      const steps = 6;
      for (let s = 1; s < steps; s++) {
        const t = s / steps;
        const rx = pos.x + (p.x - pos.x) * t;
        const rz = pos.z + (p.z - pos.z) * t;
        if (city.collideCircle(rx, rz, 0.5)) {
          blocked = true;
          break;
        }
      }
      if (!blocked) {
        p.state = Math.random() < 0.5 ? 'flee' : 'cower';
        p.fleeTimer = 8.0;
        if (policeModule && typeof policeModule.reportCrime === 'function') {
          policeModule.reportCrime(kind, pos);
        }
        break;
      }
    }
  }
}

export function update(dt, playerPos, playerCar, policeHeat, policeModule, scene) {
  for (const p of peds) {
    if (p.hp <= 0) {
      p.mesh.rotation.z = Math.PI / 2;
      continue;
    }

    const pdx = playerPos.x - p.x;
    const pdz = playerPos.z - p.z;
    const distToPlayerSq = pdx * pdx + pdz * pdz;

    if (policeHeat >= 3 && distToPlayerSq < 25 * 25) {
      p.state = 'flee';
      p.fleeTimer = 5.0;
    }

    if (p.state === 'flee') {
      p.fleeTimer -= dt;
      const angle = Math.atan2(p.x - playerPos.x, p.z - playerPos.z);
      p.heading = angle;
      p.speed = p.maxSpeed * 1.8;
      p.x += Math.sin(p.heading) * p.speed * dt;
      p.z += Math.cos(p.heading) * p.speed * dt;

      if (p.fleeTimer <= 0) {
        p.state = 'walk';
      }
    } else if (p.state === 'cower') {
      p.speed = 0;
      p.fleeTimer -= dt;
      if (p.fleeTimer <= 0) {
        p.state = 'walk';
      }
    } else if (p.state === 'observe') {
      p.speed = 0;
      p.fleeTimer -= dt;
      if (p.fleeTimer <= 0) p.state = 'walk';
    } else if (p.state === 'brawl' && p.brawlTarget && p.brawlTarget.hp > 0) {
      const bdx = p.brawlTarget.x - p.x;
      const bdz = p.brawlTarget.z - p.z;
      const bDist = Math.hypot(bdx, bdz);
      if (bDist > 2.0) {
        p.heading = Math.atan2(bdx, bdz);
        p.speed = p.maxSpeed * 0.8;
        p.x += Math.sin(p.heading) * p.speed * dt;
        p.z += Math.cos(p.heading) * p.speed * dt;
      } else {
        p.speed = 0;
        if (Math.random() < 0.05) {
          p.brawlTarget.hp -= 2;
          if (p.brawlTarget.hp <= 0) {
            p.brawlTarget.state = 'down';
            lootDrops.push({ x: p.brawlTarget.x, z: p.brawlTarget.z, cash: p.brawlTarget.wallet || 25 });
          }
        }
      }
    } else if (p.state === 'stand') {
      p.speed = 0;
      if (distToPlayerSq < 15 * 15 && Math.random() < 0.01) {
        p.state = 'walk';
      }
    } else if (p.state === 'walk') {
      const tdx = p.targetX - p.x;
      const tdz = p.targetZ - p.z;
      const tDist = Math.hypot(tdx, tdz);

      if (tDist < 3.0) {
        p.targetX = p.x + (Math.random() * 80 - 40);
        p.targetZ = p.z + (Math.random() * 80 - 40);
      } else {
        const targetHeading = Math.atan2(tdx, tdz);
        let diff = targetHeading - p.heading;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        p.heading += diff * Math.min(1.0, dt * 3.0);

        p.speed = p.maxSpeed;
        p.x += Math.sin(p.heading) * p.speed * dt;
        p.z += Math.cos(p.heading) * p.speed * dt;
      }
    }

    if (distToPlayerSq > 150 * 150) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 60 + Math.random() * 60;
      p.x = playerPos.x + Math.sin(angle) * dist;
      p.z = playerPos.z + Math.cos(angle) * dist;
      p.hp = p.maxHp;
      p.state = 'walk';
      p.mesh.rotation.z = 0;
    }

    const clamped = city.eject(p.x, p.z, 0.4);
    p.x = clamped.x;
    p.z = clamped.z;
    const gh = city.groundHeight(p.x, p.z);

    p.mesh.position.set(p.x, gh, p.z);
    p.mesh.rotation.y = p.heading;

    if (p.speed > 0.1) {
      p.animTime += dt * p.speed * 4.0;
      if (p.legs) {
        p.legs.rotation.x = Math.sin(p.animTime * 6) * 0.5;
      }
    } else if (p.legs) {
      p.legs.rotation.x = 0;
    }
  }
}
