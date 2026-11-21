// CALDERA BAY — screens.js
// Start screen, garage screen, job board, pause menu, settings, game-over overlays.

export function createScreens(container, hooks) {
  if (!container) return null;

  container.innerHTML = `
    <div id="screen-start" style="position:absolute; inset:0; background:rgba(17,20,27,0.95); display:flex; z-index:100; font-family:monospace; color:#FFF;">
      <div style="flex:4; padding:48px; display:flex; flex-direction:column; justify-content:center; gap:24px; border-right:1px solid rgba(255,255,255,0.1);">
        <div>
          <h1 style="font-size:72px; margin:0; color:#FF8C42; font-weight:900; letter-spacing:2px;">CALDERA BAY</h1>
          <p style="font-size:18px; color:#A0AAB8; margin:8px 0 0 0;">8 JOBS · 5 DISTRICTS · ONE CITY TO TAKE</p>
        </div>
        <div style="display:flex; flex-direction:column; gap:12px; width:320px;">
          <button id="btn-continue" style="padding:16px 24px; background:#FF8C42; color:#11141b; border:none; border-radius:6px; font-size:20px; font-weight:bold; cursor:pointer; text-align:left;">CONTINUE</button>
          <button id="btn-newgame" style="padding:14px 24px; background:rgba(255,255,255,0.1); color:#FFF; border:1px solid rgba(255,255,255,0.2); border-radius:6px; font-size:18px; cursor:pointer; text-align:left;">NEW GAME</button>
          <button id="btn-garage" style="padding:14px 24px; background:rgba(255,255,255,0.1); color:#FFF; border:1px solid rgba(255,255,255,0.2); border-radius:6px; font-size:18px; cursor:pointer; text-align:left;">IRIS'S GARAGE</button>
          <button id="btn-jobboard" style="padding:14px 24px; background:rgba(255,255,255,0.1); color:#FFF; border:1px solid rgba(255,255,255,0.2); border-radius:6px; font-size:18px; cursor:pointer; text-align:left;">JOB BOARD</button>
          <button id="btn-settings" style="padding:14px 24px; background:rgba(255,255,255,0.1); color:#FFF; border:1px solid rgba(255,255,255,0.2); border-radius:6px; font-size:18px; cursor:pointer; text-align:left;">SETTINGS</button>
        </div>
        <div style="font-size:13px; color:#808A98;" id="start-save-info">AUTOSAVE ON · SLOT 1 · 14:32 · SEED 77</div>
      </div>
      <div style="flex:6; padding:48px; display:flex; flex-direction:column; justify-content:center; gap:20px; background:rgba(0,0,0,0.3);">
        <h2 style="font-size:28px; margin:0; color:#FF7E5F;">YOUR RISE</h2>
        <div style="display:flex; gap:8px; font-size:14px;" id="rep-tiers-list">
          <span style="color:#D9A05B;">NOBODY</span> → <span style="color:#D9A05B;">RUNNER</span> → <span style="color:#D9A05B;">WHEELMAN</span> → <span style="color:#FF8C42; font-weight:bold;">FIXER (520)</span> → <span style="color:#808A98;">BROKER</span> → <span style="color:#808A98;">LEYENDA</span>
        </div>
        <div style="background:rgba(20,24,32,0.7); border:1px solid rgba(255,255,255,0.15); border-radius:8px; padding:16px;">
          <h3 style="margin:0 0 12px 0; font-size:16px; color:#F2B441;">ACTIVE CAREER</h3>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:14px;" id="career-stats">
            <div>CARS STOLEN: <span style="color:#FFD27F;">41</span></div>
            <div>TOP SPEED: <span style="color:#FFD27F;">247 KM/H</span></div>
            <div>MAX HEAT: <span style="color:#FFD27F;">★★★★★</span></div>
            <div>JOBS DONE: <span style="color:#FFD27F;">6/8</span></div>
            <div>TAKEOVER: <span style="color:#FFD27F;">3/5 DISTRICTS</span></div>
            <div>CONTRACTS: <span style="color:#FFD27F;">9 DONE</span></div>
          </div>
        </div>
        <div style="font-size:13px; color:#A0AAB8;">CONTROLS: WASD DRIVE/WALK · E CARJACK/INTERACT · SPACE HANDBRAKE · SHIFT SPRINT · TAB WEAPON WHEEL · Q RADIO · F5 QUICK SAVE</div>
      </div>
    </div>

    <div id="screen-garage" style="position:absolute; inset:0; background:rgba(17,20,27,0.95); display:none; z-index:100; font-family:monospace; color:#FFF; padding:40px; flex-direction:column; gap:24px;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h2 style="font-size:28px; margin:0; color:#FF7E5F;">IRIS'S GARAGE — CHOP & REPAIR</h2>
        <button id="btn-close-garage" style="padding:10px 20px; background:#FF8C42; color:#11141b; border:none; border-radius:6px; font-weight:bold; cursor:pointer;">BACK TO CITY [ESC]</button>
      </div>
      <div style="display:flex; gap:24px; flex:1; overflow:hidden;">
        <div style="flex:1; background:rgba(20,24,32,0.8); border:1px solid rgba(255,255,255,0.15); border-radius:8px; padding:20px; display:flex; flex-direction:column; gap:12px;">
          <h3 style="margin:0; font-size:18px; color:#FFD27F;">YOUR CARS (4/4)</h3>
          <div id="garage-cars-list" style="display:flex; flex-direction:column; gap:8px; overflow-y:auto; flex:1;">
            <div style="padding:10px; background:rgba(255,255,255,0.05); border-radius:6px; display:flex; justify-content:space-between; align-items:center;">
              <span>ZORRO GT (COND 86)</span>
              <button style="padding:6px 12px; background:#1F6E73; color:#FFF; border:none; border-radius:4px; cursor:pointer;">RECALL</button>
            </div>
            <div style="padding:10px; background:rgba(255,255,255,0.05); border-radius:6px; display:flex; justify-content:space-between; align-items:center;">
              <span>CORSARIO S (COND 91)</span>
              <button style="padding:6px 12px; background:#1F6E73; color:#FFF; border:none; border-radius:4px; cursor:pointer;">RECALL</button>
            </div>
            <div style="padding:10px; background:rgba(255,255,255,0.05); border-radius:6px; display:flex; justify-content:space-between; align-items:center;">
              <span>MULA 4X4 (COND 74)</span>
              <button style="padding:6px 12px; background:#1F6E73; color:#FFF; border:none; border-radius:4px; cursor:pointer;">RECALL</button>
            </div>
            <div style="padding:10px; background:rgba(255,255,255,0.05); border-radius:6px; display:flex; justify-content:space-between; align-items:center;">
              <span>SIRENA (COND 100)</span>
              <button style="padding:6px 12px; background:#1F6E73; color:#FFF; border:none; border-radius:4px; cursor:pointer;">RECALL</button>
            </div>
          </div>
          <div style="display:flex; gap:8px;">
            <button id="btn-repair" style="flex:1; padding:12px; background:#3E7C4F; color:#FFF; border:none; border-radius:6px; font-weight:bold; cursor:pointer;">REPAIR $80</button>
            <button id="btn-respray" style="flex:1; padding:12px; background:#E8A33D; color:#11141b; border:none; border-radius:6px; font-weight:bold; cursor:pointer;">RESPRAY $200</button>
          </div>
        </div>
        <div style="flex:1; background:rgba(20,24,32,0.8); border:1px solid rgba(255,255,255,0.15); border-radius:8px; padding:20px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:16px;">
          <div id="garage-preview-container" style="width:100%; height:200px; position:relative;">
            <canvas id="garage-preview-canvas" width="200" height="200" style="width:100%; height:100%;"></canvas>
          </div>
          <h3 style="margin:0; font-size:24px; color:#FFF;" id="garage-selected-name">ZORRO GT</h3>
          <div style="font-size:16px; color:#FF7E5F;" id="garage-selected-stats">220 KM/H · GRIP 0.85</div>
          <button id="btn-chop-car" style="padding:12px 24px; background:#C8402F; color:#FFF; border:none; border-radius:6px; font-weight:bold; cursor:pointer;">SELL TO CHOP</button>
        </div>
        <div style="flex:1; background:rgba(20,24,32,0.8); border:1px solid rgba(255,255,255,0.15); border-radius:8px; padding:20px; display:flex; flex-direction:column; gap:12px;">
          <h3 style="margin:0; font-size:18px; color:#FFD27F;">CHOP CATALOG (12)</h3>
          <div id="garage-catalog-list" style="display:flex; flex-direction:column; gap:6px; overflow-y:auto; flex:1; font-size:13px;">
            <div>COLIBRÍ — $50</div>
            <div>SIRENA — $80</div>
            <div>CAIMÁN — $100</div>
            <div>MULA 4X4 — $120</div>
            <div>BÓXER — $90</div>
            <div>FANTASMA — $300</div>
            <div>CORSARIO S — $220</div>
            <div>ZORRO GT — $320</div>
            <div>RELÁMPAGO — $400</div>
          </div>
        </div>
      </div>
    </div>

    <div id="screen-jobboard" style="position:absolute; inset:0; background:rgba(17,20,27,0.95); display:none; z-index:100; font-family:monospace; color:#FFF; padding:48px; flex-direction:column; gap:24px;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h2 style="font-size:28px; margin:0; color:#FF7E5F;">MISSION ARC — 8 JOBS</h2>
        <button id="btn-close-jobboard" style="padding:10px 20px; background:#FF8C42; color:#11141b; border:none; border-radius:6px; font-weight:bold; cursor:pointer;">CLOSE [ESC]</button>
      </div>
      <div style="display:flex; flex-direction:column; gap:8px; overflow-y:auto; flex:1;" id="jobboard-list">
        <div style="padding:12px 16px; background:rgba(20,24,32,0.8); border:1px solid rgba(255,255,255,0.15); border-radius:6px; display:flex; justify-content:space-between; align-items:center;">
          <span>1. Caldera Run — Muelle Viejo — $300 / 40 REP</span>
          <span style="color:#3E7C4F;">COMPLETED</span>
        </div>
        <div style="padding:12px 16px; background:rgba(20,24,32,0.8); border:1px solid rgba(255,255,255,0.15); border-radius:6px; display:flex; justify-content:space-between; align-items:center;">
          <span>2. Muelle Pickup — Muelle Viejo — $450 / 50 REP</span>
          <span style="color:#3E7C4F;">COMPLETED</span>
        </div>
        <div style="padding:12px 16px; background:rgba(20,24,32,0.8); border:1px solid rgba(255,255,255,0.15); border-radius:6px; display:flex; justify-content:space-between; align-items:center;">
          <span>3. Ash Run — Distrito Ceniza — $600 / 60 REP</span>
          <span style="color:#3E7C4F;">COMPLETED</span>
        </div>
        <div style="padding:12px 16px; background:rgba(20,24,32,0.8); border:1px solid rgba(255,255,255,0.15); border-radius:6px; display:flex; justify-content:space-between; align-items:center;">
          <span>4. Vista Photo — Paseo Dorado — $800 / 70 REP</span>
          <span style="color:#3E7C4F;">COMPLETED</span>
        </div>
        <div style="padding:12px 16px; background:rgba(20,24,32,0.8); border:1px solid rgba(255,255,255,0.15); border-radius:6px; display:flex; justify-content:space-between; align-items:center;">
          <span>5. Chop Run — Distrito Ceniza — $1,000 / 80 REP</span>
          <span style="color:#3E7C4F;">COMPLETED</span>
        </div>
        <div style="padding:12px 16px; background:rgba(20,24,32,0.8); border:1px solid rgba(255,255,255,0.15); border-radius:6px; display:flex; justify-content:space-between; align-items:center;">
          <span>6. Skyline Circuit — Alto Verde — $1,200 / 90 REP</span>
          <span style="color:#3E7C4F;">COMPLETED</span>
        </div>
        <div style="padding:12px 16px; background:rgba(20,24,32,0.8); border:1px solid rgba(255,255,255,0.15); border-radius:6px; display:flex; justify-content:space-between; align-items:center;">
          <span>7. The Long Haul — Muelle Viejo — $1,600 / 110 REP</span>
          <span style="color:#FF8C42; font-weight:bold;">ACTIVE</span>
        </div>
        <div style="padding:12px 16px; background:rgba(20,24,32,0.8); border:1px solid rgba(255,255,255,0.15); border-radius:6px; display:flex; justify-content:space-between; align-items:center;">
          <span>8. Caldera King — La Cumbre — $2,500 / 150 REP</span>
          <span style="color:#808A98;">LOCKED (REQ 1400 REP)</span>
        </div>
      </div>
    </div>

    <div id="screen-gameover" style="position:absolute; inset:0; background:rgba(0,0,0,0.85); display:none; z-index:200; font-family:monospace; color:#FFF; flex-direction:column; align-items:center; justify-content:center; gap:20px;">
      <h1 style="font-size:64px; color:#C8402F; margin:0;" id="gameover-title">BUSTED</h1>
      <p style="font-size:18px; color:#A0AAB8; margin:0;" id="gameover-sub">Safehouse respawn · -10% cash</p>
      <button id="btn-restart" style="padding:14px 28px; background:#FF8C42; color:#11141b; border:none; border-radius:6px; font-size:18px; font-weight:bold; cursor:pointer;">CONTINUE</button>
    </div>

    <div id="screen-settings" style="position:absolute; inset:0; background:rgba(17,20,27,0.95); display:none; z-index:150; font-family:monospace; color:#FFF; padding:48px; flex-direction:column; gap:24px;">
      <h2 style="font-size:28px; margin:0; color:#FF7E5F;">SETTINGS</h2>
      <div style="display:flex; flex-direction:column; gap:16px; width:400px; font-size:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span>MASTER VOLUME</span>
          <input type="range" min="0" max="100" value="70" id="setting-vol" style="accent-color:#FF8C42;">
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span>CAMERA SHAKE</span>
          <input type="checkbox" checked id="setting-shake" style="transform:scale(1.5); accent-color:#FF8C42;">
        </div>
      </div>
      <button id="btn-close-settings" style="padding:12px 24px; background:#FF8C42; color:#11141b; border:none; border-radius:6px; font-weight:bold; cursor:pointer; width:160px;">BACK</button>
    </div>
  `;

  const bind = (id, evt, fn) => {
    const el = document.getElementById(id);
    if (el && fn) el.addEventListener(evt, fn);
  };

  bind('btn-continue', 'click', () => hooks && hooks.onContinue && hooks.onContinue());
  bind('btn-newgame', 'click', () => hooks && hooks.onNewGame && hooks.onNewGame());
  bind('btn-garage', 'click', () => hooks && hooks.onOpenGarage && hooks.onOpenGarage());
  bind('btn-jobboard', 'click', () => {
    const jb = document.getElementById('screen-jobboard');
    if (jb) jb.style.display = 'flex';
  });
  bind('btn-close-jobboard', 'click', () => {
    const jb = document.getElementById('screen-jobboard');
    if (jb) jb.style.display = 'none';
  });
  bind('btn-settings', 'click', () => {
    const s = document.getElementById('screen-settings');
    if (s) s.style.display = 'flex';
  });
  bind('btn-close-settings', 'click', () => {
    const s = document.getElementById('screen-settings');
    if (s) s.style.display = 'none';
  });
  bind('btn-close-garage', 'click', () => hooks && hooks.onCloseGarage && hooks.onCloseGarage());
  bind('btn-restart', 'click', () => hooks && hooks.onRestart && hooks.onRestart());

  return {
    showStart(visible) {
      const el = document.getElementById('screen-start');
      if (el) el.style.display = visible ? 'flex' : 'none';
    },
    showGarage(visible) {
      const el = document.getElementById('screen-garage');
      if (el) el.style.display = visible ? 'flex' : 'none';
    },
    showGameOver(visible, type = 'BUSTED') {
      const el = document.getElementById('screen-gameover');
      if (el) {
        el.style.display = visible ? 'flex' : 'none';
        const titleEl = document.getElementById('gameover-title');
        if (titleEl) titleEl.textContent = type;
      }
    }
  };
}
