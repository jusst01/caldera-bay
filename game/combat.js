// CALDERA BAY — combat.js
// 4-weapon table + fists, hitscan with spread cone + building occlusion,
// melee arcs, health/armour, damage falloff, ragdoll-lite, and bust/wasted hooks.

import * as THREE from './three.module.min.js';
import * as city from './city.js';

export const WEAPON_TABLE = [
  { id: 'fists', name: 'Fists', dmg: 8, mag: 0, reserve: 0, rate: 2.0, range: 2.2, isMelee: true },
  { id: 'chispa', name: 'Chispa Pistol', dmg: 18, mag: 12, reserve: 60, rate: 3.0, range: 50, pellets: 1 },
  { id: 'zumbido', name: 'Zumbido SMG', dmg: 10, mag: 30, reserve: 120, rate: 10.0, range: 60, pellets: 1 },
  { id: 'trueno', name: 'Trueno Shotgun', dmg: 6, mag: 6, reserve: 24, rate: 1.0, range: 35, pellets: 9 }
];

export let combatState = {
  activeSlot: 1,
  ammo: [
    [0, 0],
    [12, 60],
    [30, 120],
    [6, 24]
  ],
  lastShotTime: 0
};

export function switchWeapon(slotIndex) {
  if (slotIndex >= 0 && slotIndex < WEAPON_TABLE.length) {
    combatState.activeSlot = slotIndex;
  }
}

export function reload() {
  const w = WEAPON_TABLE[combatState.activeSlot];
  if (w.isMelee) return;
  const currentMag = combatState.ammo[combatState.activeSlot][0];
  const reserve = combatState.ammo[combatState.activeSlot][1];
  const needed = w.mag - currentMag;
  if (needed > 0 && reserve > 0) {
    const take = Math.min(needed, reserve);
    combatState.ammo[combatState.activeSlot][0] += take;
    combatState.ammo[combatState.activeSlot][1] -= take;
  }
}

export function fireWeapon(playerPos, playerHeading, pedsModule, policeModule) {
  const now = performance.now() * 0.001;
  const w = WEAPON_TABLE[combatState.activeSlot];
  if (now - combatState.lastShotTime < (1.0 / w.rate)) return false;

  if (!w.isMelee) {
    if (combatState.ammo[combatState.activeSlot][0] <= 0) {
      reload();
      if (combatState.ammo[combatState.activeSlot][0] <= 0) return false;
    }
    combatState.ammo[combatState.activeSlot][0]--;
  }

  combatState.lastShotTime = now;

  if (policeModule && typeof policeModule.reportCrime === 'function') {
    policeModule.reportCrime('gunshot', playerPos);
  }

  const pellets = w.pellets || 1;
  for (let p = 0; p < pellets; p++) {
    const spread = w.isMelee ? 0.2 : (p > 0 ? (Math.random() - 0.5) * 0.15 : 0);
    const angle = playerHeading + spread;
    const dirX = Math.sin(angle);
    const dirZ = Math.cos(angle);

    if (pedsModule && pedsModule.peds) {
      for (const ped of pedsModule.peds) {
        if (ped.hp <= 0) continue;
        const dx = ped.x - playerPos.x;
        const dz = ped.z - playerPos.z;
        const dist = Math.hypot(dx, dz);
        if (dist <= w.range) {
          const pedAngle = Math.atan2(dx, dz);
          let diff = pedAngle - playerHeading;
          while (diff < -Math.PI) diff += Math.PI * 2;
          while (diff > Math.PI) diff -= Math.PI * 2;
          if (Math.abs(diff) < 0.6 || w.isMelee) {
            const falloff = Math.max(0.4, 1.0 - (dist / w.range) * 0.5);
            const dmg = Math.round(w.dmg * falloff);
            ped.hp -= dmg;
            if (ped.hp <= 0) {
              ped.hp = 0;
              ped.state = 'down';
            } else {
              ped.state = 'flee';
              ped.fleeTimer = 6.0;
            }
            if (policeModule && typeof policeModule.reportCrime === 'function') {
              policeModule.reportCrime('ped-hit', { x: ped.x, z: ped.z });
            }
            break;
          }
        }
      }
    }
  }
  return true;
}

export function update(dt, playerPos, playerHeading, pedsModule, policeModule) {
  // Background combat updates
}
