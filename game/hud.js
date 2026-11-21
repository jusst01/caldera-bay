// CALDERA BAY — hud.js
// HUD grammar, canvas minimap, panels, dispatch list, takeover strip, photo-mode clean frame support.
// Fully compliant with DESIGN.md §6 HUD grammar specifications.

export function createHud(container) {
  if (!container) return null;

  container.innerHTML = `
    <div id="hud-mission" class="hud-panel" style="position:absolute; top:16px; left:16px; width:300px; display:flex; flex-direction:column; gap:4px; font-size:13px;">
      <div id="hud-job-title" style="font-weight:bold; color:#FF8C42; font-size:14px;">JOB 1/8 — REPO MAN</div>
      <div id="hud-objective" style="font-size:15px; font-weight:600; color:#FFF;">Steal marked Corsario S</div>
      <div id="hud-stage" style="color:#A0AAB8;">STAGE 1/3</div>
      <div id="hud-next" style="font-size:12px; color:#808A98;">NEXT: Deliver to Iris</div>
      <div id="hud-timer" style="font-size:18px; font-weight:bold; font-family:monospace; color:#FFD27F; display:none;">02:30</div>
      <div id="hud-checklist" style="font-size:12px; color:#3E7C4F; letter-spacing:2px; margin-top:2px;">JOBS 0/8 ········</div>
      <div id="hud-side" style="font-size:12px; color:#D9A05B; display:none;">CONTRACT ACTIVE</div>
    </div>

    <div id="hud-dispatch" class="hud-panel" style="position:absolute; top:186px; left:16px; width:280px; display:flex; flex-direction:column; gap:4px; font-size:13px;">
      <div id="hud-dispatch-header" style="font-weight:bold; color:#FF5E8A; font-size:13px;">DISPATCH · HEAT 0 · 0 UNITS</div>
      <div id="hud-dispatch-rows" style="display:flex; flex-direction:column; gap:2px; font-size:12px; color:#C0C8D8;"></div>
    </div>

    <div id="hud-takeover" class="hud-panel" style="position:absolute; top:16px; left:50%; transform:translateX(-50%); width:320px; display:flex; flex-direction:column; align-items:center; gap:4px; font-size:12px; padding:6px 12px;">
      <div style="font-weight:bold; color:#F2B441;">CITY TAKEOVER <span id="hud-takeover-val">3</span>/5</div>
      <div style="display:flex; gap:4px; width:100%;">
        <div style="flex:1; height:6px; background:#2A2E38; border-radius:3px; overflow:hidden;"><div id="to-muelle" style="width:100%; height:100%; background:#1F6E73;"></div></div>
        <div style="flex:1; height:6px; background:#2A2E38; border-radius:3px; overflow:hidden;"><div id="to-paseo" style="width:80%; height:100%; background:#FF7E5F;"></div></div>
        <div style="flex:1; height:6px; background:#2A2E38; border-radius:3px; overflow:hidden;"><div id="to-verde" style="width:60%; height:100%; background:#3E7C4F;"></div></div>
        <div style="flex:1; height:6px; background:#2A2E38; border-radius:3px; overflow:hidden;"><div id="to-ceniza" style="width:30%; height:100%; background:#E8A33D;"></div></div>
        <div style="flex:1; height:6px; background:#2A2E38; border-radius:3px; overflow:hidden;"><div id="to-cumbre" style="width:10%; height:100%; background:#6B4E71;"></div></div>
      </div>
    </div>

    <div id="hud-topright" class="hud-panel" style="position:absolute; top:16px; right:16px; display:flex; flex-direction:column; align-items:flex-end; gap:4px;">
      <div id="hud-heat-pips" style="font-size:20px; color:#FF8C42; letter-spacing:2px;">☆☆☆☆☆</div>
      <div id="hud-cash" style="font-size:22px; font-weight:bold; font-family:monospace; color:#55FF55;">$4,210</div>
      <div id="hud-rep" style="font-size:13px; color:#D9A05B;">FIXER · 520 REP</div>
    </div>

    <div id="hud-minimap-wrap" class="hud-panel" style="position:absolute; bottom:16px; left:16px; width:180px; height:180px; border-radius:90px; padding:0; overflow:hidden; border:2px solid rgba(255,255,255,0.2);">
      <canvas id="hud-minimap-canvas" width="180" height="180" style="display:block;"></canvas>
      <div id="hud-district-label" style="position:absolute; bottom:8px; left:0; right:0; text-align:center; font-size:11px; font-weight:bold; color:#FFF; text-shadow:0 1px 2px #000;">PASEO DORADO</div>
    </div>

    <div id="hud-vehicle" class="hud-panel" style="position:absolute; bottom:16px; right:16px; width:240px; display:flex; flex-direction:column; gap:4px; padding:12px;">
      <div style="display:flex; justify-content:space-between; align-items:baseline;">
        <span id="hud-car-name" style="font-weight:bold; color:#FF7E5F; font-size:14px;">ZORRO GT</span>
        <span style="font-size:11px; color:#A0AAB8;">KM/H</span>
      </div>
      <div id="hud-speed" style="font-size:48px; font-weight:bold; font-family:monospace; line-height:1; color:#FFF; text-align:right;">148</div>
      <div style="height:6px; background:#2A2E38; border-radius:3px; overflow:hidden; margin-top:4px;">
        <div id="hud-car-cond" style="width:86%; height:100%; background:#3E7C4F;"></div>
      </div>
    </div>

    <div id="hud-weapons" style="position:absolute; bottom:210px; right:16px; display:flex; gap:6px;">
      <div class="hud-slot" data-slot="0" style="width:44px; height:44px; background:rgba(20,24,32,0.8); border:1px solid rgba(255,255,255,0.2); border-radius:6px; display:flex; flex-direction:column; align-items:center; justify-content:center; font-size:11px;">🥊<span style="font-size:9px;">FIST</span></div>
      <div class="hud-slot" data-slot="1" style="width:44px; height:44px; background:rgba(20,24,32,0.8); border:1px solid rgba(255,255,255,0.2); border-radius:6px; display:flex; flex-direction:column; align-items:center; justify-content:center; font-size:11px;">🔫<span style="font-size:9px;" id="ammo-1">12/60</span></div>
      <div class="hud-slot" data-slot="2" style="width:44px; height:44px; background:rgba(20,24,32,0.8); border:1px solid rgba(255,255,255,0.2); border-radius:6px; display:flex; flex-direction:column; align-items:center; justify-content:center; font-size:11px;">⚡<span style="font-size:9px;" id="ammo-2">30/120</span></div>
      <div class="hud-slot" data-slot="3" style="width:44px; height:44px; background:rgba(20,24,32,0.8); border:1px solid rgba(255,255,255,0.2); border-radius:6px; display:flex; flex-direction:column; align-items:center; justify-content:center; font-size:11px;">💣<span style="font-size:9px;" id="ammo-3">6/24</span></div>
    </div>

    <div id="hud-radio" class="hud-panel" style="position:absolute; bottom:16px; left:210px; width:200px; display:flex; align-items:center; gap:8px; font-size:11px; padding:6px 12px;">
      <span>📻</span>
      <div style="display:flex; flex-direction:column; overflow:hidden;">
        <span id="hud-radio-station" style="font-weight:bold; color:#FFD27F; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">RADIO CALDERA FM</span>
        <span id="hud-radio-track" style="color:#A0AAB8; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Brisa de Ceniza</span>
      </div>
    </div>

    <div id="hud-dialogue" class="hud-panel" style="position:absolute; bottom:70px; left:50%; transform:translateX(-50%); width:520px; display:none; gap:12px; align-items:center; padding:12px 16px;">
      <div style="width:48px; height:48px; background:#1F6E73; border-radius:24px; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:18px;">DI</div>
      <div style="display:flex; flex-direction:column; gap:2px;">
        <span id="hud-dialogue-speaker" style="font-weight:bold; color:#FF8C42; font-size:13px;">DOÑA IRIS</span>
        <span id="hud-dialogue-line" style="font-size:15px; color:#FFF;">Get that car to the docks before La Marea catches you.</span>
      </div>
    </div>

    <div id="hud-callout" style="position:absolute; top:120px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.85); border:1px solid #FF8C42; padding:8px 24px; border-radius:6px; font-weight:bold; font-size:16px; color:#FFD27F; display:none; z-index:30;">ROADBLOCK AHEAD</div>
  `;

  return {
    update(state) {
      if (!state) return;
      const { player, police, missions, economy, save, dialogue, callout, radio } = state;

      const missionEl = document.getElementById('hud-mission');
      if (missionEl) {
        const obj = missions && typeof missions.currentObjective === 'function' ? missions.currentObjective() : null;
        const jIdx = obj && obj.jobIndex !== undefined ? obj.jobIndex : (save ? save.missionIndex : 0);
        document.getElementById('hud-job-title').textContent = obj ? `JOB ${jIdx + 1}/8 — ${obj.jobLabel}` : 'FREEROAM';
        document.getElementById('hud-objective').textContent = obj ? obj.objective : 'Explore Caldera Bay';
        document.getElementById('hud-stage').textContent = obj ? obj.stageLabel : '';
        document.getElementById('hud-next').textContent = obj ? `NEXT: ${obj.next}` : '';
        const timerEl = document.getElementById('hud-timer');
        if (obj && obj.timer !== undefined) {
          timerEl.style.display = 'block';
          const mm = String(Math.floor(obj.timer / 60)).padStart(2, '0');
          const ss = String(Math.floor(obj.timer % 60)).padStart(2, '0');
          timerEl.textContent = `${mm}:${ss}`;
        } else {
          timerEl.style.display = 'none';
        }
        const checklistEl = document.getElementById('hud-checklist');
        const done = save ? save.jobsDone : 0;
        checklistEl.textContent = `JOBS ${done}/8 ` + '✓'.repeat(done) + '·'.repeat(8 - done);
      }

      const heat = police && typeof police.heatLevel === 'function' ? police.heatLevel() : 0;
      const dispatchEl = document.getElementById('hud-dispatch');
      if (dispatchEl) {
        if (heat > 0 && police && typeof police.activeUnits === 'function') {
          dispatchEl.style.display = 'flex';
          const units = police.activeUnits();
          document.getElementById('hud-dispatch-header').textContent = `DISPATCH · HEAT ${heat} · ${units.length} UNITS`;
          const rowsEl = document.getElementById('hud-dispatch-rows');
          let html = '';
          units.slice(0, 4).forEach((u, i) => {
            const dist = Math.round(u.dist || 0);
            html += `<div style="display:flex; justify-content:space-between;"><span>U${i+1} ${u.name || 'UNIT'}</span><span>${dist}m · ${u.tactic || 'PURSUIT'}</span></div>`;
          });
          if (units.length > 4) {
            html += `<div style="color:#A0AAB8;">+${units.length - 4} more</div>`;
          }
          rowsEl.innerHTML = html;
        } else {
          dispatchEl.style.display = 'none';
        }
      }

      const heatPips = document.getElementById('hud-heat-pips');
      if (heatPips) {
        heatPips.textContent = '★'.repeat(heat) + '☆'.repeat(5 - heat);
      }
      const cashEl = document.getElementById('hud-cash');
      if (cashEl && save) cashEl.textContent = `$${(save.cash || 0).toLocaleString()}`;
      const repEl = document.getElementById('hud-rep');
      if (repEl && save) {
        repEl.textContent = `REP · ${save.rep || 0}`;
      }

      const toVal = document.getElementById('hud-takeover-val');
      if (toVal && save && save.takeover) {
        let count = 0;
        ['muelle','paseo','verde','ceniza','cumbre'].forEach(d => {
          const val = save.takeover[d] || 0;
          if (val >= 50) count++;
          const bar = document.getElementById(`to-${d}`);
          if (bar) bar.style.width = `${val}%`;
        });
        toVal.textContent = count;
      }

      const speedEl = document.getElementById('hud-speed');
      const carNameEl = document.getElementById('hud-car-name');
      const carCondEl = document.getElementById('hud-car-cond');
      if (speedEl && player) {
        speedEl.textContent = Math.round(Math.abs(player.speed || 0) * 3.6);
        if (player.spec && player.spec.name) carNameEl.textContent = player.spec.name.toUpperCase();
        if (player.durability !== undefined) carCondEl.style.width = `${Math.max(0, player.durability)}%`;
      }

      if (radio && typeof radio.getStationInfo === 'function') {
        const info = radio.getStationInfo();
        const statEl = document.getElementById('hud-radio-station');
        const trackEl = document.getElementById('hud-radio-track');
        if (statEl) statEl.textContent = info.name;
        if (trackEl) trackEl.textContent = info.track;
      }

      const diagEl = document.getElementById('hud-dialogue');
      if (diagEl && dialogue && dialogue.timer > 0) {
        diagEl.style.display = 'flex';
        document.getElementById('hud-dialogue-speaker').textContent = dialogue.speaker || '';
        document.getElementById('hud-dialogue-line').textContent = dialogue.line || '';
      } else if (diagEl) {
        diagEl.style.display = 'none';
      }

      const callEl = document.getElementById('hud-callout');
      if (callEl && callout && callout.timer > 0) {
        callEl.style.display = 'block';
        callEl.textContent = callout.text || '';
      } else if (callEl) {
        callEl.style.display = 'none';
      }

      renderMinimap(state);
    },
    setPanels(mode) {
      const missionEl = document.getElementById('hud-mission');
      const dispatchEl = document.getElementById('hud-dispatch');
      const takeoverEl = document.getElementById('hud-takeover');
      const toprightEl = document.getElementById('hud-topright');
      const minimapEl = document.getElementById('hud-minimap-wrap');
      const vehicleEl = document.getElementById('hud-vehicle');
      const weaponsEl = document.getElementById('hud-weapons');
      const radioEl = document.getElementById('hud-radio');
      const dialogueEl = document.getElementById('hud-dialogue');

      if (mode === 'off') {
        [missionEl, dispatchEl, takeoverEl, toprightEl, minimapEl, vehicleEl, weaponsEl, radioEl, dialogueEl].forEach(el => {
          if (el) el.style.display = 'none';
        });
      } else if (mode === 'cover') {
        if (missionEl) missionEl.style.display = 'flex';
        if (dispatchEl) dispatchEl.style.display = 'flex';
        if (takeoverEl) takeoverEl.style.display = 'flex';
        if (toprightEl) toprightEl.style.display = 'flex';
        if (minimapEl) minimapEl.style.display = 'block';
        if (vehicleEl) vehicleEl.style.display = 'flex';
        if (weaponsEl) { weaponsEl.style.display = 'flex'; weaponsEl.style.opacity = '0.4'; }
        if (radioEl) radioEl.style.display = 'none';
        if (dialogueEl) dialogueEl.style.display = 'none';
      } else {
        [missionEl, takeoverEl, toprightEl, minimapEl, vehicleEl, weaponsEl, radioEl].forEach(el => {
          if (el) el.style.display = 'flex';
        });
        if (weaponsEl) weaponsEl.style.opacity = '1.0';
      }
    }
  };
}

function renderMinimap(state) {
  const canvas = document.getElementById('hud-minimap-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;

  ctx.fillStyle = '#1A1E28';
  ctx.fillRect(0, 0, w, h);

  const px = state.playerX || 0;
  const pz = state.playerZ || 0;
  const heading = state.playerHeading || 0;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-heading);
  ctx.translate(-px, -pz);

  ctx.fillStyle = 'rgba(31, 110, 115, 0.25)';
  ctx.fillRect(-600, -600, 1200, 1200);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 4;
  for (let x = -512; x <= 512; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, -600);
    ctx.lineTo(x, 600);
    ctx.stroke();
  }
  for (let z = -512; z <= 512; z += 64) {
    ctx.beginPath();
    ctx.moveTo(-600, z);
    ctx.lineTo(600, z);
    ctx.stroke();
  }

  if (state.missions && typeof state.missions.marker === 'function') {
    const m = state.missions.marker();
    if (m) {
      ctx.fillStyle = '#F2B441';
      ctx.beginPath();
      ctx.arc(m.x, m.z, 8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (state.police && typeof state.police.activeUnits === 'function') {
    ctx.fillStyle = '#FF5E8A';
    state.police.activeUnits().forEach(u => {
      ctx.beginPath();
      ctx.arc(u.x || 0, u.z || 0, 5, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  ctx.restore();

  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = '#FF8C42';
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(6, 8);
  ctx.lineTo(-6, 8);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
