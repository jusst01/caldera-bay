// CALDERA BAY — missions.js
// Job engine, stage verbs, hostiles management, set pieces, and all 8 story missions.

import * as THREE from './three.module.min.js';
import * as city from './city.js';

export const JOBS = [
  {
    title: 'Caldera Run',
    district: 'muelle',
    cash: 300,
    rep: 40,
    start: [-300, 300],
    intro: ['DOÑA IRIS', 'A quick delivery across the bay. Caldera Run.'],
    stages: [
      { verb: 'DRIVE_TO', at: [-256, 384] },
      { verb: 'DELIVER', at: [384, 64], radius: 14 },
      { verb: 'DRIVE_TO', at: [-320, 320] }
    ]
  },
  {
    title: 'Muelle Pickup',
    district: 'muelle',
    cash: 450,
    rep: 50,
    start: [-320, 320],
    intro: ['DOÑA IRIS', 'Pick up the crate in Muelle Viejo. Keep it cool.'],
    stages: [
      { verb: 'DRIVE_TO', at: [-448, 320] },
      { verb: 'SURVIVE', seconds: 40, floor: 30 },
      { verb: 'DELIVER', at: [-256, 384], radius: 14 }
    ]
  },
  {
    title: 'Ash Run',
    district: 'ceniza',
    cash: 600,
    rep: 60,
    start: [-256, 384],
    intro: ['TAVO REYES', 'Cruising through Ceniza. Keep your head down.'],
    stages: [
      { verb: 'DRIVE_TO', at: [-192, -320] },
      { verb: 'DRIVE_TO', at: [-320, -256] },
      { verb: 'DRIVE_TO', at: [-384, -192] }
    ]
  },
  {
    title: 'Vista Photo',
    district: 'paseo',
    cash: 800,
    rep: 70,
    start: [-384, -192],
    intro: ['DOÑA IRIS', 'Get some shots of the Paseo without drawing attention. Heat 0.'],
    stages: [
      { verb: 'DRIVE_TO', at: [256, 128] },
      { verb: 'DRIVE_TO', at: [384, 64] }
    ]
  },
  {
    title: 'Chop Run',
    district: 'ceniza',
    cash: 1000,
    rep: 80,
    start: [384, 64],
    intro: ['DOÑA IRIS', 'Three cars needed at the chop shop.'],
    stages: [
      { verb: 'CHECKLIST', specs: ['fantasma', 'zorro-gt', 'sirena'], at: [-320, -256], radius: 14, timeLimit: 360 },
      { verb: 'DRIVE_TO', at: [-192, -320] }
    ]
  },
  {
    title: 'Skyline Circuit',
    district: 'verde',
    cash: 1200,
    rep: 90,
    start: [-192, -320],
    intro: ['TAVO REYES', 'Time trial on the ridge. Ghost clock.'],
    stages: [
      { verb: 'DRIVE_TO', at: [300, -300] },
      { verb: 'DRIVE_TO', at: [0, -500] },
      { verb: 'DRIVE_TO', at: [320, -384] }
    ]
  },
  {
    title: 'The Long Haul',
    district: 'muelle',
    cash: 1600,
    rep: 110,
    start: [320, -384],
    intro: ['DOÑA IRIS', 'Long cross-map haul. Don\'t be late.'],
    stages: [
      { verb: 'DRIVE_TO', at: [320, 128] },
      { verb: 'DELIVER', at: [-448, 320], radius: 16, timeLimit: 300 }
    ]
  },
  {
    title: 'Caldera King',
    district: 'cumbre',
    cash: 2500,
    rep: 150,
    repGate: 1400,
    start: [0, -500],
    intro: ['DOÑA IRIS', 'This is it, Tavo. The Caldera King. Keep it at heat 5.'],
    stages: [
      { verb: 'STEAL_CAR', spec: 'zorro-gt', at: [64, -448] },
      { verb: 'SURVIVE', seconds: 60, floor: 150 },
      { verb: 'DELIVER', at: [0, -512], radius: 16, floor: 150 }
    ]
  }
];

export function createMissions(ctx) {
  let activeJobIndex = -1;
  let activeStageIndex = 0;
  let stageTimer = 0;
  let stageCar = null;
  let hostiles = [];
  let checklistDelivered = {};
  let lastObjectiveText = '';

  function reset() {
    activeJobIndex = -1;
    activeStageIndex = 0;
    stageTimer = 0;
    stageCar = null;
    hostiles = [];
    checklistDelivered = {};
    city.setFinaleDusk(false);
  }

  function jobActive() {
    return activeJobIndex >= 0 && activeJobIndex < JOBS.length;
  }

  function startJob(index, bypassCheck = false) {
    if (jobActive()) return false;
    const save = ctx.save;
    if (!bypassCheck && index !== save.missionIndex) return false;
    const job = JOBS[index];
    if (job.repGate && save.rep < job.repGate) {
      ctx.notify(`Requires ${job.repGate} REP to unlock!`);
      return false;
    }
    activeJobIndex = index;
    activeStageIndex = 0;
    stageTimer = 0;
    stageCar = null;
    hostiles = [];
    checklistDelivered = {};
    if (index === 7) {
      city.setFinaleDusk(true);
    }
    ctx.dialogue(job.intro[0], job.intro[1]);
    ctx.notify(`MISSION STARTED: ${job.title}`);
    initStage();
    return true;
  }

  function initStage() {
    const job = JOBS[activeJobIndex];
    if (!job) return;
    const stage = job.stages[activeStageIndex];
    stageTimer = stage.timeLimit || 0;
    hostiles = [];

    if (stage.verb === 'STEAL_CAR') {
      stageCar = ctx.spawnStageCar(stage.spec, stage.at);
    } else if (stage.verb === 'SHOOTOUT') {
      for (let i = 0; i < (stage.count || 3); i++) {
        const angle = (i / stage.count) * Math.PI * 2;
        const hx = stage.at[0] + Math.cos(angle) * 10;
        const hz = stage.at[1] + Math.sin(angle) * 10;
        const clamped = city.eject(hx, hz, 1.0);
        hostiles.push({
          x: clamped.x,
          z: clamped.z,
          hp: 45,
          alive: true,
          mesh: ctx.spawnHostileMesh(clamped.x, clamped.z)
        });
      }
    }
  }

  function update(dt) {
    if (!jobActive()) return;
    const job = JOBS[activeJobIndex];
    const stage = job.stages[activeStageIndex];

    if (stageTimer > 0) {
      stageTimer -= dt;
      if (stageTimer <= 0) {
        failJob('Mission time expired!');
        return;
      }
    }

    if (stage.floor && ctx.policePoints) {
      ctx.setMinimumPolicePoints(stage.floor);
    }

    const playerPos = ctx.playerPos();

    if (stage.verb === 'DRIVE_TO' || stage.verb === 'DELIVER' || stage.verb === 'RESPRAY') {
      const target = stage.at;
      const radius = stage.radius || 12;
      const dist = Math.hypot(playerPos.x - target[0], playerPos.z - target[1]);
      if (dist <= radius) {
        if (stage.verb === 'DELIVER' && stage.needCar) {
          if (ctx.playerOnFoot || (stageCar && ctx.playerCar !== stageCar)) {
            return; // Needs the stage car
          }
        }
        if (stage.verb === 'RESPRAY') {
          ctx.triggerRespray();
        }
        advanceStage();
      }
    } else if (stage.verb === 'STEAL_CAR') {
      if (stageCar && !ctx.playerOnFoot && ctx.playerCar === stageCar) {
        advanceStage();
      } else if (!stageCar || stageCar.durability <= 0) {
        // Respawn stage car if destroyed
        stageCar = ctx.spawnStageCar(stage.spec, stage.at);
      }
    } else if (stage.verb === 'SURVIVE') {
      stageTimer -= dt;
      if (stageTimer <= 0) {
        advanceStage();
      }
    } else if (stage.verb === 'SHOOTOUT') {
      let aliveCount = 0;
      for (const h of hostiles) {
        if (h.alive) aliveCount++;
      }
      if (aliveCount === 0) {
        advanceStage();
      }
    } else if (stage.verb === 'CHECKLIST') {
      const target = stage.at;
      const dist = Math.hypot(playerPos.x - target[0], playerPos.z - target[1]);
      if (dist <= (stage.radius || 14) && !ctx.playerOnFoot && ctx.playerCar) {
        const specId = ctx.playerCar.spec.id;
        if (stage.specs.includes(specId) && !checklistDelivered[specId]) {
          checklistDelivered[specId] = true;
          ctx.removePlayerCar();
          ctx.notify(`Delivered ${specId.toUpperCase()}`);
          let allDone = true;
          for (const s of stage.specs) {
            if (!checklistDelivered[s]) allDone = false;
          }
          if (allDone) {
            advanceStage();
          }
        }
      }
    }
  }

  function advanceStage() {
    const job = JOBS[activeJobIndex];
    activeStageIndex++;
    if (activeStageIndex >= job.stages.length) {
      completeJob();
    } else {
      initStage();
    }
  }

  function completeJob() {
    const job = JOBS[activeJobIndex];
    const save = ctx.save;
    save.cash += job.cash;
    save.rep += job.rep;
    save.jobsDone++;
    save.missionIndex++;
    save.takeover[job.district] = Math.min(100, (save.takeover[job.district] || 0) + 20);
    ctx.notify(`MISSION COMPLETE: +$${job.cash}, +${job.rep} REP`);
    ctx.dialogue('DOÑA IRIS', 'Clean work. The syndicate won\'t forget this.');
    city.setFinaleDusk(false);
    activeJobIndex = -1;
    activeStageIndex = 0;
    stageCar = null;
    ctx.persistSave();
  }

  function failJob(reason) {
    const job = JOBS[activeJobIndex];
    ctx.notify(`MISSION FAILED: ${reason}`);
    save.stats.jobsFailed++;
    city.setFinaleDusk(false);
    activeJobIndex = -1;
    activeStageIndex = 0;
    stageCar = null;
  }

  function currentObjective() {
    if (!jobActive()) return null;
    const job = JOBS[activeJobIndex];
    const stage = job.stages[activeStageIndex];
    let objText = `${job.title} — Stage ${activeStageIndex + 1}/${job.stages.length}`;
    if (stage.verb === 'STEAL_CAR') objText = `Steal the ${stage.spec.toUpperCase()}`;
    else if (stage.verb === 'DELIVER') objText = `Deliver vehicle to drop point`;
    else if (stage.verb === 'DRIVE_TO') objText = `Drive to waypoint`;
    else if (stage.verb === 'SURVIVE') objText = `Survive police pursuit (${Math.ceil(stageTimer)}s)`;
    else if (stage.verb === 'SHOOTOUT') objText = `Eliminate hostile forces`;
    else if (stage.verb === 'CHECKLIST') objText = `Deliver requested vehicles`;
    else if (stage.verb === 'RESPRAY') objText = `Respray vehicle at spray shop`;

    return {
      jobLabel: `JOB ${activeJobIndex + 1}/8: ${job.title}`,
      objective: objText,
      next: activeStageIndex + 1 < job.stages.length ? job.stages[activeStageIndex + 1].verb : 'Finalize',
      timer: stageTimer > 0 ? Math.ceil(stageTimer) : null
    };
  }

  function marker() {
    if (!jobActive()) return null;
    const job = JOBS[activeJobIndex];
    const stage = job.stages[activeStageIndex];
    if (stage.at) return { x: stage.at[0], z: stage.at[1] };
    return null;
  }

  function setStage(stageIndex) {
    if (!jobActive()) return;
    const job = JOBS[activeJobIndex];
    activeStageIndex = Math.min(Math.max(0, stageIndex), job.stages.length - 1);
    initStage();
  }

  return {
    JOBS,
    reset,
    jobActive,
    startJob,
    setStage,
    update,
    currentObjective,
    marker,
    onPlayerDown: () => { if (jobActive()) failJob('Player downed'); },
    getHostiles: () => hostiles,
    getStageCar: () => stageCar,
    getActiveStage: () => jobActive() ? JOBS[activeJobIndex].stages[activeStageIndex] : null
  };
}
