// game/hud.js — full §6 panel grammar, minimap, start/garage screens, shop menus

export function createHud(ctx, hudRoot) {
  // Create HUD DOM structure
  hudRoot.innerHTML = `
    <!-- In-game HUD layer -->
    <div id="hud-in-game" style="position:absolute; inset:0; pointer-events:none;">
      <!-- Mission Panel (top-left) -->
      <div id="hud-mission" class="hud-panel" style="position:absolute; top:16px; left:16px; width:300px; background:rgba(20,20,28,0.85); border-left:4px solid #f2b441; padding:12px; border-radius:4px; color:#fff;">
        <div id="hp-job" style="font-size:13px; font-weight:bold; color:#f2b441; letter-spacing:1px;">JOB 1/8 — REPO MAN</div>
        <div id="hp-obj" style="font-size:18px; font-weight:bold; margin:4px 0; color:#fff;">Steal Corsario S</div>
        <div id="hp-stage" style="font-size:13px; color:#aaa;">STAGE 1/2 · NEXT: Deliver to Iris</div>
        <div id="hp-timer" style="font-size:20px; font-weight:bold; font-family:monospace; color:#ff7e5f; margin-top:4px; display:none;">02:30</div>
        <div id="hp-checklist" style="font-size:12px; font-family:monospace; color:#3e7c4f; margin-top:6px;">JOBS 0/8 ······</div>
      </div>

      <!-- Dispatch Panel (mid-left) -->
      <div id="hud-dispatch" class="hud-panel" style="position:absolute; top:196px; left:16px; width:280px; background:rgba(20,20,28,0.85); border-left:4px solid #c8402f; padding:10px; border-radius:4px; color:#fff;">
        <div id="dp-header" style="font-size:14px; font-weight:bold; color:#c8402f; margin-bottom:6px;">DISPATCH · HEAT 0 · 0 UNITS</div>
        <div id="dp-rows" style="display:flex; flex-direction:column; gap:4px; font-size:13px; font-family:monospace; color:#ccc;">
          <div>No active units</div>
        </div>
      </div>

      <!-- Heat & Cash (top-right) -->
      <div id="hud-heat-cash" class="hud-panel" style="position:absolute; top:16px; right:16px; display:flex; align-items:center; gap:16px; background:rgba(20,20,28,0.85); padding:10px 16px; border-radius:4px; color:#fff;">
        <div style="display:flex; align-items:center; gap:4px;">
          <div id="hp-pips" style="display:flex; gap:3px;">
            <span class="pip" style="width:16px; height:24px; background:#444; border-radius:2px;"></span>
            <span class="pip" style="width:16px; height:24px; background:#444; border-radius:2px;"></span>
            <span class="pip" style="width:16px; height:24px; background:#444; border-radius:2px;"></span>
            <span class="pip" style="width:16px; height:24px; background:#444; border-radius:2px;"></span>
            <span class="pip" style="width:16px; height:24px; background:#444; border-radius:2px;"></span>
          </div>
          <span id="hp-heat-label" style="font-size:16px; font-weight:bold; margin-left:6px; color:#f2b441;">HEAT 0</span>
        </div>
        <div style="text-align:right;">
          <div id="hp-cash" style="font-size:22px; font-weight:bold; font-family:monospace; color:#4c8a57;">$4,210</div>
          <div id="hp-rep" style="font-size:12px; color:#aaa;">FIXER · 520 REP</div>
        </div>
      </div>

      <!-- Takeover Strip (top-center) -->
      <div id="hud-takeover" class="hud-panel" style="position:absolute; top:16px; left:50%; transform:translateX(-50%); width:320px; background:rgba(20,20,28,0.85); padding:8px 12px; border-radius:4px; color:#fff; text-align:center;">
        <div style="font-size:13px; font-weight:bold; letter-spacing:1px; margin-bottom:4px; color:#f2b441;">CITY TAKEOVER 3/5</div>
        <div style="display:flex; height:6px; background:#333; border-radius:3px; overflow:hidden; gap:2px;">
          <div style="flex:1; background:#3e7c4f;" title="Muelle"></div>
          <div style="flex:1; background:#3e7c4f;" title="Paseo"></div>
          <div style="flex:1; background:#3e7c4f;" title="Verde"></div>
          <div style="flex:1; background:#555;" title="Ceniza"></div>
          <div style="flex:1; background:#333;" title="Cumbre"></div>
        </div>
      </div>

      <!-- Minimap (bottom-left) -->
      <div id="hud-minimap" class="hud-panel" style="position:absolute; bottom:16px; left:16px; width:180px; height:180px; background:rgba(20,20,28,0.9); border-radius:50%; overflow:hidden; border:3px solid #333; box-shadow:0 4px 12px rgba(0,0,0,0.5);">
        <canvas id="minimap-canvas" width="180" height="180" style="display:block;"></canvas>
        <div style="position:absolute; bottom:8px; width:100%; text-align:center; font-size:11px; font-weight:bold; color:#f2b441; text-shadow:0 1px 2px #000;">PASEO DORADO</div>
      </div>

      <!-- Vehicle Card & Weapon Row (bottom-right) -->
      <div style="position:absolute; bottom:16px; right:16px; display:flex; flex-direction:column; align-items:flex-end; gap:8px;">
        <!-- Weapon Row -->
        <div id="hud-weapons" style="display:flex; gap:6px; opacity:1; transition:opacity 0.2s;">
          <div class="wslot" data-slot="0" style="width:48px; height:48px; background:rgba(20,20,28,0.85); border:2px solid #444; border-radius:4px; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#fff; font-size:10px;">Fist</div>
          <div class="wslot" data-slot="1" style="width:48px; height:48px; background:rgba(20,20,28,0.85); border:2px solid #444; border-radius:4px; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#fff; font-size:10px;">Pistol<span style="font-size:9px;color:#aaa;">12/60</span></div>
          <div class="wslot" data-slot="2" style="width:48px; height:48px; background:rgba(20,20,28,0.85); border:2px solid #444; border-radius:4px; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#fff; font-size:10px;">SMG<span style="font-size:9px;color:#aaa;">30/120</span></div>
          <div class="wslot" data-slot="3" style="width:48px; height:48px; background:rgba(20,20,28,0.85); border:2px solid #444; border-radius:4px; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#fff; font-size:10px;">Shot<span style="font-size:9px;color:#aaa;">6/24</span></div>
        </div>
        <!-- Vehicle Card -->
        <div id="hud-vehicle" class="hud-panel" style="width:240px; background:rgba(20,20,28,0.85); padding:10px 14px; border-radius:4px; color:#fff; border-right:4px solid #f2b441;">
          <div id="vc-name" style="font-size:14px; font-weight:bold; color:#f2b441;">ZORRO GT</div>
          <div style="display:flex; align-items:baseline; gap:4px; margin:2px 0;">
            <span id="vc-speed" style="font-size:48px; font-weight:bold; font-family:monospace; line-height:1;">148</span>
            <span style="font-size:12px; color:#aaa;">KM/H</span>
          </div>
          <div style="background:#333; height:6px; border-radius:3px; overflow:hidden;">
            <div id="vc-cond" style="width:86%; height:100%; background:#3e7c4f;"></div>
          </div>
        </div>
      </div>

      <!-- Radio Card (bottom-center-left) -->
      <div id="hud-radio" class="hud-panel" style="position:absolute; bottom:16px; left:210px; width:220px; background:rgba(20,20,28,0.85); padding:8px 12px; border-radius:4px; color:#fff; border-left:3px solid #1f6e73;">
        <div id="rc-station" style="font-size:11px; font-weight:bold; color:#1f6e73; letter-spacing:1px;">RADIO CALDERA FM</div>
        <div id="rc-track" style="font-size:13px; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Brisa de Ceniza — Los Faros</div>
      </div>

      <!-- Dialogue Card (bottom-center) -->
      <div id="hud-dialogue" class="hud-panel" style="position:absolute; bottom:20px; left:50%; transform:translateX(-50%); width:520px; background:rgba(20,20,28,0.95); border:1px solid #444; padding:12px 16px; border-radius:6px; color:#fff; display:flex; gap:12px; align-items:center; display:none;">
        <div id="dc-portrait" style="width:48px; height:48px; background:#b4552d; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:18px;">DI</div>
        <div>
          <div id="dc-speaker" style="font-size:13px; font-weight:bold; color:#f2b441; margin-bottom:2px;">DOÑA IRIS</div>
          <div id="dc-text" style="font-size:15px; color:#fff;">Make sure you leave no trace behind.</div>
        </div>
      </div>

      <!-- Callout (center banner) -->
      <div id="hud-callout" style="position:absolute; top:25%; left:50%; transform:translate(-50%,-50%); font-size:24px; font-weight:bold; color:#fff; text-shadow:0 2px 8px rgba(0,0,0,0.8); background:rgba(200,64,47,0.85); padding:8px 24px; border-radius:4px; letter-spacing:1px; display:none;">ROADBLOCK AHEAD</div>

      <!-- Prompt (center-bottom) -->
      <div id="hud-prompt" style="position:absolute; bottom:140px; left:50%; transform:translateX(-50%); font-size:16px; font-weight:bold; color:#fff; background:rgba(0,0,0,0.8); padding:6px 16px; border-radius:4px; border:1px solid #f2b441; display:none;">E — STEAL ZORRO GT</div>
    </div>

    <!-- START SCREEN -->
    <div id="screen-start" style="position:fixed; inset:0; background:#11141b; z-index:2000; display:flex; color:#fff; font-family:sans-serif;">
      <!-- Left 40%: Title & Actions -->
      <div style="width:40%; background:linear-gradient(135deg, #1b2230 0%, #11141b 100%); padding:60px 40px; display:flex; flex-direction:column; justify-content:space-between; border-right:1px solid #2a3442;">
        <div>
          <div style="font-size:72px; font-weight:900; line-height:1; letter-spacing:-2px; color:#fff; margin-bottom:12px; text-shadow:0 4px 16px rgba(0,0,0,0.6);">CALDERA BAY</div>
          <div style="font-size:16px; font-weight:600; color:#f2b441; letter-spacing:1px; margin-bottom:40px;">8 JOBS · 5 DISTRICTS · ONE CITY TO TAKE</div>
          <div style="display:flex; flex-direction:column; gap:16px;">
            <button id="btn-continue" style="padding:16px 24px; background:#f2b441; color:#111; border:none; border-radius:6px; font-size:20px; font-weight:bold; cursor:pointer; text-align:left; box-shadow:0 4px 12px rgba(242,180,65,0.3);">CONTINUE — M7/8 · REP 520 · $4,210</button>
            <button id="btn-newgame" style="padding:14px 24px; background:#2a3442; color:#fff; border:none; border-radius:6px; font-size:18px; font-weight:bold; cursor:pointer; text-align:left;">NEW GAME</button>
          </div>
        </div>
        <div style="font-size:13px; color:#888;">AUTOSAVE ON · SLOT 1 · 14:32</div>
      </div>
      <!-- Right 60%: YOUR RISE Board -->
      <div style="width:60%; padding:60px; display:flex; flex-direction:column; justify-content:space-between; overflow-y:auto;">
        <div>
          <div style="font-size:28px; font-weight:bold; color:#fff; margin-bottom:20px; border-bottom:2px solid #2a3442; padding-bottom:10px;">YOUR RISE</div>

          <!-- REP Curve / Tiers -->
          <div style="margin-bottom:25px;">
            <div style="font-size:13px; color:#aaa; margin-bottom:8px;">REP PROGRESSION (FIXER 520)</div>
            <div style="display:flex; justify-content:between; background:#1b2230; padding:10px; border-radius:6px; gap:4px; text-align:center; font-size:11px;">
              <div style="flex:1; padding:6px; background:#2a3442; border-radius:4px;">NOBODY<br><span style="color:#aaa;">0</span></div>
              <div style="flex:1; padding:6px; background:#2a3442; border-radius:4px;">RUNNER<br><span style="color:#aaa;">100</span></div>
              <div style="flex:1; padding:6px; background:#2a3442; border-radius:4px;">WHEELMAN<br><span style="color:#aaa;">250</span></div>
              <div style="flex:1; padding:6px; background:#f2b441; color:#111; font-weight:bold; border-radius:4px;">FIXER<br><span>520</span></div>
              <div style="flex:1; padding:6px; background:#1b2230; border-radius:4px; color:#666;">BROKER<br><span>900</span></div>
              <div style="flex:1; padding:6px; background:#1b2230; border-radius:4px; color:#666;">LEYENDA<br><span>1400</span></div>
            </div>
          </div>

          <!-- 8 Job Rows -->
          <div style="margin-bottom:25px;">
            <div style="font-size:13px; color:#aaa; margin-bottom:8px;">STORY JOBS (6/8 COMPLETED)</div>
            <div id="start-job-rows" style="display:flex; flex-direction:column; gap:6px; font-size:13px;">
              <div style="display:flex; justify-content:between; background:#1b2230; padding:8px 12px; border-radius:4px;"><span style="color:#3e7c4f;">✓ 1. Repo Man</span><span>$300</span></div>
              <div style="display:flex; justify-content:between; background:#1b2230; padding:8px 12px; border-radius:4px;"><span style="color:#3e7c4f;">✓ 2. Hot Cargo</span><span>$450</span></div>
              <div style="display:flex; justify-content:between; background:#1b2230; padding:8px 12px; border-radius:4px;"><span style="color:#3e7c4f;">✓ 3. Loud Exit</span><span>$600</span></div>
              <div style="display:flex; justify-content:between; background:#1b2230; padding:8px 12px; border-radius:4px;"><span style="color:#3e7c4f;">✓ 4. Chop Shop Run</span><span>$800</span></div>
              <div style="display:flex; justify-content:between; background:#1b2230; padding:8px 12px; border-radius:4px;"><span style="color:#3e7c4f;">✓ 5. The Setup</span><span>$1,000</span></div>
              <div style="display:flex; justify-content:between; background:#1b2230; padding:8px 12px; border-radius:4px;"><span style="color:#3e7c4f;">✓ 6. Roadblock County</span><span>$1,200</span></div>
              <div style="display:flex; justify-content:between; background:#2a3442; border-radius:4px; padding:8px 12px; border-left:4px solid #f2b441;"><span style="font-weight:bold; color:#f2b441;">▶ 7. Sky Eye (Active)</span><span>$1,600</span></div>
              <div style="display:flex; justify-content:between; background:#1b2230; padding:8px 12px; border-radius:4px; color:#666;"><span>8. La Cumbre</span><span>$2,500</span></div>
            </div>
          </div>

          <!-- Takeover Chips & Stats -->
          <div style="display:flex; gap:20px;">
            <div style="flex:1;">
              <div style="font-size:13px; color:#aaa; margin-bottom:8px;">DISTRICT TAKEOVER (3/5)</div>
              <div style="display:flex; gap:6px; font-size:11px; text-align:center;">
                <div style="flex:1; background:#1b2230; padding:6px; border-radius:4px; border-top:3px solid #3e7c4f;">Muelle<br>100%</div>
                <div style="flex:1; background:#1b2230; padding:6px; border-radius:4px; border-top:3px solid #3e7c4f;">Paseo<br>80%</div>
                <div style="flex:1; background:#1b2230; padding:6px; border-radius:4px; border-top:3px solid #3e7c4f;">Verde<br>60%</div>
                <div style="flex:1; background:#1b2230; padding:6px; border-radius:4px; border-top:3px solid #333;">Ceniza<br>30%</div>
                <div style="flex:1; background:#1b2230; padding:6px; border-radius:4px; border-top:3px solid #333;">Cumbre<br>10%</div>
              </div>
            </div>
            <div style="width:200px;">
              <div style="font-size:13px; color:#aaa; margin-bottom:8px;">CAREER STATS</div>
              <div style="background:#1b2230; padding:8px 12px; border-radius:4px; font-size:12px; display:flex; flex-direction:column; gap:4px; color:#ccc;">
                <div>CARS STOLEN: <strong style="color:#fff;">41</strong></div>
                <div>TOP SPEED: <strong style="color:#fff;">247 KM/H</strong></div>
                <div>MAX HEAT: <strong style="color:#fff;">5</strong></div>
              </div>
            </div>
          </div>
        </div>
        <div style="font-size:12px; color:#666; margin-top:20px;">WASD DRIVE · E STEAL · TAB WHEEL · F5 SAVE · R RADIO</div>
      </div>
    </div>

    <!-- GARAGE SCREEN -->
    <div id="screen-garage" style="position:fixed; inset:0; background:rgba(17,20,27,0.96); z-index:2000; display:flex; flex-direction:column; color:#fff; font-family:sans-serif; padding:40px; display:none;">
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #2a3442; padding-bottom:16px; margin-bottom:24px;">
        <div style="font-size:28px; font-weight:bold; color:#f2b441;">IRIS'S GARAGE — CHOP & REPAIR</div>
        <button id="btn-close-garage" style="background:#2a3442; color:#fff; border:none; padding:10px 20px; border-radius:4px; font-weight:bold; cursor:pointer;">BACK TO CITY [ESC]</button>
      </div>

      <div style="display:flex; gap:24px; flex:1; overflow:hidden;">
        <!-- Left: Your Cars -->
        <div style="width:320px; background:#1b2230; border-radius:8px; padding:20px; display:flex; flex-direction:column; gap:12px;">
          <div style="font-size:16px; font-weight:bold; color:#f2b441; border-bottom:1px solid #2a3442; padding-bottom:8px;">YOUR CARS (4/4)</div>
          <div id="garage-cars-list" style="display:flex; flex-direction:column; gap:8px; overflow-y:auto; flex:1;">
            <div style="background:#2a3442; padding:10px; border-radius:6px; font-size:13px;">
              <div style="font-weight:bold;">ZORRO GT</div>
              <div style="color:#aaa; font-size:11px;">Condition: 86%</div>
              <div style="display:flex; gap:6px; margin-top:6px;">
                <button class="btn-repair" data-idx="0" style="flex:1; padding:4px; background:#3e7c4f; color:#fff; border:none; border-radius:3px; font-size:11px; cursor:pointer;">REPAIR $80</button>
                <button class="btn-rollout" data-idx="0" style="flex:1; padding:4px; background:#f2b441; color:#111; border:none; border-radius:3px; font-size:11px; cursor:pointer; font-weight:bold;">ROLL OUT</button>
              </div>
            </div>
            <div style="background:#2a3442; padding:10px; border-radius:6px; font-size:13px;">
              <div style="font-weight:bold;">CORSARIO S</div>
              <div style="color:#aaa; font-size:11px;">Condition: 91%</div>
              <div style="display:flex; gap:6px; margin-top:6px;">
                <button class="btn-repair" data-idx="1" style="flex:1; padding:4px; background:#3e7c4f; color:#fff; border:none; border-radius:3px; font-size:11px; cursor:pointer;">REPAIR $80</button>
                <button class="btn-rollout" data-idx="1" style="flex:1; padding:4px; background:#f2b441; color:#111; border:none; border-radius:3px; font-size:11px; cursor:pointer; font-weight:bold;">ROLL OUT</button>
              </div>
            </div>
            <div style="background:#2a3442; padding:10px; border-radius:6px; font-size:13px;">
              <div style="font-weight:bold;">MULA 4X4</div>
              <div style="color:#aaa; font-size:11px;">Condition: 74%</div>
              <div style="display:flex; gap:6px; margin-top:6px;">
                <button class="btn-repair" data-idx="2" style="flex:1; padding:4px; background:#3e7c4f; color:#fff; border:none; border-radius:3px; font-size:11px; cursor:pointer;">REPAIR $80</button>
                <button class="btn-rollout" data-idx="2" style="flex:1; padding:4px; background:#f2b441; color:#111; border:none; border-radius:3px; font-size:11px; cursor:pointer; font-weight:bold;">ROLL OUT</button>
              </div>
            </div>
            <div style="background:#2a3442; padding:10px; border-radius:6px; font-size:13px;">
              <div style="font-weight:bold;">SIRENA</div>
              <div style="color:#aaa; font-size:11px;">Condition: 100%</div>
              <div style="display:flex; gap:6px; margin-top:6px;">
                <button class="btn-repair" data-idx="3" style="flex:1; padding:4px; background:#3e7c4f; color:#fff; border:none; border-radius:3px; font-size:11px; cursor:pointer;">REPAIR $80</button>
                <button class="btn-rollout" data-idx="3" style="flex:1; padding:4px; background:#f2b441; color:#111; border:none; border-radius:3px; font-size:11px; cursor:pointer; font-weight:bold;">ROLL OUT</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Center: Turntable stats info -->
        <div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#1b2230; border-radius:8px; padding:20px; text-align:center;">
          <div style="font-size:32px; font-weight:bold; color:#f2b441; margin-bottom:8px;">ZORRO GT</div>
          <div style="font-size:16px; color:#aaa; margin-bottom:20px;">220 KM/H · GRIP 0.85</div>
          <button id="btn-sell-chop" style="padding:12px 32px; background:#c8402f; color:#fff; border:none; border-radius:6px; font-size:16px; font-weight:bold; cursor:pointer;">SELL TO CHOP ($320)</button>
        </div>

        <!-- Right: Chop Catalog -->
        <div style="width:360px; background:#1b2230; border-radius:8px; padding:20px; display:flex; flex-direction:column; gap:12px;">
          <div style="font-size:16px; font-weight:bold; color:#f2b441; border-bottom:1px solid #2a3442; padding-bottom:8px;">CHOP CATALOG (12)</div>
          <div id="garage-catalog" style="display:flex; flex-direction:column; gap:6px; overflow-y:auto; flex:1; font-size:13px;">
            <div style="display:flex; justify-content:between; background:#2a3442; padding:8px 12px; border-radius:4px;"><span>COLIBRÍ</span><span style="color:#4c8a57;">$50</span></div>
            <div style="display:flex; justify-content:between; background:#2a3442; padding:8px 12px; border-radius:4px;"><span>SIRENA</span><span style="color:#4c8a57;">$80</span></div>
            <div style="display:flex; justify-content:between; background:#2a3442; padding:8px 12px; border-radius:4px;"><span>BÓXER</span><span style="color:#4c8a57;">$90</span></div>
            <div style="display:flex; justify-content:between; background:#2a3442; padding:8px 12px; border-radius:4px;"><span>CAIMÁN</span><span style="color:#4c8a57;">$100</span></div>
            <div style="display:flex; justify-content:between; background:#2a3442; padding:8px 12px; border-radius:4px;"><span>MULA 4X4</span><span style="color:#4c8a57;">$120</span></div>
            <div style="display:flex; justify-content:between; background:#2a3442; padding:8px 12px; border-radius:4px;"><span>CORSARIO S</span><span style="color:#4c8a57;">$220</span></div>
            <div style="display:flex; justify-content:between; background:#2a3442; padding:8px 12px; border-radius:4px;"><span>FANTASMA</span><span style="color:#4c8a57;">$300</span></div>
            <div style="display:flex; justify-content:between; background:#2a3442; padding:8px 12px; border-radius:4px;"><span>ZORRO GT</span><span style="color:#4c8a57;">$320</span></div>
            <div style="display:flex; justify-content:between; background:#2a3442; padding:8px 12px; border-radius:4px;"><span>RELÁMPAGO</span><span style="color:#4c8a57;">$400</span></div>
            <div style="display:flex; justify-content:between; background:#2a3442; padding:8px 12px; border-radius:4px; color:#888;"><span>FÉNIX (Police)</span><span>TOO HOT</span></div>
            <div style="display:flex; justify-content:between; background:#2a3442; padding:8px 12px; border-radius:4px; color:#888;"><span>PERRO (SWAT)</span><span>TOO HOT</span></div>
            <div style="display:flex; justify-content:between; background:#2a3442; padding:8px 12px; border-radius:4px; color:#888;"><span>HALCÓN (Heli)</span><span>TOO HOT</span></div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:24px; border-top:1px solid #2a3442; padding-top:16px; font-size:14px;">
        <div style="font-weight:bold; font-family:monospace; color:#4c8a57; font-size:20px;">$4,210</div>
        <div style="color:#aaa;">REP: FIXER 520 / 900</div>
        <div style="color:#888;">AUTOSAVE ✓ 14:32 — SLOT 1: TAVO, M7/8</div>
      </div>
    </div>
  `;

  const minimapCanvas = document.getElementById('minimap-canvas');
  const minimapCtx = minimapCanvas.getContext('2d');

  // Pre-render minimap base offscreen once
  const baseCanvas = document.createElement('canvas');
  baseCanvas.width = 180;
  baseCanvas.height = 180;
  const bCtx = baseCanvas.getContext('2d');

  // Fill background dark teal/grey
  bCtx.fillStyle = '#1b2230';
  bCtx.fillRect(0, 0, 180, 180);

  // Draw grid roads
  bCtx.strokeStyle = '#333842';
  bCtx.lineWidth = 3;
  for (let i = 0; i <= 18; i += 3) {
    const pos = (i / 18) * 180;
    bCtx.beginPath(); bCtx.moveTo(pos, 0); bCtx.lineTo(pos, 180); bCtx.stroke();
    bCtx.beginPath(); bCtx.moveTo(0, pos); bCtx.lineTo(180, pos); bCtx.stroke();
  }
  // Major boulevards (center lines)
  bCtx.strokeStyle = '#f2b441';
  bCtx.lineWidth = 4;
  bCtx.beginPath(); bCtx.moveTo(90, 0); bCtx.lineTo(90, 180); bCtx.stroke();
  bCtx.beginPath(); bCtx.moveTo(0, 90); bCtx.lineTo(180, 90); bCtx.stroke();

  // Volcano glyph at north
  bCtx.fillStyle = '#5a5a60';
  bCtx.beginPath(); bCtx.arc(90, 25, 14, 0, Math.PI * 2); bCtx.fill();
  bCtx.fillStyle = '#ff8c42';
  bCtx.beginPath(); bCtx.arc(90, 25, 4, 0, Math.PI * 2); bCtx.fill();

  let activeMenuEl = null;

  function refreshPanels(mode) {
    const panels = hudRoot.querySelectorAll('.hud-panel');
    const startScreen = document.getElementById('screen-start');
    const garageScreen = document.getElementById('screen-garage');
    const isScreenOpen = (startScreen.style.display !== 'none' || garageScreen.style.display !== 'none' || activeMenuEl !== null);

    if (isScreenOpen || mode === 'off') {
      document.getElementById('hud-in-game').style.display = 'none';
      return;
    }

    document.getElementById('hud-in-game').style.display = 'block';

    const weaponsEl = document.getElementById('hud-weapons');
    const radioEl = document.getElementById('hud-radio');
    const dialogueEl = document.getElementById('hud-dialogue');

    if (mode === 'cover') {
      // Exactly six lit panels: mission, dispatch, heat-cash, minimap, vehicle, takeover
      document.getElementById('hud-mission').style.display = 'block';
      document.getElementById('hud-dispatch').style.display = 'block';
      document.getElementById('hud-heat-cash').style.display = 'flex';
      document.getElementById('hud-takeover').style.display = 'block';
      document.getElementById('hud-minimap').style.display = 'block';
      document.getElementById('hud-vehicle').style.display = 'block';

      // Weapons dimmed to 40%
      if (weaponsEl) weaponsEl.style.opacity = '0.4';
      // Radio + dialogue hidden
      if (radioEl) radioEl.style.display = 'none';
      if (dialogueEl) dialogueEl.style.display = 'none';
    } else {
      // Full mode
      panels.forEach(p => p.style.display = 'block');
      if (weaponsEl) weaponsEl.style.opacity = '1';
      if (radioEl) radioEl.style.display = 'block';
    }
  }

  // Dirty check cache for text updates
  let lastTextState = {};
  function updateText(elId, text) {
    const el = document.getElementById(elId);
    if (el && lastTextState[elId] !== text) {
      el.textContent = text;
      lastTextState[elId] = text;
    }
  }

  return {
    update(snapshot) {
      const { player, police, save, missions, economy, radio, simTime, lastEvent, dialogueLine } = snapshot;

      // Mission Panel update
      const obj = missions.currentObjective();
      if (obj) {
        updateText('hp-job', `JOB ${save.missionIndex + 1}/8 — ${obj.jobLabel}`);
        updateText('hp-obj', obj.objective);
        updateText('hp-stage', `${obj.stageLabel} · NEXT: ${obj.next}`);
        const timerEl = document.getElementById('hp-timer');
        if (obj.timer !== undefined) {
          timerEl.style.display = 'block';
          const mins = Math.floor(Math.max(0, obj.timer) / 60).toString().padStart(2, '0');
          const secs = Math.floor(Math.max(0, obj.timer) % 60).toString().padStart(2, '0');
          updateText('hp-timer', `${mins}:${secs}`);
        } else {
          timerEl.style.display = 'none';
        }
      } else {
        updateText('hp-job', `CALDERA BAY — FREEROAM`);
        updateText('hp-obj', 'Explore or visit mission start');
        updateText('hp-stage', 'NO ACTIVE MISSION');
        document.getElementById('hp-timer').style.display = 'none';
      }

      const jobsDone = save.jobsDone || 0;
      let checkStr = 'JOBS ' + jobsDone + '/8 ';
      for (let i = 0; i < 8; i++) {
        checkStr += (i < jobsDone ? '✓' : '·');
      }
      updateText('hp-checklist', checkStr);

      // Dispatch Panel update
      const dispatchEl = document.getElementById('hud-dispatch');
      if (police.heat === 0) {
        dispatchEl.style.display = 'none';
      } else {
        dispatchEl.style.display = 'block';
        updateText('dp-header', `DISPATCH · HEAT ${police.heat} · ${police.units.length} UNITS`);
        const rowsEl = document.getElementById('dp-rows');
        let dHtml = '';
        const activeUnits = police.units.slice(0, 4);
        activeUnits.forEach(u => {
          const dist = Math.round(Math.hypot(u.x - player.x, u.z - player.z));
          dHtml += `<div style="display:flex; justify-content:space-between;"><span>${u.name}</span><span style="color:#aaa;">${dist}m · ${u.tactic}</span></div>`;
        });
        if (police.units.length > 4) {
          dHtml += `<div style="color:#f2b441; font-size:12px;">+${police.units.length - 4} more units</div>`;
        }
        rowsEl.innerHTML = dHtml;
      }

      // Heat pips & cash
      updateText('hp-heat-label', `HEAT ${police.heat}`);
      updateText('hp-cash', `$${save.cash.toLocaleString()}`);
      updateText('hp-rep', `${(save.rep >= 1400 ? 'LEYENDA' : save.rep >= 900 ? 'BROKER' : save.rep >= 500 ? 'FIXER' : save.rep >= 250 ? 'WHEELMAN' : save.rep >= 100 ? 'RUNNER' : 'NOBODY')} · ${save.rep} REP`);

      const pips = document.querySelectorAll('.pip');
      pips.forEach((pip, idx) => {
        pip.style.background = idx < police.heat ? '#f2b441' : '#444';
      });

      // Vehicle card
      if (player.mode === 'drive' && player.car) {
        document.getElementById('hud-vehicle').style.display = 'block';
        updateText('vc-name', player.car.spec.name.toUpperCase());
        const speedKmh = Math.abs(Math.round(player.car.speed * 3.6));
        updateText('vc-speed', speedKmh.toString());
        const cond = player.car.durability !== undefined ? player.car.durability : 100;
        document.getElementById('vc-cond').style.width = `${cond}%`;
      } else {
        document.getElementById('hud-vehicle').style.display = 'none';
      }

      // Radio card
      if (radio) {
        const curStation = radio.getCurrent();
        updateText('rc-station', curStation.name);
        updateText('rc-track', curStation.track);
      }

      // Dialogue card
      const dialogueEl = document.getElementById('hud-dialogue');
      if (dialogueLine && (simTime - dialogueLine.time) < 7.0 && dialogueLine.text) {
        dialogueEl.style.display = 'flex';
        updateText('dc-speaker', dialogueLine.speaker);
        updateText('dc-text', dialogueLine.text);
      } else {
        dialogueEl.style.display = 'none';
      }

      // Callout banner
      const calloutEl = document.getElementById('hud-callout');
      if (lastEvent && (simTime - lastEvent.time) < 2.0 && lastEvent.text) {
        calloutEl.style.display = 'block';
        updateText('hud-callout', lastEvent.text.toUpperCase());
      } else {
        calloutEl.style.display = 'none';
      }

      // Minimap render
      minimapCtx.clearRect(0, 0, 180, 180);
      minimapCtx.drawImage(baseCanvas, 0, 0);

      // Draw player on minimap (center 90, 90)
      minimapCtx.save();
      minimapCtx.translate(90, 90);
      const heading = player.mode === 'drive' && player.car ? player.car.heading : player.heading || 0;
      minimapCtx.rotate(heading);
      minimapCtx.fillStyle = '#f2b441';
      minimapCtx.beginPath();
      minimapCtx.moveTo(0, -8);
      minimapCtx.lineTo(-6, 6);
      minimapCtx.lineTo(6, 6);
      minimapCtx.closePath();
      minimapCtx.fill();
      minimapCtx.restore();

      // Draw police units on minimap
      if (police.units) {
        minimapCtx.fillStyle = '#c8402f';
        police.units.forEach(u => {
          const dx = (u.x - player.x) * 0.3; // scale factor
          const dz = (u.z - player.z) * 0.3;
          if (Math.hypot(dx, dz) < 85) {
            minimapCtx.beginPath();
            minimapCtx.arc(90 + dx, 90 + dz, 3, 0, Math.PI * 2);
            minimapCtx.fill();
          }
        });
      }

      // Draw objective marker on minimap
      const markerPos = missions.marker() || economy.marker();
      if (markerPos) {
        const mx = (markerPos[0] - player.x) * 0.3;
        const mz = (markerPos[1] - player.z) * 0.3;
        if (Math.hypot(mx, mz) < 85) {
          minimapCtx.fillStyle = '#f2b441';
          minimapCtx.beginPath();
          minimapCtx.arc(90 + mx, 90 + mz, 5, 0, Math.PI * 2);
          minimapCtx.fill();
        }
      }
    },

    setPanels(mode) {
      refreshPanels(mode);
    },

    showStartScreen(onContinue, onNewGame) {
      const el = document.getElementById('screen-start');
      el.style.display = 'flex';
      refreshPanels('off');

      const contBtn = document.getElementById('btn-continue');
      contBtn.onclick = () => {
        el.style.display = 'none';
        if (onContinue) onContinue();
      };

      const newBtn = document.getElementById('btn-newgame');
      newBtn.onclick = () => {
        el.style.display = 'none';
        if (onNewGame) onNewGame();
      };
    },

    hideStartScreen() {
      document.getElementById('screen-start').style.display = 'none';
      refreshPanels('full');
    },

    showGarageScreen(options) {
      const el = document.getElementById('screen-garage');
      el.style.display = 'flex';
      refreshPanels('off');

      const closeBtn = document.getElementById('btn-close-garage');
      closeBtn.onclick = () => {
        el.style.display = 'none';
        if (options && options.onClose) options.onClose();
      };
    },

    hideGarageScreen() {
      document.getElementById('screen-garage').style.display = 'none';
      refreshPanels('full');
    },

    openMenu({ title, build }) {
      if (activeMenuEl) activeMenuEl.remove();
      refreshPanels('off');
      const menuData = build();
      const el = document.createElement('div');
      el.style.cssText = 'position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:rgba(20,20,28,0.96); color:#fff; padding:24px; border-radius:8px; border:1px solid #f2b441; z-index:3000; min-width:340px; font-family:sans-serif; box-shadow:0 8px 24px rgba(0,0,0,0.6);';

      let html = `<h2 style="margin:0 0 12px;font-size:18px;color:#f2b441;border-bottom:1px solid #333;padding-bottom:8px;">${title}</h2>`;
      if (menuData.subtitle) html += `<div style="margin-bottom:16px;color:#aaa;font-size:14px;">${menuData.subtitle}</div>`;
      html += `<div style="display:flex;flex-direction:column;gap:8px;">`;
      menuData.rows.forEach((row, idx) => {
        html += `<button data-idx="${idx}" style="padding:12px;background:#2a3442;color:#fff;border:none;border-radius:4px;cursor:pointer;text-align:left;font-size:14px;font-weight:bold;transition:background 0.1s;">[${idx+1}] ${row.label}${row.detail ? ' — ' + row.detail : ''}</button>`;
      });
      html += `</div>`;
      el.innerHTML = html;
      document.body.appendChild(el);
      activeMenuEl = el;

      el.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.getAttribute('data-idx'));
          const row = menuData.rows[idx];
          const res = row.action();
          if (res === 'close') {
            this.closeMenu();
          } else {
            this.closeMenu();
            this.openMenu({ title, build });
          }
        });
      });
    },

    closeMenu() {
      if (activeMenuEl) {
        activeMenuEl.remove();
        activeMenuEl = null;
        refreshPanels('full');
      }
    },

    showPrompt(text) {
      const p = document.getElementById('hud-prompt');
      if (text) {
        p.style.display = 'block';
        updateText('hud-prompt', text);
      } else {
        p.style.display = 'none';
      }
    }
  };
}
