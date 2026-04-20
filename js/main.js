// js/main.js — global state, render loop, init wiring
// NOTE: ES module imports must all be at top. Circular deps are fine here
// because all imported values are only used inside function bodies (not at
// module eval time), giving all modules time to fully initialize first.

import { drawBackground, updatePhysics, clearLayers, createParticles, createShockwave } from './effects.js';
import { detectGestures } from './gestures.js';
import { initAudio } from './audio.js';
import { initMediaPipe } from './mediapipe.js';
import { takeScreenshot, startRecording, stopRecording } from './capture.js';

// ─── Canvas refs ─────────────────────────────────────────────────────────────
export const bgCanvas     = document.getElementById('bgCanvas');
export const mainCanvas   = document.getElementById('mainCanvas');
export const bgCtx        = bgCanvas.getContext('2d');
export const ctx          = mainCanvas.getContext('2d');
export const videoElement = document.querySelector('.input_video');

// ─── UI refs ──────────────────────────────────────────────────────────────────
export const uiHands   = document.getElementById('ui-hands');
export const uiFps     = document.getElementById('ui-fps');
export const uiGesture = document.getElementById('ui-gesture');
export const uiSpread  = document.getElementById('ui-spread');
export const uiTrail   = document.getElementById('ui-trail');

// ─── Shared state ─────────────────────────────────────────────────────────────
export const state = {
  width: 0,
  height: 0,
  time: 0,
  hands: [],
  handVelocity: 0,
  theme: 'Rainbow',
  trailMode: false,
  recording: false,
  facingMode: 'user',
  customColor: '#00ffcc',
};

// ─── Themes ───────────────────────────────────────────────────────────────────
export const themes = {
  Rainbow:  (t, i, total) => `hsl(${(t * 100 + i * (360 / (total || 1))) % 360}, 100%, 60%)`,
  Cyberpunk:(t, i)        => i % 2 === 0 ? '#ff003c' : '#00f0ff',
  Lava:     (t, i)        => `hsl(${(10 + i * 10) % 40}, 100%, ${50 + Math.sin(t) * 10}%)`,
  Ocean:    (t, i)        => `hsl(${180 + i * 20}, 100%, 60%)`,
  Galaxy:   (t, i)        => `hsl(${260 + Math.sin(t * 2 + i) * 40}, 100%, 65%)`,
  Custom:   ()            => state.customColor,
};

export const FINGER_TIPS = [4, 8, 12, 16, 20];

// ─── mapToCanvas — exported for use by gestures.js ────────────────────────────
export function mapToCanvas(pt) {
  return { x: pt.x * state.width, y: pt.y * state.height };
}

// Re-export createShockwave so gestures.js can import it from one place
export { createShockwave };

// ─── Timing ───────────────────────────────────────────────────────────────────
let lastTime         = 0;
let framesThisSecond = 0;
let lastFpsTime      = performance.now();
let loopRunning      = false;

// ─── Resize ───────────────────────────────────────────────────────────────────
function resize() {
  state.width       = window.innerWidth;
  state.height      = window.innerHeight;
  bgCanvas.width    = state.width;
  bgCanvas.height   = state.height;
  mainCanvas.width  = state.width;
  mainCanvas.height = state.height;
}
window.addEventListener('resize', resize);
resize();

// ─── Render loop ──────────────────────────────────────────────────────────────
function renderLoop(timestamp) {
  requestAnimationFrame(renderLoop);
  if (lastTime === 0) { lastTime = timestamp; }
  const dt = (timestamp - lastTime) / 1000;
  lastTime = timestamp;
  state.time += dt;

  framesThisSecond++;
  if (timestamp > lastFpsTime + 1000) {
    uiFps.textContent = framesThisSecond;
    framesThisSecond = 0;
    lastFpsTime = timestamp;
  }

  drawBackground();

  if (!state.trailMode) {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(0, 0, state.width, state.height);
  }
  ctx.globalCompositeOperation = 'screen';

  updatePhysics();

  if (state.hands.length > 0) {
    drawHands();
    detectGestures();
  }

  uiHands.textContent = state.hands.length;
  ctx.globalCompositeOperation = 'source-over';
  drawWatermark();
}

// ─── Watermark ────────────────────────────────────────────────────────────────
function drawWatermark() {
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  // Canvas is CSS-flipped (scaleX -1) — undo flip so text reads correctly
  ctx.translate(state.width, 0);
  ctx.scale(-1, 1);
  const accent = themes[state.theme](state.time, 1, 2);
  ctx.font = 'bold 14px "Inter", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  // glow pass
  ctx.shadowBlur  = 10;
  ctx.shadowColor = accent;
  ctx.fillStyle   = accent;
  ctx.globalAlpha = 0.6;
  ctx.fillText('Bahaa Mohammed', state.width / 2, state.height - 20);
  // crisp white pass
  ctx.shadowBlur  = 0;
  ctx.globalAlpha = 0.4;
  ctx.fillStyle   = '#ffffff';
  ctx.fillText('Bahaa Mohammed', state.width / 2, state.height - 20);
  ctx.restore();
}

// ─── Hand drawing (uses MediaPipe globals: drawConnectors, HAND_CONNECTIONS) ──
function drawHands() {
  if (typeof drawConnectors === 'undefined' || typeof HAND_CONNECTIONS === 'undefined') return;
  ctx.save();
  state.hands.forEach((hand, handIndex) => {
    const glowColor = themes[state.theme](state.time, handIndex, 2);

    // eslint-disable-next-line no-undef
    drawConnectors(ctx, hand, HAND_CONNECTIONS, { color: glowColor, lineWidth: 2 });

    ctx.shadowBlur  = 15;
    ctx.shadowColor = glowColor;

    FINGER_TIPS.forEach((tipIndex, idx) => {
      const pt     = mapToCanvas(hand[tipIndex]);
      const tipCol = themes[state.theme](state.time, idx, FINGER_TIPS.length);

      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();

      if (Math.random() > 0.6) createParticles(pt, tipCol, 1);
    });
    ctx.shadowBlur = 0;
  });

  if (state.hands.length >= 2) drawCrossHandEffects();
  ctx.restore();
}

// ─── Cross-hand effects ───────────────────────────────────────────────────────
function drawCrossHandEffects() {
  ctx.save();
  const h1 = state.hands[0];
  const h2 = state.hands[1];

  FINGER_TIPS.forEach((tipIndex, idx) => {
    const pt1  = mapToCanvas(h1[tipIndex]);
    const pt2  = mapToCanvas(h2[tipIndex]);
    const dist = Math.hypot(pt1.x - pt2.x, pt1.y - pt2.y);
    const col  = themes[state.theme](state.time, idx, FINGER_TIPS.length);

    if (dist < 150 && Math.random() > 0.5) {
      ctx.beginPath();
      ctx.moveTo(pt1.x, pt1.y);
      const midX = (pt1.x + pt2.x) / 2 + (Math.random() - 0.5) * 50;
      const midY = (pt1.y + pt2.y) / 2 + (Math.random() - 0.5) * 50;
      ctx.lineTo(midX, midY);
      ctx.lineTo(pt2.x, pt2.y);
      ctx.strokeStyle = '#ffffff';
      ctx.shadowBlur  = 20;
      ctx.shadowColor = col;
      ctx.lineWidth   = 3;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.moveTo(pt1.x, pt1.y);
    ctx.lineTo(pt2.x, pt2.y);
    const grad = ctx.createLinearGradient(pt1.x, pt1.y, pt2.x, pt2.y);
    grad.addColorStop(0,   themes[state.theme](state.time, idx,     5));
    grad.addColorStop(0.5, themes[state.theme](state.time, idx + 1, 5));
    grad.addColorStop(1,   themes[state.theme](state.time, idx + 2, 5));
    ctx.strokeStyle = grad;
    ctx.lineWidth   = 4;
    ctx.shadowBlur  = 10;
    ctx.shadowColor = col;
    ctx.stroke();
    ctx.shadowBlur = 0;
  });

  // Mandala
  const allTips = [
    ...FINGER_TIPS.map(t => mapToCanvas(h1[t])),
    ...FINGER_TIPS.map(t => mapToCanvas(h2[t])),
  ];
  const cx = allTips.reduce((s, p) => s + p.x, 0) / 10;
  const cy = allTips.reduce((s, p) => s + p.y, 0) / 10;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(state.time * 0.5);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const t1 = { x: allTips[i].x - cx,            y: allTips[i].y - cy };
    const t2 = { x: allTips[(i + 3) % 10].x - cx, y: allTips[(i + 3) % 10].y - cy };
    ctx.moveTo(t1.x, t1.y);
    ctx.lineTo(t2.x, t2.y);
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
  ctx.restore();
}

// ─── Theme switcher ───────────────────────────────────────────────────────────
document.querySelectorAll('.theme-btn').forEach(btn => {
  btn.addEventListener('click', e => {
    document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
    e.currentTarget.classList.add('active');
    state.theme = e.currentTarget.dataset.theme;

    const colorWrap = document.getElementById('customColorWrap');
    if (state.theme === 'Custom') {
      colorWrap.classList.add('visible');
    } else {
      colorWrap.classList.remove('visible');
      document.documentElement.style.setProperty('--accent', themes[state.theme](0, 1, 1));
    }
  });
});

document.getElementById('customColorInput').addEventListener('input', e => {
  state.customColor = e.target.value;
  document.documentElement.style.setProperty('--accent', state.customColor);
});

// ─── Action bar buttons ───────────────────────────────────────────────────────
document.getElementById('screenshotBtn').addEventListener('click', takeScreenshot);

document.getElementById('recordBtn').addEventListener('click', () => {
  if (state.recording) {
    stopRecording();
    document.getElementById('recordBtn').classList.remove('active');
    document.getElementById('recordBtn').textContent = '⏺';
  } else {
    startRecording();
    document.getElementById('recordBtn').classList.add('active');
    document.getElementById('recordBtn').textContent = '⏹';
  }
});

document.getElementById('trailBtn').addEventListener('click', () => {
  state.trailMode = !state.trailMode;
  uiTrail.textContent = state.trailMode ? 'ON' : 'OFF';
  document.getElementById('trailBtn').classList.toggle('active', state.trailMode);
});

document.getElementById('clearBtn').addEventListener('click', clearLayers);

if (!window.MediaRecorder) {
  document.getElementById('recordBtn').style.display = 'none';
}

// ─── Camera toggle ────────────────────────────────────────────────────────────
document.getElementById('cameraToggle').addEventListener('click', () => {
  state.facingMode = state.facingMode === 'user' ? 'environment' : 'user';
  initMediaPipe();
});

// ─── Start button ─────────────────────────────────────────────────────────────
document.getElementById('startBtn').addEventListener('click', () => {
  document.getElementById('startOverlay').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
  document.getElementById('themes').classList.remove('hidden');
  document.getElementById('actionBar').classList.remove('hidden');
  initAudio();
  initMediaPipe();
  if (!loopRunning) { loopRunning = true; requestAnimationFrame(renderLoop); }
});
