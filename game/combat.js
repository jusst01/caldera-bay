import * as THREE from 'three';

export const WEAPONS = [
  { id: 0, name: 'Fists', dmg: 8, mag: 0, reserve: 0, rate: 2, spread: 0 },
  { id: 1, name: 'Chispa Pistol', dmg: 18, mag: 12, reserve: 60, rate: 3, spread: 0.02 },
  { id: 2, name: 'Zumbido SMG', dmg: 10, mag: 30, reserve: 120, rate: 10, spread: 0.05 },
  { id: 3, name: 'Trueno Shotgun', dmg: 6, pellets: 9, mag: 6, reserve: 24, rate: 1, spread: 0.12 }
];

export function createCombat(hudRoot) {
  let activeSlot = 1;
  let health = 100;
  let armour = 0;
  const ammo = [
    [0, 0],
    [12, 60],
    [30, 120],
    [6, 24]
  ]; // [mag, reserve] per slot

  // Build DOM Weapon Wheel display
  const wheelEl = document.createElement('div');
  wheelEl.style.cssText = 'position:fixed; bottom:20px; right:20px; background:rgba(0,0,0,0.8); color:#fff; padding:10px; border-radius:8px; font-size:14px; pointer-events:none; z-index:100; display:none;';
  hudRoot.appendChild(wheelEl);

  function updateDisplay() {
    let html = '<b>WEAPON WHEEL</b><br/>';
    WEAPONS.forEach((w, idx) => {
      const active = idx === activeSlot ? '→ ' : '  ';
      const am = w.mag === 0 ? '-' : `${ammo[idx][0]}/${ammo[idx][1]}`;
      html += `${active}[${idx+1}] ${w.name} (${am})<br/>`;
    });
    html += `HP: ${health} | ARMOUR: ${armour}`;
    wheelEl.innerHTML = html;
  }
  updateDisplay();

  return {
    get health() { return health; },
    set health(v) { health = Math.max(0, Math.min(100, v)); updateDisplay(); },
    get armour() { return armour; },
    set armour(v) { armour = Math.max(0, Math.min(100, v)); updateDisplay(); },
    get activeSlot() { return activeSlot; },
    setSlot(slot) { if (slot >= 0 && slot < 4) { activeSlot = slot; updateDisplay(); } },
    showWheel() { wheelEl.style.display = 'block'; },
    get isWheelOpen() { return wheelEl.style.display === 'block'; },
    ammo,
    takeDamage(amount) {
      if (armour > 0) {
        const abs = Math.min(armour, amount);
        armour -= abs;
        amount -= abs;
      }
      health = Math.max(0, health - amount);
      updateDisplay();
    },
    shoot(onGunshot) {
      const w = WEAPONS[activeSlot];
      if (w.mag > 0) {
        if (ammo[activeSlot][0] > 0) {
          ammo[activeSlot][0]--;
          if (onGunshot) onGunshot();
          updateDisplay();
          return true;
        } else if (ammo[activeSlot][1] > 0) {
          // Auto reload
          const needed = w.mag - ammo[activeSlot][0];
          const take = Math.min(needed, ammo[activeSlot][1]);
          ammo[activeSlot][0] += take;
          ammo[activeSlot][1] -= take;
          updateDisplay();
        }
      } else {
        if (onGunshot) onGunshot();
        return true;
      }
      return false;
    }
  };
}
