import * as THREE from 'three';
import { ROSTER, getVehicleSpec, createCarMesh } from './vehicles.js';
import { DISTRICTS, districtAt } from './city.js';

export const SHOP_POS = {
  weapons: [320, 192],
  spray: [-384, -192],
  chop: [-320, -256],
  garage: [-256, 448],
  safehouse: [-320, 320]
};

export const TRIALS = [
  {
    id: 0,
    name: 'Dock Sprint',
    fee: 100,
    targetSec: 70,
    cash: 300,
    rep: 15,
    checkpoints: [
      [-300, 300],
      [-200, 200],
      [-100, 300],
      [-256, 384]
    ]
  },
  {
    id: 1,
    name: 'Boulevard Loop',
    fee: 100,
    targetSec: 105,
    cash: 500,
    rep: 20,
    checkpoints: [
      [330, 60],
      [330, 200],
      [200, 200],
      [200, -100],
      [330, -100],
      [330, 60]
    ]
  },
  {
    id: 2,
    name: 'Ridge Climb',
    fee: 100,
    targetSec: 125,
    cash: 800,
    rep: 25,
    checkpoints: [
      [300, -300],
      [150, -350],
      [0, -400],
      [-150, -450],
      [0, -500]
    ]
  }
];

export function createEconomy(ctx) {
  let activeContract = null;
  let contractCooldown = 0;
  let activeTrial = null;
  let trialCheckpointIdx = 0;
  let trialTimer = 0;

  return {
    get activeContract() { return activeContract; },
    get activeTrial() { return activeTrial; },
    buyAmmo(slot) {
      if (ctx.save.rep < 250) return 'Locked: Requires Wheelman REP (250)';
      const prices = [0, 30, 60, 120];
      const cost = prices[slot];
      if (ctx.save.cash < cost) return 'Not enough cash';
      ctx.save.cash -= cost;
      ctx.combat.ammo[slot][0] = slot === 1 ? 12 : slot === 2 ? 30 : 6.0;
      ctx.combat.ammo[slot][1] = slot === 1 ? 60 : slot === 2 ? 120 : 24;
      ctx.changed();
      return `Purchased ammo for $${cost}`;
    },
    buyArmour() {
      if (ctx.save.rep < 250) return 'Locked: Requires Wheelman REP (250)';
      const cost = 150;
      if (ctx.save.cash < cost) return 'Not enough cash';
      ctx.save.cash -= cost;
      ctx.combat.armour = 100;
      ctx.changed();
      return 'Purchased body armour ($150)';
    },
    respray(car) {
      const cost = 200;
      if (ctx.save.cash < cost) return 'Not enough cash ($200)';
      ctx.save.cash -= cost;
      ctx.police.respray();
      if (car && car.mesh) {
        // Recolor mesh children
        car.mesh.traverse(child => {
          if (child.isMesh && child.material && !child.material.transparent) {
            child.material.color.setHex(Math.random() * 0xffffff);
          }
        });
      }
      ctx.changed();
      return 'Vehicle resprayed ($200) — heat cleared.';
    },
    repair(car) {
      const cost = 80;
      if (ctx.save.cash < cost) return 'Not enough cash ($80)';
      ctx.save.cash -= cost;
      if (car) {
        car.durability = 100;
      }
      ctx.changed();
      return 'Vehicle repaired ($80)';
    },
    sellCar(car) {
      if (!car || car.police || car.jobCar) return 'Cannot chop this vehicle.';
      // Check if owned car
      const isOwned = car.owned || ctx.save.ownedCars.some(oc => oc.spec === car.spec.id);
      if (isOwned) return 'Refused: This is an owned garage vehicle.';
      const chopVal = car.spec.chop || 50;
      ctx.save.cash += chopVal;
      ctx.save.stats.carsStolen++;
      // Remove car from traffic
      const idx = ctx.traffic.cars.indexOf(car);
      if (idx >= 0) ctx.traffic.cars.splice(idx, 1);
      ctx.scene.remove(car.mesh);
      if (ctx.player.car === car) {
        ctx.player.mode = 'foot';
        ctx.player.car = null;
        ctx.scene.add(ctx.playerMesh);
      }
      ctx.changed();
      return `Sold car to chop shop for $${chopVal}`;
    },
    storeCurrentCar() {
      if (ctx.save.rep < 500) return 'Locked: Requires Fixer REP (500)';
      if (ctx.save.ownedCars.length >= 4) return 'Garage full (max 4 cars)';
      if (!ctx.player.car || ctx.player.car.police || ctx.player.car.jobCar) return 'Invalid vehicle to store';
      const specId = ctx.player.car.spec.id;
      const dur = ctx.player.car.durability || 100;
      ctx.save.ownedCars.push({ spec: specId, durability: dur });
      // Remove from traffic
      const idx = ctx.traffic.cars.indexOf(ctx.player.car);
      if (idx >= 0) ctx.traffic.cars.splice(idx, 1);
      ctx.scene.remove(ctx.player.car.mesh);
      ctx.player.mode = 'foot';
      ctx.player.car = null;
      ctx.scene.add(ctx.playerMesh);
      ctx.changed();
      return 'Vehicle stored in garage.';
    },
    recallCar(i) {
      if (i < 0 || i >= ctx.save.ownedCars.length) return 'Invalid car index';
      const entry = ctx.save.ownedCars[i];
      const spec = getVehicleSpec(entry.spec);
      const mesh = createCarMesh(entry.spec);
      ctx.scene.add(mesh);
      mesh.position.set(SHOP_POS.garage[0] + 4, 0, SHOP_POS.garage[1]);
      const car = {
        mesh,
        spec,
        x: SHOP_POS.garage[0] + 4,
        z: SHOP_POS.garage[1],
        speed: 0,
        heading: 0,
        stolen: false,
        durability: entry.durability,
        owned: true
      };
      ctx.traffic.cars.push(car);
      ctx.save.ownedCars.splice(i, 1);
      ctx.changed();
      return `Recalled ${spec.name} to garage lot.`;
    },
    repairStoredCar(i) {
      if (i < 0 || i >= ctx.save.ownedCars.length) return 'Invalid index';
      const cost = 80;
      if (ctx.save.cash < cost) return 'Not enough cash';
      ctx.save.cash -= cost;
      ctx.save.ownedCars[i].durability = 100;
      ctx.changed();
      return 'Stored car repaired ($80)';
    },
    sellStoredCar(i) {
      if (i < 0 || i >= ctx.save.ownedCars.length) return 'Invalid index';
      const entry = ctx.save.ownedCars[i];
      const spec = getVehicleSpec(entry.spec);
      const val = spec.chop || 50;
      ctx.save.cash += val;
      ctx.save.ownedCars.splice(i, 1);
      ctx.changed();
      return `Sold stored ${spec.name} for $${val}`;
    },
    acceptContract() {
      if (ctx.save.rep < 100) return 'Locked: Requires Runner REP (100)';
      if (activeContract) return 'Contract already active';
      if (contractCooldown > 0) return `Contract cooldown: ${Math.ceil(contractCooldown)}s`;
      const catalogIdx = (ctx.save.stats.contractsDone * 5 + 3) % 9;
      const spec = ROSTER[catalogIdx];
      activeContract = {
        spec,
        timeLeft: 240
      };
      return `Contract accepted: Steal & deliver ${spec.name}`;
    },
    startTrial(trialId) {
      if (activeTrial) return 'Trial already active';
      const trial = TRIALS[trialId];
      if (!trial) return 'Invalid trial';
      if (ctx.save.cash < trial.fee) return 'Not enough cash for entry fee ($100)';
      ctx.save.cash -= trial.fee;
      activeTrial = trial;
      trialCheckpointIdx = 0;
      trialTimer = 0;
      return `Started trial: ${trial.name}`;
    },
    travelTo(districtId) {
      if (ctx.save.rep < 900) return 'Locked: Requires Broker REP (900)';
      if (ctx.police.heat > 0) return 'Cannot fast travel during police pursuit';
      if (ctx.missions.jobActive()) return 'Cannot fast travel during an active mission';
      if (activeContract || activeTrial) return 'Cannot fast travel during active contract/trial';
      const dist = DISTRICTS.find(d => d.id === districtId);
      if (!dist) return 'Invalid district';
      ctx.player.x = dist.center[0];
      ctx.player.z = dist.center[1];
      if (ctx.player.mode === 'drive' && ctx.player.car) {
        ctx.player.car.x = dist.center[0];
        ctx.player.car.z = dist.center[1];
        ctx.player.car.mesh.position.set(dist.center[0], 0, dist.center[1]);
      } else {
        ctx.playerMesh.position.set(dist.center[0], 0.9, dist.center[1]);
      }
      return `Fast traveled to ${dist.name}`;
    },
    marker() {
      if (activeContract) return SHOP_POS.chop;
      if (activeTrial) return activeTrial.checkpoints[trialCheckpointIdx];
      return null;
    },
    contractInfo() {
      if (!activeContract) return contractCooldown > 0 ? `Next contract in ${Math.ceil(contractCooldown)}s` : 'No active contract';
      return `Contract: Deliver ${activeContract.spec.name} (${Math.ceil(activeContract.timeLeft)}s)`;
    },
    trialInfo() {
      if (!activeTrial) return '';
      return `Trial: ${activeTrial.name} (CP ${trialCheckpointIdx+1}/${activeTrial.checkpoints.length})`;
    },
    reset() {
      activeContract = null;
      contractCooldown = 0;
      activeTrial = null;
      trialCheckpointIdx = 0;
      trialTimer = 0;
    },
    openWeaponShop() {
      ctx.openMenu({
        title: 'WEAPONS & ARMOUR SHOP',
        build: () => ({
          subtitle: `Cash: $${ctx.save.cash} | REP: ${ctx.save.rep}`,
          rows: [
            { label: 'Chispa Pistol Ammo ($30)', action: () => this.buyAmmo(1) },
            { label: 'Zumbido SMG Ammo ($60)', action: () => this.buyAmmo(2) },
            { label: 'Trueno Shotgun Ammo ($120)', action: () => this.buyAmmo(3) },
            { label: 'Body Armour ($150)', action: () => this.buyArmour() },
            { label: 'Leave', action: () => 'close' }
          ]
        })
      });
    },
    openChopShop() {
      ctx.openMenu({
        title: 'CHOP SHOP & CONTRACTS',
        build: () => ({
          subtitle: this.contractInfo(),
          rows: [
            { label: 'Accept Chop Contract', action: () => this.acceptContract() },
            { label: 'Sell Current Vehicle', action: () => this.sellCar(ctx.player.car) },
            { label: 'Leave', action: () => 'close' }
          ]
        })
      });
    },
    openSafehouse() {
      ctx.openMenu({
        title: 'SAFEHOUSE & FAST TRAVEL',
        build: () => ({
          subtitle: `Broker REP required for travel`,
          rows: [
            { label: 'Travel to Muelle Viejo', action: () => this.travelTo('muelle') },
            { label: 'Travel to Paseo Dorado', action: () => this.travelTo('paseo') },
            { label: 'Travel to Alto Verde', action: () => this.travelTo('verde') },
            { label: 'Travel to Distrito Ceniza', action: () => this.travelTo('ceniza') },
            { label: 'Travel to La Cumbre', action: () => this.travelTo('cumbre') },
            { label: 'Leave', action: () => 'close' }
          ]
        })
      });
    },
    update(dt) {
      if (contractCooldown > 0) contractCooldown -= dt;
      if (activeContract) {
        activeContract.timeLeft -= dt;
        if (activeContract.timeLeft <= 0) {
          activeContract = null;
          contractCooldown = 60;
          ctx.notify('Contract expired.');
        } else {
          // Check chop point delivery
          const chopPos = SHOP_POS.chop;
          const dist = Math.hypot(ctx.player.x - chopPos[0], ctx.player.z - chopPos[1]);
          if (dist <= 15 && ctx.player.mode === 'drive' && ctx.player.car) {
            if (ctx.player.car.spec.id === activeContract.spec.id && !ctx.player.car.owned) {
              const chopVal = activeContract.spec.chop || 100;
              const payout = chopVal + 150;
              ctx.save.cash += payout;
              ctx.save.rep += 10;
              ctx.save.stats.contractsDone++;
              ctx.save.takeover.ceniza = Math.min(100, ctx.save.takeover.ceniza + 5);
              // Remove car
              const car = ctx.player.car;
              const idx = ctx.traffic.cars.indexOf(car);
              if (idx >= 0) ctx.traffic.cars.splice(idx, 1);
              ctx.scene.remove(car.mesh);
              ctx.player.mode = 'foot';
              ctx.player.car = null;
              ctx.scene.add(ctx.playerMesh);

              activeContract = null;
              contractCooldown = 180;
              ctx.notify(`Contract complete! Payout: $${payout} + 10 REP`);
            }
          }
        }
      }

      if (activeTrial) {
        trialTimer += dt;
        const cp = activeTrial.checkpoints[trialCheckpointIdx];
        const dist = Math.hypot(ctx.player.x - cp[0], ctx.player.z - cp[1]);
        if (dist <= 17) {
          trialCheckpointIdx++;
          if (trialCheckpointIdx >= activeTrial.checkpoints.length) {
            // Trial won!
            const won = trialTimer <= activeTrial.targetSec;
            if (won) {
              ctx.save.cash += activeTrial.cash;
              ctx.save.stats.trialsWon++;
              let repPaid = 0;
              if (!ctx.save.stats.trialRep[activeTrial.id]) {
                ctx.save.stats.trialRep[activeTrial.id] = true;
                ctx.save.rep += activeTrial.rep;
                repPaid = activeTrial.rep;
              }
              ctx.notify(`Trial Won! ${activeTrial.name} — $${activeTrial.cash}${repPaid > 0 ? ` + ${repPaid} REP` : ''}`);
            } else {
              ctx.notify(`Trial finished over target time (${Math.ceil(trialTimer)}s). No reward.`);
            }
            activeTrial = null;
          }
        }
      }
    },
    registerInteractables(reg) {
      // Weapons shop
      reg({
        pos: SHOP_POS.weapons,
        radius: 6,
        label: () => '[E] Weapons Shop',
        action: () => {
          ctx.openMenu({
            title: 'WEAPONS & ARMOUR SHOP',
            build: () => ({
              subtitle: `Cash: $${ctx.save.cash} | REP: ${ctx.save.rep}`,
              rows: [
                { label: 'Chispa Pistol Ammo ($30)', action: () => this.buyAmmo(1) },
                { label: 'Zumbido SMG Ammo ($60)', action: () => this.buyAmmo(2) },
                { label: 'Trueno Shotgun Ammo ($120)', action: () => this.buyAmmo(3) },
                { label: 'Body Armour ($150)', action: () => this.buyArmour() },
                { label: 'Leave', action: () => 'close' }
              ]
            })
          });
        }
      });

      // Spray shop
      reg({
        pos: SHOP_POS.spray,
        radius: 6,
        label: () => ctx.missions.resprayStageActive() ? '[E] RESPKRAY (Mission)' : '[E] Respray ($200)',
        action: () => {
          if (ctx.missions.resprayStageActive()) {
            ctx.missions.onRespray();
          } else {
            ctx.notify(this.respray(ctx.player.mode === 'drive' ? ctx.player.car : null));
          }
        }
      });

      // Chop shop & Contracts
      reg({
        pos: SHOP_POS.chop,
        radius: 6,
        label: () => '[E] Chop Shop & Contracts',
        action: () => {
          ctx.openMenu({
            title: 'CHOP SHOP & CONTRACTS',
            build: () => ({
              subtitle: this.contractInfo(),
              rows: [
                { label: 'Accept Chop Contract', action: () => this.acceptContract() },
                { label: 'Sell Current Vehicle', action: () => this.sellCar(ctx.player.car) },
                { label: 'Leave', action: () => 'close' }
              ]
            })
          });
        }
      });

      // Garage
      reg({
        pos: SHOP_POS.garage,
        radius: 6,
        label: () => '[E] Iris\'s Garage',
        action: () => {
          ctx.openGarage();
        }
      });

      // Safehouse
      reg({
        pos: SHOP_POS.safehouse,
        radius: 6,
        label: () => '[E] Safehouse & Fast Travel',
        action: () => {
          ctx.openMenu({
            title: 'SAFEHOUSE & FAST TRAVEL',
            build: () => ({
              subtitle: `Broker REP required for travel`,
              rows: [
                { label: 'Travel to Muelle Viejo', action: () => this.travelTo('muelle') },
                { label: 'Travel to Paseo Dorado', action: () => this.travelTo('paseo') },
                { label: 'Travel to Alto Verde', action: () => this.travelTo('verde') },
                { label: 'Travel to Distrito Ceniza', action: () => this.travelTo('ceniza') },
                { label: 'Travel to La Cumbre', action: () => this.travelTo('cumbre') },
                { label: 'Leave', action: () => 'close' }
              ]
            })
          });
        }
      });

      // Time Trials
      TRIALS.forEach((t, tid) => {
        reg({
          pos: t.checkpoints[0],
          radius: 8,
          label: () => `[E] Start Trial: ${t.name} ($${t.fee})`,
          action: () => {
            ctx.notify(this.startTrial(tid));
          }
        });
      });
    }
  };
}
