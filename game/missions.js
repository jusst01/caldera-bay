import * as THREE from 'three';
import { getVehicleSpec, createCarMesh } from './vehicles.js';
import { mulberry32 } from './city.js';

export const JOBS = [
  {
    id: 0,
    title: 'Repo Man',
    district: 'muelle',
    cash: 300,
    rep: 40,
    repGate: 0,
    start: [-300, 300],
    intro: ['Iris', 'Tavo, there is a Corsario S down at the dock lot. Go lift it.'],
    stages: [
      { verb: 'STEAL_CAR', spec: 'corsario', at: [-384, 256] },
      { verb: 'DELIVER', at: [-256, 384], radius: 13, needCar: true }
    ]
  },
  {
    id: 1,
    title: 'Hot Cargo',
    district: 'muelle',
    cash: 450,
    rep: 50,
    repGate: 0,
    start: [-300, 300],
    intro: ['Iris', 'Fragile cargo in the Caimán. Get across town fast without wrecking it.'],
    stages: [
      { verb: 'STEAL_CAR', spec: 'caiman', at: [-448, 320] },
      { verb: 'DELIVER', at: [384, 64], radius: 14, needCar: true, timeLimit: 150 },
      { verb: 'DRIVE_TO', at: [320, 128] }
    ]
  },
  {
    id: 2,
    title: 'Loud Exit',
    district: 'muelle',
    cash: 600,
    rep: 60,
    repGate: 100, // Runner
    start: [-300, 300],
    intro: ['Iris', 'The dock heist blew up early. Shake the heat and get out.'],
    stages: [
      { verb: 'DRIVE_TO', at: [-448, 384] },
      { verb: 'SURVIVE', seconds: 40, floor: 30 },
      { verb: 'DRIVE_TO', at: [-320, 320] }
    ]
  },
  {
    id: 3,
    title: 'Chop Shop Run',
    district: 'ceniza',
    cash: 800,
    rep: 70,
    repGate: 100, // Runner
    start: [-300, -300],
    intro: ['Iris', 'We need three specific rides at the chop shop before time runs out.'],
    stages: [
      { verb: 'CHECKLIST', specs: ['fantasma', 'zorro', 'sirena'], at: [-320, -256], radius: 14, timeLimit: 360 },
      { verb: 'DRIVE_TO', at: [-192, -320] }
    ]
  },
  {
    id: 4,
    title: 'The Setup',
    district: 'muelle',
    cash: 1000,
    rep: 80,
    repGate: 250, // Wheelman
    start: [-300, 300],
    intro: ['Iris', 'La Marea is waiting at the fish market. Clear them out.'],
    stages: [
      { verb: 'DRIVE_TO', at: [-192, 320] },
      { verb: 'SHOOTOUT', at: [-224, 288], count: 3 },
      { verb: 'DRIVE_TO', at: [-320, 320] }
    ]
  },
  {
    id: 5,
    title: 'Roadblock County',
    district: 'ceniza',
    cash: 1200,
    rep: 90,
    repGate: 250, // Wheelman
    start: [-300, -300],
    intro: ['Iris', 'Heavy pursuit incoming. Grab the Fantasma, survive, then ditch the paint.'],
    stages: [
      { verb: 'STEAL_CAR', spec: 'fantasma', at: [-128, -256] },
      { verb: 'SURVIVE', seconds: 30, floor: 60 },
      { verb: 'RESPRAY', at: [-384, -192] },
      { verb: 'DRIVE_TO', at: [-320, 320] }
    ]
  },
  {
    id: 6,
    title: 'Sky Eye',
    district: 'verde',
    cash: 1600,
    rep: 110,
    repGate: 500, // Fixer
    start: [300, -300],
    intro: ['Iris', 'Villa heist in Alto Verde. Lift the Relámpago under chopper watch.'],
    stages: [
      { verb: 'DRIVE_TO', at: [320, -384] },
      { verb: 'STEAL_CAR', spec: 'relampago', at: [384, -320] },
      { verb: 'DELIVER', at: [0, -192], radius: 16, needCar: true, floor: 100 }
    ]
  },
  {
    id: 7,
    title: 'La Cumbre',
    district: 'cumbre',
    cash: 2500,
    rep: 150,
    repGate: 1400, // Leyenda
    start: [0, -500],
    intro: ['Iris', 'This is it, Tavo. Drive the Zorro up the volcano and deliver the ledger.'],
    stages: [
      { verb: 'STEAL_CAR', spec: 'zorro', at: [64, -448] },
      { verb: 'DELIVER', at: [0, -512], radius: 16, needCar: true, floor: 150 },
      { verb: 'SURVIVE', seconds: 30, floor: 150 }
    ]
  }
];

export function createMissions(ctx) {
  let activeJobIdx = -1;
  let stageIdx = 0;
  let stageTimer = 0;
  let stageCar = null;
  let hostiles = [];
  let checklistDelivered = [];
  let edgeLatchMet = false;
  let lastDistToTarget = 9999;

  const hostileGeo = new THREE.CapsuleGeometry(0.4, 1.2, 4, 8);
  const hostileMat = new THREE.MeshStandardMaterial({ color: 0x3E3A45, roughness: 0.8, flatShading: true });

  function spawnHostiles(at, count, seedVal) {
    hostiles = [];
    const rng = mulberry32(seedVal);
    for (let i = 0; i < count; i++) {
      const angle = rng() * Math.PI * 2;
      const dist = 8 + rng() * 6;
      let hx = at[0] + Math.sin(angle) * dist;
      let hz = at[1] + Math.cos(angle) * dist;

      // Eject out of building footprints if needed
      for (const col of ctx.city.colliders) {
        if (hx > col.minX && hx < col.maxX && hz > col.minZ && hz < col.maxZ) {
          const pushX = hx > (col.minX + col.maxX)/2 ? col.maxX + 1 : col.minX - 1;
          hx = pushX;
        }
      }

      const mesh = new THREE.Mesh(hostileGeo, hostileMat);
      mesh.castShadow = true;
      ctx.scene.add(mesh);
      mesh.position.set(hx, 0.9, hz);

      hostiles.push({
        mesh,
        x: hx, z: hz,
        hp: 45,
        maxHp: 45,
        fireTimer: rng() * 2,
        heading: rng() * Math.PI * 2
      });
    }
  }

  function clearHostiles() {
    for (const h of hostiles) {
      ctx.scene.remove(h.mesh);
    }
    hostiles = [];
  }

  function setupStage() {
    edgeLatchMet = false;
    lastDistToTarget = 9999;
    clearHostiles();
    if (activeJobIdx < 0 || activeJobIdx >= JOBS.length) return;
    const job = JOBS[activeJobIdx];
    const stage = job.stages[stageIdx];

    if (job.id === 7) {
      ctx.city.setFinaleDusk(true);
    } else {
      ctx.city.setFinaleDusk(false);
    }

    if (stage.verb === 'STEAL_CAR') {
      // Spawn parked car
      const spec = getVehicleSpec(stage.spec);
      const mesh = createCarMesh(stage.spec);
      ctx.scene.add(mesh);
      mesh.position.set(stage.at[0], 0, stage.at[1]);
      stageCar = {
        mesh,
        spec,
        x: stage.at[0],
        z: stage.at[1],
        speed: 0,
        heading: 0,
        stolen: false,
        durability: 100,
        jobCar: true
      };
      ctx.traffic.cars.push(stageCar);
    } else if (stage.verb === 'SHOOTOUT') {
      spawnHostiles(stage.at, stage.count, 9000 + activeJobIdx * 37 + stageIdx);
    } else if (stage.verb === 'CHECKLIST') {
      checklistDelivered = [];
    }

    if (stage.timeLimit) {
      stageTimer = stage.timeLimit;
    } else if (stage.seconds) {
      stageTimer = stage.seconds;
    } else {
      stageTimer = 0;
    }
  }

  function failJob() {
    if (activeJobIdx < 0) return;
    ctx.notify('JOB FAILED: ' + JOBS[activeJobIdx].title);
    ctx.save.stats.jobsFailed++;
    clearHostiles();
    if (stageCar) {
      const idx = ctx.traffic.cars.indexOf(stageCar);
      if (idx >= 0) ctx.traffic.cars.splice(idx, 1);
      ctx.scene.remove(stageCar.mesh);
      stageCar = null;
    }
    activeJobIdx = -1;
    stageIdx = 0;
    ctx.city.setFinaleDusk(false);
  }

  function completeJob() {
    const job = JOBS[activeJobIdx];
    ctx.addCash(job.cash);
    ctx.save.rep += job.rep;
    ctx.save.jobsDone++;
    ctx.save.missionIndex = Math.max(ctx.save.missionIndex, activeJobIdx + 1);
    const dId = job.district;
    ctx.save.takeover[dId] = Math.min(100, (ctx.save.takeover[dId] || 0) + 20);
    ctx.dialogue('Iris', `Great work on ${job.title}, Tavo. Here is your cut.`);
    ctx.notify(`MISSION COMPLETE: ${job.title} (+$${job.cash}, +${job.rep} REP)`);
    clearHostiles();
    if (stageCar) {
      const idx = ctx.traffic.cars.indexOf(stageCar);
      if (idx >= 0) ctx.traffic.cars.splice(idx, 1);
      ctx.scene.remove(stageCar.mesh);
      stageCar = null;
    }
    activeJobIdx = -1;
    stageIdx = 0;
    ctx.city.setFinaleDusk(false);
  }

  return {
    get activeJobIdx() { return activeJobIdx; },
    get stageIdx() { return stageIdx; },
    get stageCar() { return stageCar; },
    get hostiles() { return hostiles; },
    jobActive() { return activeJobIdx >= 0; },
    startJob(i) {
      if (i !== ctx.save.missionIndex || activeJobIdx >= 0) return false;
      const job = JOBS[i];
      if (!job) return false;
      if (ctx.save.rep < job.repGate) {
        ctx.notify(`Locked: Requires ${job.repGate} REP`);
        return false;
      }
      activeJobIdx = i;
      stageIdx = 0;
      setupStage();
      ctx.dialogue(job.intro[0], job.intro[1]);
      ctx.notify(`STARTED: ${job.title}`);
      return true;
    },
    forceStage(jIdx, sIdx) {
      activeJobIdx = jIdx;
      stageIdx = sIdx;
      setupStage();
    },
    reset() {
      activeJobIdx = -1;
      stageIdx = 0;
      clearHostiles();
      if (stageCar) {
        ctx.scene.remove(stageCar.mesh);
        stageCar = null;
      }
    },
    onPlayerDown() {
      if (activeJobIdx >= 0) {
        failJob();
      }
    },
    resprayStageActive() {
      if (activeJobIdx < 0) return false;
      const job = JOBS[activeJobIdx];
      const stage = job.stages[stageIdx];
      return stage && stage.verb === 'RESPRAY';
    },
    onRespray() {
      if (activeJobIdx >= 0) {
        const job = JOBS[activeJobIdx];
        const stage = job.stages[stageIdx];
        if (stage && stage.verb === 'RESPRAY') {
          stageIdx++;
          if (stageIdx >= job.stages.length) {
            completeJob();
          } else {
            setupStage();
          }
        }
      }
    },
    damageHostile(h, amt) {
      h.hp -= amt;
      if (h.hp <= 0) {
        h.mesh.rotation.x = Math.PI / 2;
      }
    },
    marker() {
      if (activeJobIdx < 0) return null;
      const job = JOBS[activeJobIdx];
      const stage = job.stages[stageIdx];
      if (!stage) return null;
      if (stage.at) return stage.at;
      return null;
    },
    currentObjective() {
      if (activeJobIdx < 0) return null;
      const job = JOBS[activeJobIdx];
      const stage = job.stages[stageIdx];
      let objectiveText = '';
      if (stage.verb === 'STEAL_CAR') objectiveText = `Steal the ${stage.spec.toUpperCase()}`;
      else if (stage.verb === 'DELIVER') objectiveText = `Deliver vehicle to drop point`;
      else if (stage.verb === 'DRIVE_TO') objectiveText = `Drive to location`;
      else if (stage.verb === 'SURVIVE') objectiveText = `Survive heat pursuit (${Math.ceil(stageTimer)}s)`;
      else if (stage.verb === 'SHOOTOUT') objectiveText = `Eliminate hostile thugs (${hostiles.filter(h => h.hp > 0).length} left)`;
      else if (stage.verb === 'CHECKLIST') objectiveText = `Deliver cars to chop point (${checklistDelivered.length}/${stage.specs.length})`;
      else if (stage.verb === 'RESPRAY') objectiveText = `Respray vehicle at spray shop ($200)`;

      return {
        jobLabel: `JOB ${activeJobIdx + 1}/8 — ${job.title.toUpperCase()}`,
        objective: objectiveText,
        next: `Stage ${stageIdx + 1}/${job.stages.length}`,
        stageLabel: `STAGE ${stageIdx + 1}/${job.stages.length}`,
        timer: stageTimer > 0 ? `${Math.floor(stageTimer/60)}:${Math.floor(stageTimer%60).toString().padStart(2,'0')}` : ''
      };
    },
    armJobStart() {
      if (activeJobIdx >= 0 || ctx.save.missionIndex >= JOBS.length) return null;
      const job = JOBS[ctx.save.missionIndex];
      return {
        pos: job.start,
        radius: 6,
        label: () => ctx.save.rep >= job.repGate ? `[E] START JOB: ${job.title}` : `[Locked: ${job.repGate} REP]`,
        action: () => {
          this.startJob(job.id);
        }
      };
    },
    update(dt) {
      if (activeJobIdx < 0) return;
      const job = JOBS[activeJobIdx];
      const stage = job.stages[stageIdx];

      // Police floor clamp
      if (stage.floor) {
        if (ctx.police.points < stage.floor) {
          ctx.police.setPoints(stage.floor); // We will add setPoints in police.js or manage via addPoints/clamp
        }
      }

      // Timers
      if (stage.timeLimit || stage.seconds) {
        stageTimer -= dt;
        if (stageTimer <= 0) {
          failJob();
          return;
        }
      }

      // Job car guard / respawn if destroyed
      if (stage.verb === 'STEAL_CAR' && stageCar) {
        if (stageCar.durability <= 0 || !ctx.traffic.cars.includes(stageCar)) {
          // Respawn stage car
          const spec = getVehicleSpec(stage.spec);
          const mesh = createCarMesh(stage.spec);
          ctx.scene.add(mesh);
          mesh.position.set(stage.at[0], 0, stage.at[1]);
          stageCar = {
            mesh,
            spec,
            x: stage.at[0],
            z: stage.at[1],
            speed: 0,
            heading: 0,
            stolen: false,
            durability: 100,
            jobCar: true
          };
          ctx.traffic.cars.push(stageCar);
          ctx.notify('Job vehicle replaced.');
        }
      }

      // Hostiles AI
      if (stage.verb === 'SHOOTOUT') {
        let allDown = true;
        for (const h of hostiles) {
          if (h.hp > 0) {
            allDown = false;
            const dist = Math.hypot(h.x - ctx.player.x, h.z - ctx.player.z);
            if (dist > 7) {
              const angle = Math.atan2(ctx.player.x - h.x, ctx.player.z - h.z);
              h.x += Math.sin(angle) * 2.5 * dt;
              h.z += Math.cos(angle) * 2.5 * dt;
              h.mesh.position.set(h.x, 0.9, h.z);
              h.mesh.rotation.y = angle;
            }
            h.fireTimer -= dt;
            if (h.fireTimer <= 0 && dist < 42) {
              h.fireTimer = 1.6 + 1.1;
              const hitChance = Math.max(0.25, Math.min(0.78, 0.78 - dist * 0.012));
              if (Math.random() < hitChance) {
                ctx.combat.takeDamage(6);
              }
            }
          }
        }
        if (allDown && hostiles.length > 0) {
          clearHostiles();
          stageIdx++;
          if (stageIdx >= job.stages.length) completeJob();
          else setupStage();
          return;
        }
      }

      // Stage condition checks
      if (stage.at) {
        const dist = Math.hypot(ctx.player.x - stage.at[0], ctx.player.z - stage.at[1]);
        const radius = stage.radius || 8;

        // Edge latch: must approach from outside radius + 6
        if (dist > radius + 6) {
          edgeLatchMet = true;
        }

        if (dist <= radius && edgeLatchMet) {
          let pass = false;
          if (stage.verb === 'DRIVE_TO') {
            pass = true;
          } else if (stage.verb === 'STEAL_CAR') {
            if (ctx.player.mode === 'drive' && ctx.player.car === stageCar) {
              pass = true;
            }
          } else if (stage.verb === 'DELIVER') {
            if (ctx.player.mode === 'drive' && ctx.player.car) {
              pass = true;
            }
          } else if (stage.verb === 'CHECKLIST') {
            if (ctx.player.mode === 'drive' && ctx.player.car && !ctx.player.car.jobCar && !ctx.player.car.police) {
              const sId = ctx.player.car.spec.id;
              if (stage.specs.includes(sId) && !checklistDelivered.includes(sId)) {
                checklistDelivered.push(sId);
                // Remove car
                const idx = ctx.traffic.cars.indexOf(ctx.player.car);
                if (idx >= 0) ctx.traffic.cars.splice(idx, 1);
                ctx.scene.remove(ctx.player.car.mesh);
                ctx.player.mode = 'foot';
                ctx.player.car = null;
                ctx.scene.add(ctx.playerMesh);
                pass = checklistDelivered.length >= stage.specs.length;
              }
            }
          }

          if (pass) {
            stageIdx++;
            if (stageIdx >= job.stages.length) {
              completeJob();
            } else {
              setupStage();
            }
          }
        }
      } else if (stage.verb === 'SURVIVE') {
        if (stageTimer <= 0) {
          stageIdx++;
          if (stageIdx >= job.stages.length) {
            completeJob();
          } else {
            setupStage();
          }
        }
      }
    }
  };
}
