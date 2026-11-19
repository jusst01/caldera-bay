export const REP_TIERS = [
  { name: 'Nobody', min: 0, index: 0 },
  { name: 'Runner', min: 100, index: 1 },
  { name: 'Wheelman', min: 250, index: 2 },
  { name: 'Fixer', min: 500, index: 3 },
  { name: 'Broker', min: 900, index: 4 },
  { name: 'Leyenda', min: 1400, index: 5 }
];

export function tierFor(rep) {
  let current = REP_TIERS[0];
  for (const t of REP_TIERS) {
    if (rep >= t.min) current = t;
  }
  return current;
}

export function emptySave() {
  return {
    version: 1,
    cash: 250,
    rep: 0,
    missionIndex: 0,
    jobsDone: 0,
    takeover: { muelle: 0, paseo: 0, verde: 0, ceniza: 0, cumbre: 0 },
    ammo: [[0, 0], [12, 60], [30, 120], [6, 24]],
    armour: 0,
    ownedCars: [],
    stats: {
      carsStolen: 0,
      topSpeed: 0,
      maxHeat: 0,
      contractsDone: 0,
      trialsWon: 0,
      jobsFailed: 0,
      trialRep: [false, false, false]
    },
    playtimeSec: 0,
    radioStation: 0,
    lastSaveClock: ''
  };
}

export function canonicalSave() {
  return {
    version: 1,
    cash: 4210,
    rep: 520,
    missionIndex: 6,
    jobsDone: 6,
    takeover: { muelle: 100, paseo: 80, verde: 60, ceniza: 30, cumbre: 10 },
    ammo: [[0, 0], [12, 48], [30, 90], [6, 18]],
    armour: 60,
    ownedCars: [
      { spec: 'zorro', durability: 86 },
      { spec: 'corsario', durability: 91 },
      { spec: 'mula', durability: 74 },
      { spec: 'sirena', durability: 100 }
    ],
    stats: {
      carsStolen: 41,
      topSpeed: 247,
      maxHeat: 5,
      contractsDone: 9,
      trialsWon: 4,
      jobsFailed: 1,
      trialRep: [true, true, true]
    },
    playtimeSec: 8712,
    radioStation: 0,
    lastSaveClock: '14:32'
  };
}

export function takeoverCount(save) {
  let count = 0;
  if (!save || !save.takeover) return 0;
  for (const val of Object.values(save.takeover)) {
    if (val >= 50) count++;
  }
  return count;
}

export function loadSave() {
  try {
    const raw = localStorage.getItem('caldera_save_v1');
    if (!raw) return null;
    const data = JSON.parse(raw);
    const def = emptySave();
    return {
      ...def,
      ...data,
      takeover: { ...def.takeover, ...(data.takeover || {}) },
      stats: { ...def.stats, ...(data.stats || {}) },
      ownedCars: data.ownedCars || def.ownedCars,
      ammo: data.ammo || def.ammo
    };
  } catch (e) {
    console.error('Failed to load save:', e);
    return null;
  }
}

export function storeSave(save) {
  try {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    save.lastSaveClock = `${hh}:${mm}`;
    localStorage.setItem('caldera_save_v1', JSON.stringify(save));
  } catch (e) {
    console.error('Failed to store save:', e);
  }
}

export function clearSave() {
  try {
    localStorage.removeItem('caldera_save_v1');
  } catch (e) {}
}
