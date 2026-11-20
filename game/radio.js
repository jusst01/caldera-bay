// CALDERA BAY — radio.js
// Procedural WebAudio radio: 3 stations, synth loops, engine hum, skid/thumps, UI blips.

let audioCtx = null;
let currentStation = 0;
let schedulerTimer = null;
let stepIndex = 0;
let nextNoteTime = 0;

const STATIONS = [
  { name: 'OFF', track: 'Radio Mute', bpm: 120, scale: [0] },
  { name: 'RADIO CALDERA FM', track: 'Brisa de Ceniza — Los Faros', bpm: 110, scale: [110, 130.81, 164.81, 196, 220, 261.63, 329.63] },
  { name: 'ONDA NOCTURNA', track: 'Marea Baja — Violeta Ríos', bpm: 95, scale: [98, 116.54, 146.83, 174.61, 196, 233.08, 293.66] },
  { name: 'CENIZA INDUSTRIAL', track: 'Turno de Noche — Fábrica 9', bpm: 125, scale: [82.41, 98, 123.47, 130.81, 164.81, 185, 246.94] }
];

let engineOsc = null;
let engineGain = null;
let masterGain = null;

export function initRadio(saveData) {
  if (saveData && typeof saveData.radioStation === 'number') {
    currentStation = saveData.radioStation;
  }
}

function ensureAudio() {
  if (!audioCtx) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      audioCtx = new AudioCtx();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = 0.35;
      masterGain.connect(audioCtx.destination);

      engineOsc = audioCtx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 65;
      engineGain = audioCtx.createGain();
      engineGain.gain.value = 0;

      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 400;

      engineOsc.connect(filter);
      filter.connect(engineGain);
      engineGain.connect(masterGain);
      engineOsc.start();

      nextNoteTime = audioCtx.currentTime + 0.1;
      startScheduler();
    } catch (e) {}
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}

function startScheduler() {
  if (schedulerTimer) return;
  schedulerTimer = setInterval(() => {
    if (!audioCtx || currentStation === 0) return;
    const station = STATIONS[currentStation];
    if (!station || station.bpm <= 0) return;
    const spb = 60.0 / station.bpm / 4;
    while (nextNoteTime < audioCtx.currentTime + 0.14) {
      playStep(station, stepIndex, nextNoteTime);
      nextNoteTime += spb;
      stepIndex = (stepIndex + 1) % 16;
    }
  }, 25);
}

function playStep(station, step, time) {
  if (!audioCtx || !masterGain || masterGain.gain.value <= 0) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = currentStation === 1 ? 'sine' : (currentStation === 2 ? 'triangle' : 'sawtooth');
  const freq = station.scale[(step * 3 + (currentStation === 3 ? step % 5 : 1)) % station.scale.length] || 110;
  osc.frequency.setValueAtTime(freq, time);
  if (step % 4 === 0) osc.frequency.setValueAtTime(freq * 0.5, time);
  gain.gain.setValueAtTime(0.12, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.28);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(time);
  osc.stop(time + 0.32);
}

export function setStation(index) {
  ensureAudio();
  currentStation = index % STATIONS.length;
  stepIndex = 0;
  return STATIONS[currentStation];
}

export function nextStation() {
  ensureAudio();
  currentStation = (currentStation + 1) % STATIONS.length;
  stepIndex = 0;
  return STATIONS[currentStation];
}

export function getStationInfo() {
  return STATIONS[currentStation] || STATIONS[0];
}

export function updateEngine(speed, isDriving) {
  if (!audioCtx || !engineGain || !engineOsc) return;
  if (!isDriving || Math.abs(speed) < 1.0) {
    engineGain.gain.setValueAtTime(0, audioCtx.currentTime);
    return;
  }
  const freq = 50 + Math.min(Math.abs(speed) * 2.4, 320);
  engineOsc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  engineGain.gain.setValueAtTime(Math.min(0.22, 0.04 + Math.abs(speed) * 0.0006), audioCtx.currentTime);
}

export function playThump(isCollision) {
  ensureAudio();
  if (!audioCtx || !masterGain) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const now = audioCtx.currentTime;
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(isCollision ? 95 : 150, now);
  osc.frequency.exponentialRampToValueAtTime(25, now + 0.18);
  gain.gain.setValueAtTime(isCollision ? 0.4 : 0.18, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(now);
  osc.stop(now + 0.25);
}

export function playSkid() {
  ensureAudio();
  if (!audioCtx || !masterGain) return;
  const now = audioCtx.currentTime;
  const bufSize = audioCtx.sampleRate * 0.12;
  const buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * 0.8;
  const noise = audioCtx.createBufferSource();
  noise.buffer = buf;
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1200;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.1, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);
  noise.start(now);
}

export function playUiBlip() {
  ensureAudio();
  if (!audioCtx || !masterGain) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const now = audioCtx.currentTime;
  osc.type = 'sine';
  osc.frequency.setValueAtTime(600, now);
  osc.frequency.setValueAtTime(920, now + 0.04);
  gain.gain.setValueAtTime(0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(now);
  osc.stop(now + 0.12);
}
