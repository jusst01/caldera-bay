// game/radio.js — 3 fictional stations with WebAudio lookahead synth loops

export function createRadio(save) {
  let audioCtx = null;
  let timerId = null;
  let step = 0;
  let running = false;

  const STATIONS = [
    { name: "RADIO CALDERA FM", track: "Brisa de Ceniza — Los Faros", bpm: 110, scale: [0, 3, 7, 10, 12] },
    { name: "ONDA NOCTURNA", track: "Marea Baja — Violeta Ríos", bpm: 95, scale: [0, 2, 5, 7, 10] },
    { name: "CENIZA INDUSTRIAL", track: "Turno de Noche — Fábrica 9", bpm: 128, scale: [0, 1, 4, 7, 8] }
  ];

  function getStationIndex() {
    if (!save || typeof save.radioStation !== 'number') return 0;
    return save.radioStation;
  }

  function setStation(idx) {
    if (save) {
      save.radioStation = (idx + STATIONS.length) % STATIONS.length;
    }
  }

  function cycle() {
    const next = getStationIndex() + 1;
    setStation(next);
    return STATIONS[getStationIndex()];
  }

  function start() {
    if (window.__isPhotoLoading) return; // Never in photo mode or headless gates
    if (running) return;
    try {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtxClass) return;
      audioCtx = new AudioCtxClass();
      running = true;
      startScheduler();
    } catch (e) {
      console.warn('AudioContext not started:', e);
    }
  }

  function stop() {
    if (timerId) clearInterval(timerId);
    timerId = null;
    if (audioCtx) {
      audioCtx.close().catch(() => {});
      audioCtx = null;
    }
    running = false;
  }

  function startScheduler() {
    if (!audioCtx) return;
    const intervalMs = 125;
    timerId = setInterval(() => {
      if (!audioCtx || audioCtx.state !== 'running') return;
      const st = STATIONS[getStationIndex()];
      const now = audioCtx.currentTime;
      const noteIdx = (step % st.scale.length);
      const freq = 130 * Math.pow(2, (st.scale[noteIdx] + (step % 4 === 0 ? 12 : 0)) / 12);

      try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = getStationIndex() === 2 ? 'sawtooth' : 'sine';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(now);
        osc.stop(now + 0.35);
      } catch (e) {
        // Ignore audio errors in restricted test environments
      }

      step++;
    }, intervalMs);
  }

  return {
    start,
    stop,
    cycle,
    getCurrent() {
      return STATIONS[getStationIndex()];
    },
    getStations() {
      return STATIONS;
    }
  };
}
