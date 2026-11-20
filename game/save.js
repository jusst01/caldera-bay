// CALDERA BAY — save.js
// localStorage persistence, canonical snapshot, REP tiers, and state export/import hooks.

export const REP_TIERS = [
  { name: 'Nobody', min: 0 },
  { name: 'Runner', min: 100 },
  { name: 'Wheelman', min: 250 },
  { name: 'Fixer', min: 500 },
  { name: 'Broker', min: 900 },
  { name: 'Leyenda', min: 1400 }
];

export function tierFor(rep) {
  let current = REP_TIERS[0];
  let index = 0;
  for (let i = 0; i < REP_TIERS.length; i++) {
    if (rep >= REP_TIERS[i].min) {
      current = REP_TIERS[i];
      index = i;
    }
  }
  return { name: current.name, index };
}

export function emptySave() {
  return {
    version: 1,
    cash: 250,
    rep: 0,
    missionIndex: 0,
    jobsDone: 0,
    takeover: { muelle: 0, paseo: 0, verde: 0, ceniza: 0, cumbre: 0 },
    ammo: [
      [0, 0],
      [12, 60],
      [30, 120],
      [6, 24]
    ],
    armour: 0,
    ownedCars: [],
    stats: {
      carsStolen: 0,
      topSpeed: 0,
      maxHeat: 0,
      contractsDone: 0,
      trialsWon: 0,
      jobsFailed: 0
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
    ammo: [
      [0, 0],
      [12, 48],
      [30, 90],
      [6, 18]
    ],
    armour: 60,
    ownedCars: [
      { spec: 'zorro-gt', durability: 86 },
      { spec: 'corsario-s', durability: 91 },
      { spec: 'mula-4x4', durability: 74 },
      { spec: 'sirena', durability: 100 }
    ],
    stats: {
      carsStolen: 41,
      topSpeed: 247,
      maxHeat: 5,
      contractsDone: 9,
      trialsWon: 4,
      jobsFailed: 1
    },
    playtimeSec: 8712,
    radioStation: 0,
    lastSaveClock: '14:32'
  };
}

export function takeoverCount(save) {
  let count = 0;
  if (!save || !save.takeover) return 0;
  for (const d in save.takeover) {
    if (save.takeover[d] >= 50) count++;
  }
  return count;
}

const SAVE_KEY = 'caldera_save_v1';

export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.version !== 1) return null;
    const def = emptySave();
    return Object.assign(def, data, {
      takeover: Object.assign({}, def.takeover, data.takeover),
      stats: Object.assign({}, def.stats, data.stats)
    });
  } catch (e) {
    console.warn('Failed to load save:', e);
    return null;
  }
}

export function storeSave(save) {
  try {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    save.lastSaveClock = `${hh}:${mm}`;
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    return true;
  } catch (e) {
    console.warn('Failed to store save:', e);
    return false;
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
    return true;
  } catch (e) {
    return false;
  }
}

export function exportState(save) {
  return JSON.stringify(save);
}

export function importState(jsonStr) {
  try {
    const parsed = JSON.parse(jsonStr);
    if (parsed && parsed.version === 1) {
      storeSave(parsed);
      return parsed;
    }
  } catch (e) {}
  return null;
}
