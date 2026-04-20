// js/audio.js — ambient hum (2-hand proximity) + pinch zap sound

let audioCtx = null;
let humOsc   = null;
let humGain  = null;

export function initAudio() {
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    humOsc  = audioCtx.createOscillator();
    humGain = audioCtx.createGain();

    humOsc.type           = 'sine';
    humOsc.frequency.value = 100;
    humGain.gain.value     = 0;

    humOsc.connect(humGain);
    humGain.connect(audioCtx.destination);
    humOsc.start();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch (e) {
    console.error('Web Audio API failed', e);
  }
}

export function triggerZap() {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();

  const osc      = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(800, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.1);

  gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);

  osc.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  osc.onended = () => { osc.disconnect(); gainNode.disconnect(); };
  osc.start();
  osc.stop(audioCtx.currentTime + 0.15);
}

export function updateHum(hands) {
  if (!audioCtx || !humGain || !humOsc) return;

  if (hands.length < 2) {
    humGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.1);
    return;
  }

  const p1 = hands[0][8];
  const p2 = hands[1][8];
  const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);

  humOsc.frequency.setTargetAtTime(100 + (1 - Math.min(dist, 1)) * 300, audioCtx.currentTime, 0.1);
  humGain.gain.setTargetAtTime(0.05 + (1 - Math.min(dist, 1)) * 0.15, audioCtx.currentTime, 0.1);
}
