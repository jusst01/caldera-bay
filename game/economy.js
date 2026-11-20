// CALDERA BAY — economy.js
// Cash, shops, garages, chop contracts, time trials, REP unlocks, and district takeover trickle.

import * as saveModule from './save.js';

export const SHOP_POS = {
  weapons: [320, 192],
  spray: [-384, -192],
  chop: [-320, -256],
  garage: [-256, 448],
  safehouse: [-320, 320]
};

export const PRICES = {
  ammo: [0, 30, 60, 120],
  armour: 150,
  respray: 200,
  repair: 80,
  garage: 1500,
  safehouse: 2000
};

export const CONTRACT_ROSTER = [
  'colibri', 'sirena', 'caimán', 'mula-4x4', 'bóxer', 'fantasma',
  'corsario-s', 'zorro-gt', 'relámpago', 'fénix', 'perro', 'zorro-gt'
];

export function createEconomy(ctx) {
  let activeContract = null; // { spec, timeLeft }
  let contractCooldown = 0;
  let activeTrial = null; // { id, cpIndex, timer, active }
  let trickleTimer = 0;

  function update(dt) {
    if (activeContract) {
      activeContract.timeLeft -= dt;
      if (activeContract.timeLeft <= 0) {
        activeContract = null;
        contractCooldown = 60;
      }
    } else if (contractCooldown > 0) {
      contractCooldown -= dt;
    }

    if (activeTrial && activeTrial.active) {
      activeTrial.timer += dt;
    }

    // Takeover trickle: +$50/min (or per minute timer) for owned districts (>=50)
    trickleTimer += dt;
    if (trickleTimer >= 60) {
      trickleTimer = 0;
      const save = ctx.save;
      if (save && save.takeover) {
        let ownedCount = 0;
        for (const d in save.takeover) {
          if (save.takeover[d] >= 50) ownedCount++;
        }
        if (ownedCount > 0) {
          const payout = ownedCount * 50;
          ctx.addCash(payout);
          ctx.notify(`District Takeover Trickle: +$${payout}`);
        }
      }
    }
  }

  function buyAmmo(slot) {
    const save = ctx.save;
    const cost = PRICES.ammo[slot] || 50;
    if (save.cash < cost) return 'Not enough cash!';
    if (ctx.refillAmmo(slot)) {
      save.cash -= cost;
      return 'Ammo refilled successfully.';
    }
    return 'Cannot refill ammo.';
  }

  function buyArmour() {
    const save = ctx.save;
    if (save.cash < PRICES.armour) return 'Not enough cash!';
    save.cash -= PRICES.armour;
    ctx.setArmour(100);
    return 'Armour purchased (100%).';
  }

  function resprayCar(car) {
    const save = ctx.save;
    if (save.cash < PRICES.respray) return 'Not enough cash!';
    save.cash -= PRICES.respray;
    ctx.resprayVehicle(car);
    return 'Vehicle resprayed, police heat dropping.';
  }

  function repairCar(car) {
    const save = ctx.save;
    if (save.cash < PRICES.repair) return 'Not enough cash!';
    save.cash -= PRICES.repair;
    if (car) {
      car.durability = 100;
      car.engineDead = false;
    }
    return 'Vehicle fully repaired.';
  }

  function storeCurrentCar() {
    const save = ctx.save;
    const car = ctx.playerCar;
    if (!car || ctx.playerOnFoot) return 'No active car to store!';
    if (save.ownedCars.length >= 4) return 'Garage full (max 4 cars)!';
    if (ctx.isJobCar(car)) return 'Cannot store mission vehicle!';
    save.ownedCars.push({ spec: car.spec.id, durability: car.durability || 100 });
    ctx.removePlayerCar();
    return 'Vehicle stored in garage.';
  }

  function recallCar(i) {
    const save = ctx.save;
    if (i < 0 || i >= save.ownedCars.length) return 'Invalid garage slot.';
    const entry = save.ownedCars[i];
    ctx.spawnOwnedCar(entry);
    return `Rolled out ${entry.spec.toUpperCase()}.`;
  }

  function sellStoredCar(i) {
    const save = ctx.save;
    if (i < 0 || i >= save.ownedCars.length) return 'Invalid garage slot.';
    const entry = save.ownedCars.splice(i, 1)[0];
    const spec = ctx.getVehicleSpec(entry.spec);
    const price = spec ? spec.chop : 100;
    save.cash += price;
    return `Sold stored car for $${price}.`;
  }

  function acceptContract() {
    if (activeContract) return 'Contract already active.';
    if (contractCooldown > 0) return `Contract on cooldown (${Math.ceil(contractCooldown)}s).`;
    const save = ctx.save;
    const idx = Math.floor((save.stats.contractsDone * 5 + 3)) % CONTRACT_ROSTER.length;
    const specId = CONTRACT_ROSTER[idx];
    activeContract = { spec: specId, timeLeft: 240 };
    return `Accepted chop contract: Deliver ${specId.toUpperCase()} within 4m.`;
  }

  function checkContractDelivery(car, pos) {
    if (!activeContract || !car) return false;
    if (car.spec.id === activeContract.spec) {
      const chopPos = SHOP_POS.chop;
      const dist = Math.hypot(pos.x - chopPos[0], pos.z - chopPos[1]);
      if (dist < 16) {
        const spec = ctx.getVehicleSpec(activeContract.spec);
        const payout = (spec ? spec.chop : 100) + 150;
        ctx.addCash(payout);
        ctx.addRep(10);
        ctx.addTakeover('ceniza', 5);
        ctx.save.stats.contractsDone++;
        activeContract = null;
        contractCooldown = 180;
        ctx.notify(`Contract complete! Payout: $${payout}`);
        return true;
      }
    }
    return false;
  }

  function travelTo(districtId) {
    const save = ctx.save;
    const tier = saveModule.tierFor(save.rep);
    if (tier.index < 4) return 'Fast travel requires Broker REP (Tier 4).';
    if (ctx.policeHeat() >= 1) return 'Cannot fast travel while wanted!';
    if (ctx.jobActive()) return 'Cannot fast travel during active mission!';
    if (activeContract || (activeTrial && activeTrial.active)) return 'Cannot fast travel during contract/trial!';
    ctx.teleportToDistrict(districtId);
    return `Fast traveled to ${districtId.toUpperCase()}.`;
  }

  return {
    update,
    buyAmmo,
    buyArmour,
    resprayCar,
    repairCar,
    storeCurrentCar,
    recallCar,
    sellStoredCar,
    acceptContract,
    checkContractDelivery,
    travelTo,
    getActiveContract: () => activeContract,
    reset: () => { activeContract = null; contractCooldown = 0; activeTrial = null; }
  };
}
