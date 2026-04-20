# NEON AURA AR Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a multi-file browser AR hand-tracking experience with neon visuals, Web Audio, and four enhancements (screenshot/record, trail mode, mobile support, custom theme picker), deployed to GitHub Pages.

**Architecture:** MediaPipe Hands via CDN globals renders landmarks into shared canvas refs exported from `main.js`. All modules import `state`, `themes`, `bgCtx`, `ctx` from `main.js` and mutate `state` directly. Render loop in `main.js` calls functions from each module each frame.

**Tech Stack:** Vanilla HTML/CSS/ES Modules, MediaPipe Hands (CDN), Web Audio API, Canvas 2D, MediaRecorder API, GitHub Pages

---

## File Map

| File | Responsibility |
|---|---|
| `index.html` | DOM skeleton, CDN script tags, imports `js/main.js` as module |
| `style.css` | All CSS: layout, glassmorphism panels, theme buttons, overlays, media queries |
| `js/main.js` | Exports: `state`, `themes`, `FINGER_TIPS`, `bgCanvas`, `mainCanvas`, `bgCtx`, `ctx`, `videoElement`. Init, resize, render loop, start-button wiring |
| `js/effects.js` | `drawBackground()`, `createParticles()`, `createShockwave()`, `updatePhysics()`, `clearLayers()` |
| `js/gestures.js` | `detectGestures()`, exports `getDist()`, `mapToCanvas()` |
| `js/audio.js` | `initAudio()`, `triggerZap()`, `updateHum()` |
| `js/mediapipe.js` | `initMediaPipe()` — sets up `Hands` + `Camera`, writes to `state.hands` |
| `js/capture.js` | `takeScreenshot()`, `startRecording()`, `stopRecording()` |
| `README.md` | Project description, features, live demo link, local dev instructions |
| `.gitignore` | `.DS_Store`, `.superpowers/`, `node_modules/` |

---

## Task 1: Project Scaffold

**Files:**
- Create: `index.html`
- Create: `style.css`
- Create: `.gitignore`
- Create: `README.md`

- [ ] **Step 1: Create `.gitignore`**

```
.DS_Store
.superpowers/
node_modules/
```

- [ ] **Step 2: Create `README.md`**

```markdown
# NEON AURA AR

Browser-based AR hand-tracking experience. Hold your hands in front of the camera and watch neon effects react to your movements.

## Live Demo

[ibahaaaldi.github.io/NEON-AURA-AR](https://ibahaaaldi.github.io/NEON-AURA-AR/)

## Features

- Real-time hand tracking via MediaPipe Hands (up to 2 hands)
- Neon skeleton + particle sparks at fingertips
- Matrix rain background that reacts to hand velocity
- Cross-hand lightning and gradient lines
- Mandala drawing when both hands are visible
- Pinch gesture triggers shockwave + zap sound
- 5 themes: Rainbow, Cyberpunk, Lava, Ocean, Galaxy
- Custom color theme picker
- Screenshot (PNG) and screen recording (WebM)
- Trail/draw mode — let fingertip trails accumulate
- Mobile support with front/rear camera toggle

## Run Locally

Requires a local server (ES modules need CORS headers):

```bash
npx serve .
```

Then open `http://localhost:3000`.

## Stack

Vanilla HTML/CSS/JS — no build step, no dependencies.
```

- [ ] **Step 3: Create `style.css`**

```css
:root {
  --bg-color: #050510;
  --text-color: #ffffff;
  --glass-bg: rgba(20, 25, 40, 0.4);
  --glass-border: rgba(255, 255, 255, 0.15);
  --glass-blur: blur(16px);
  --accent: #00ffcc;
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background-color: var(--bg-color);
  color: var(--text-color);
  overflow: hidden;
}

.video-container {
  position: absolute;
  width: 100vw;
  height: 100vh;
}

.input_video {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  object-fit: cover;
  transform: scaleX(-1);
  z-index: 0;
  filter: brightness(0.6) contrast(1.1);
}

#bgCanvas, #mainCanvas {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  object-fit: cover;
  transform: scaleX(-1);
}

#bgCanvas  { z-index: 1; pointer-events: none; }
#mainCanvas { z-index: 5; pointer-events: none; }

/* HUD */
#hud {
  position: absolute;
  top: 20px; left: 20px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 15px;
  pointer-events: none;
}

.panel {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  padding: 15px 20px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.5);
}

.stat {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 0.9rem;
  color: rgba(255,255,255,0.8);
  min-width: 180px;
}
.stat:last-child { margin-bottom: 0; }
.stat span.val { font-weight: bold; color: var(--accent); }

/* Theme bar */
#themes {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  display: flex;
  gap: 10px;
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: 30px;
  padding: 8px;
  transition: opacity 0.5s;
  max-width: calc(100vw - 40px);
  overflow-x: auto;
}

.theme-btn {
  background: transparent;
  border: 1px solid transparent;
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  cursor: pointer;
  transition: 0.3s ease;
  font-weight: 500;
  white-space: nowrap;
  min-height: 44px;
}
.theme-btn.active {
  background: rgba(255,255,255,0.15);
  border-color: rgba(255,255,255,0.3);
  text-shadow: 0 0 10px white;
}

/* Color picker (custom theme) */
#customColorWrap {
  display: none;
  align-items: center;
  gap: 6px;
}
#customColorWrap.visible { display: flex; }
#customColorInput {
  width: 32px; height: 32px;
  border: none; border-radius: 50%;
  cursor: pointer; padding: 0;
  background: transparent;
}

/* Floating action bar (capture + trail) */
#actionBar {
  position: absolute;
  bottom: 80px;
  right: 20px;
  z-index: 20;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.action-btn {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  color: white;
  border-radius: 50%;
  width: 48px; height: 48px;
  font-size: 1.2rem;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.2s;
}
.action-btn:hover { background: rgba(255,255,255,0.15); }
.action-btn.active { background: rgba(255,80,80,0.4); border-color: #ff5050; }

/* Camera toggle (mobile) */
#cameraToggle {
  position: absolute;
  top: 20px; right: 20px;
  z-index: 20;
}

/* Start overlay */
#startOverlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.85);
  z-index: 100;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  backdrop-filter: blur(10px);
  transition: opacity 0.5s ease;
}

.start-btn {
  padding: 16px 40px;
  font-size: 1.2rem;
  background: linear-gradient(45deg, #ff00cc, #3333ff);
  border: none;
  color: white;
  border-radius: 30px;
  cursor: pointer;
  box-shadow: 0 0 20px rgba(255,0,204,0.5);
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 2px;
  transition: transform 0.2s;
  min-height: 44px;
}
.start-btn:hover { transform: scale(1.05); }

.hidden { opacity: 0; pointer-events: none; }

/* Responsive */
@media (max-width: 600px) {
  .panel { padding: 10px 14px; }
  .stat { font-size: 0.8rem; min-width: 150px; }
  #hud { top: 10px; left: 10px; gap: 8px; }
  #actionBar { bottom: 90px; right: 10px; }
}
```

- [ ] **Step 4: Create `index.html`**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <title>NEON AURA AR</title>
  <link rel="stylesheet" href="style.css" />

  <!-- MediaPipe CDN (globals: Hands, Camera, drawConnectors, HAND_CONNECTIONS) -->
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js" crossorigin="anonymous"></script>
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/control_utils/control_utils.js" crossorigin="anonymous"></script>
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js" crossorigin="anonymous"></script>
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js" crossorigin="anonymous"></script>
</head>
<body>

  <!-- Start overlay -->
  <div id="startOverlay">
    <h1 style="margin-bottom:20px;font-weight:300;letter-spacing:4px">NEON AURA AR</h1>
    <p style="margin-bottom:40px;color:#888">Grant camera permissions and click to start</p>
    <button class="start-btn" id="startBtn">Enter Experience</button>
  </div>

  <!-- Camera + canvas layers -->
  <div class="video-container">
    <video class="input_video" autoplay playsinline></video>
    <canvas id="bgCanvas"></canvas>
    <canvas id="mainCanvas"></canvas>
  </div>

  <!-- HUD -->
  <div id="hud" class="hidden">
    <div class="panel">
      <div class="stat">Hands Detected: <span class="val" id="ui-hands">0</span></div>
      <div class="stat">FPS: <span class="val" id="ui-fps">0</span></div>
      <div class="stat">Trail Mode: <span class="val" id="ui-trail">OFF</span></div>
    </div>
    <div class="panel">
      <div class="stat">Gesture: <span class="val" id="ui-gesture">None</span></div>
      <div class="stat">Spread: <span class="val" id="ui-spread">0%</span></div>
    </div>
  </div>

  <!-- Theme bar -->
  <div id="themes" class="hidden">
    <button class="theme-btn active" data-theme="Rainbow">Rainbow</button>
    <button class="theme-btn" data-theme="Cyberpunk">Cyberpunk</button>
    <button class="theme-btn" data-theme="Lava">Lava</button>
    <button class="theme-btn" data-theme="Ocean">Ocean</button>
    <button class="theme-btn" data-theme="Galaxy">Galaxy</button>
    <button class="theme-btn" data-theme="Custom">Custom</button>
    <div id="customColorWrap">
      <input type="color" id="customColorInput" value="#00ffcc" />
    </div>
  </div>

  <!-- Floating action bar -->
  <div id="actionBar" class="hidden">
    <button class="action-btn" id="screenshotBtn" title="Screenshot">📷</button>
    <button class="action-btn" id="recordBtn" title="Record">⏺</button>
    <button class="action-btn" id="trailBtn" title="Trail Mode">🎨</button>
    <button class="action-btn" id="clearBtn" title="Clear Canvas">🗑</button>
  </div>

  <!-- Camera toggle (mobile) -->
  <button class="action-btn" id="cameraToggle" title="Switch Camera">🔄</button>

  <script type="module" src="js/main.js"></script>
</body>
</html>
```

- [ ] **Step 5: Verify scaffold renders**

Open `index.html` directly in a browser (or `npx serve .`). Expected: dark background, start overlay visible with "NEON AURA AR" title and "Enter Experience" button. No console errors about missing files.

- [ ] **Step 6: Commit scaffold**

```bash
git add index.html style.css .gitignore README.md
git commit -m "feat: project scaffold — HTML, CSS, gitignore, README"
```

---

## Task 2: main.js — State, Themes, Render Loop Shell

**Files:**
- Create: `js/main.js`

- [ ] **Step 1: Create `js/main.js`**

```javascript
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
let lastTime         = performance.now();
let framesThisSecond = 0;
let lastFpsTime      = performance.now();

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

  const dt = (timestamp - lastTime) / 1000;
  lastTime = timestamp;
  state.time += dt;

  framesThisSecond++;
  if (timestamp > lastFpsTime + 1000) {
    uiFps.innerText = framesThisSecond;
    framesThisSecond = 0;
    lastFpsTime = timestamp;
  }

  drawBackground();

  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(0, 0, state.width, state.height);
  ctx.globalCompositeOperation = 'screen';

  updatePhysics();

  if (state.hands.length > 0) {
    drawHands();
    detectGestures();
  }

  uiHands.innerText = state.hands.length;
  ctx.globalCompositeOperation = 'source-over';
}

// ─── Hand drawing (uses MediaPipe globals: drawConnectors, HAND_CONNECTIONS) ──
function drawHands() {
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
}

// ─── Cross-hand effects ───────────────────────────────────────────────────────
function drawCrossHandEffects() {
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
  uiTrail.innerText = state.trailMode ? 'ON' : 'OFF';
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
  requestAnimationFrame(renderLoop);
});
```

- [ ] **Step 2: Verify no import errors**

Open browser devtools console. Load page with `npx serve .`. Expected: module import errors for `effects.js`, `gestures.js`, `audio.js`, `mediapipe.js`, `capture.js` (files not created yet) — that is expected. No syntax errors in main.js itself.

---

## Task 3: effects.js — Matrix Rain, Particles, Shockwaves

**Files:**
- Create: `js/effects.js`

- [ ] **Step 1: Create `js/effects.js`**

```javascript
// js/effects.js — background matrix rain, particles, shockwaves
// NOTE: imports from main.js are live bindings. We never use them at module
// eval time (only inside function bodies), so circular deps are safe here.

import { state, themes, bgCtx, ctx } from './main.js';

const fontSize = 16;
let matrixColumns = [];

// Lazy-initialized on first drawBackground call (state.width is 0 at eval time)
function initMatrixColumns() {
  const maxCols = Math.floor(state.width / fontSize);
  matrixColumns = new Array(maxCols).fill(1).map(() => (Math.random() * state.height) / fontSize);
}

window.addEventListener('resize', initMatrixColumns);

// ─── Particles ────────────────────────────────────────────────────────────────
const particles = [];

export function createParticles(pos, color, count = 3) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x: pos.x, y: pos.y,
      vx: (Math.random() - 0.5) * 8,
      vy: (Math.random() - 0.5) * 8,
      life: 1.0,
      color,
      size: Math.random() * 3 + 1,
    });
  }
}

// ─── Ripples / Shockwaves ─────────────────────────────────────────────────────
const ripples = [];

export function createShockwave(pos, color) {
  ripples.push({
    x: pos.x, y: pos.y,
    radius: 0,
    maxRadius: 150 + Math.random() * 100,
    life: 1.0,
    color,
  });
}

// ─── Physics update (called each frame) ──────────────────────────────────────
export function updatePhysics() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x  += p.vx;
    p.y  += p.vy;
    p.vy += 0.1; // gravity
    p.life -= 0.02;

    if (p.life <= 0) { particles.splice(i, 1); continue; }

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.life;
    ctx.fill();
  }

  for (let i = ripples.length - 1; i >= 0; i--) {
    const r = ripples[i];
    r.radius += (r.maxRadius - r.radius) * 0.1;
    r.life   -= 0.03;

    if (r.life <= 0) { ripples.splice(i, 1); continue; }

    ctx.beginPath();
    ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
    ctx.strokeStyle = r.color;
    ctx.lineWidth   = 4 * r.life;
    ctx.globalAlpha = r.life;
    ctx.stroke();
  }

  ctx.globalAlpha = 1.0;
}

// ─── Matrix rain background (called each frame) ───────────────────────────────
export function drawBackground() {
  // Lazy init — state.width is set by the time renderLoop first calls this
  if (!matrixColumns.length) initMatrixColumns();

  if (!state.trailMode) {
    bgCtx.globalCompositeOperation = 'destination-out';
    bgCtx.fillStyle = `rgba(0,0,0,${0.15 + Math.min(state.handVelocity * 10, 0.5)})`;
    bgCtx.fillRect(0, 0, state.width, state.height);
    bgCtx.globalCompositeOperation = 'source-over';
  }

  bgCtx.fillStyle = themes[state.theme](state.time, 1, 1);
  bgCtx.font = `${fontSize}px monospace`;

  const speedMult = 1 + state.handVelocity * 100;

  for (let i = 0; i < matrixColumns.length; i++) {
    if (Math.random() > 0.95) {
      const char = String.fromCharCode(0x30a0 + Math.random() * 96);
      bgCtx.fillText(char, i * fontSize, matrixColumns[i] * fontSize);
    }

    matrixColumns[i] += Math.random() * speedMult;

    if (matrixColumns[i] * fontSize > state.height && Math.random() > 0.9) {
      matrixColumns[i] = 0;
    }
  }
}

// ─── Clear both canvas layers ─────────────────────────────────────────────────
export function clearLayers() {
  bgCtx.clearRect(0, 0, state.width, state.height);
  ctx.clearRect(0, 0, state.width, state.height);
}
```

- [ ] **Step 2: Verify module loads**

In browser with `npx serve .`, open console. Expected: import errors only for remaining missing modules. No syntax errors in `effects.js`.

---

## Task 4: gestures.js — Pinch & Spread Detection

**Files:**
- Create: `js/gestures.js`

- [ ] **Step 1: Create `js/gestures.js`**

```javascript
// js/gestures.js — gesture detection: pinch, spread, fist

import { state, themes, mapToCanvas, createShockwave, uiGesture, uiSpread } from './main.js';
import { createParticles } from './effects.js';
import { triggerZap } from './audio.js';

export function getDist(p1, p2) {
  return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}

const lastPinchState = [false, false];

export function detectGestures() {
  if (!state.hands.length) return;

  state.hands.forEach((hand, idx) => {
    const thumb = hand[4];
    const index = hand[8];
    const dist  = getDist(thumb, index);
    const isPinching = dist < 0.05;

    if (isPinching && !lastPinchState[idx]) {
      const mid = {
        x: (thumb.x + index.x) / 2,
        y: (thumb.y + index.y) / 2,
      };
      const pos = mapToCanvas(mid);
      createShockwave(pos, themes[state.theme](state.time, 1, 1));
      createParticles(pos, themes[state.theme](state.time, 1, 1), 8);
      triggerZap();
      uiGesture.innerText = 'PINCH!';
    }

    lastPinchState[idx] = isPinching;
  });

  if (state.hands[0]) {
    const spread    = getDist(state.hands[0][8], state.hands[0][20]);
    const spreadPct = Math.min(Math.round(spread * 300), 100);
    uiSpread.innerText = spreadPct + '%';

    if (!lastPinchState.includes(true)) {
      uiGesture.innerText = spreadPct > 50 ? 'Open Hand' : 'Fist';
    }
  }
}
```

---

## Task 5: audio.js — Web Audio Engine

**Files:**
- Create: `js/audio.js`

- [ ] **Step 1: Create `js/audio.js`**

```javascript
// js/audio.js — ambient hum (2-hand proximity) + pinch zap sound

import { state } from './main.js';

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
  } catch (e) {
    console.error('Web Audio API failed', e);
  }
}

export function triggerZap() {
  if (!audioCtx) return;

  const osc      = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(800, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.1);

  gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);

  osc.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.15);
}

export function updateHum(hands) {
  if (!audioCtx || !humGain) return;

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
```

---

## Task 6: mediapipe.js — Hand Tracking

**Files:**
- Create: `js/mediapipe.js`

- [ ] **Step 1: Create `js/mediapipe.js`**

```javascript
// js/mediapipe.js — MediaPipe Hands + Camera setup

import { state, videoElement } from './main.js';
import { updateHum } from './audio.js';
import { getDist } from './gestures.js';

let cameraInstance = null;

export function initMediaPipe() {
  // Stop existing camera before restarting (e.g. facing mode change)
  if (cameraInstance) {
    cameraInstance.stop();
    cameraInstance = null;
  }

  // eslint-disable-next-line no-undef
  const hands = new Hands({
    locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
  });

  hands.setOptions({
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7,
  });

  hands.onResults(results => {
    if (!results.multiHandLandmarks) {
      state.hands       = [];
      state.handVelocity = 0;
      updateHum([]);
      return;
    }

    // Calculate velocity: distance index finger moved since last frame
    if (state.hands.length > 0 && results.multiHandLandmarks.length > 0) {
      const oldP = state.hands[0][8];
      const newP = results.multiHandLandmarks[0][8];
      if (oldP && newP) state.handVelocity = getDist(oldP, newP);
    } else {
      state.handVelocity = 0;
    }

    state.hands = results.multiHandLandmarks;
    updateHum(state.hands);
  });

  // eslint-disable-next-line no-undef
  cameraInstance = new Camera(videoElement, {
    onFrame: async () => {
      await hands.send({ image: videoElement });
    },
    width: 1280,
    height: 720,
    facingMode: state.facingMode || 'user',
  });

  cameraInstance.start();
}
```

- [ ] **Step 2: Smoke test — core experience**

Run `npx serve .`. Open `http://localhost:3000`. Click "Enter Experience". Grant camera. Expected:
- Camera feed visible (mirrored)
- Matrix rain falls on background
- Hand detected → skeleton draws with glow
- Fingertip sparks appear
- HUD shows hand count > 0 and FPS
- Pinch thumb+index → shockwave ripple, zap sound
- Theme buttons switch colors

- [ ] **Step 3: Commit core experience**

```bash
git add js/
git commit -m "feat: core AR experience — MediaPipe, effects, gestures, audio"
```

---

## Task 7: capture.js — Screenshot & Recording

**Files:**
- Create: `js/capture.js`

- [ ] **Step 1: Create `js/capture.js`**

```javascript
// js/capture.js — screenshot (PNG) and screen recording (WebM)

import { state, mainCanvas } from './main.js';

let mediaRecorder = null;
let recordedChunks = [];

export function takeScreenshot() {
  const dataUrl = mainCanvas.toDataURL('image/png');
  const a       = document.createElement('a');
  a.href        = dataUrl;
  a.download    = `neon-aura-${Date.now()}.png`;
  a.click();
}

export function startRecording() {
  if (!window.MediaRecorder) {
    console.warn('MediaRecorder not supported');
    return;
  }

  recordedChunks = [];
  const stream   = mainCanvas.captureStream(30);

  // Pick a supported MIME type
  const mimeType = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
    .find(t => MediaRecorder.isTypeSupported(t)) || '';

  mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});

  mediaRecorder.ondataavailable = e => {
    if (e.data.size > 0) recordedChunks.push(e.data);
  };

  mediaRecorder.onstop = () => {
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `neon-aura-${Date.now()}.webm`;
    a.click();
    URL.revokeObjectURL(url);
  };

  mediaRecorder.start();
  state.recording = true;
}

export function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  state.recording = false;
}
```

- [ ] **Step 2: Hide record button if unsupported**

In `js/main.js`, after the start button listener, add:

```javascript
if (!window.MediaRecorder) {
  document.getElementById('recordBtn').style.display = 'none';
}
```

- [ ] **Step 3: Test screenshot**

Click 📷 button during experience. Expected: PNG file downloads with current canvas frame visible.

- [ ] **Step 4: Test recording**

Click ⏺ to start (button goes red). Wave hands for ~3 seconds. Click ⏹ to stop. Expected: `.webm` file downloads and plays in VLC or browser.

- [ ] **Step 5: Commit**

```bash
git add js/capture.js js/main.js
git commit -m "feat: screenshot and WebM screen recording"
```

---

## Task 8: Trail Mode

Trail mode is already wired in `main.js` (toggle button) and `effects.js` (`drawBackground` checks `state.trailMode`). This task verifies and polishes it.

- [ ] **Step 1: Verify trail mode**

Click 🎨 button. Expected:
- HUD "Trail Mode" shows "ON"
- Matrix rain no longer fades — characters and fingertip trails accumulate
- 🗑 Clear button wipes both canvases clean
- Click 🎨 again → "OFF" → fading resumes

- [ ] **Step 2: Commit trail mode verification**

```bash
git commit --allow-empty -m "feat: trail mode and clear — verified working"
```

---

## Task 9: Mobile Support Polish

CSS responsive rules and camera toggle are already in `style.css` and `main.js`. This task verifies on a real device or browser DevTools.

- [ ] **Step 1: Test on mobile viewport**

In Chrome DevTools, toggle device emulation (iPhone 12 Pro, 390×844). Expected:
- Theme bar scrolls horizontally, no overflow clipping
- All buttons ≥ 44px tap targets
- HUD readable at smaller font

- [ ] **Step 2: Test camera toggle**

On a real phone or emulated device with `npx serve .` on local network (`npx serve . --listen 0.0.0.0`), access via IP. Expected: 🔄 button switches between front and rear camera (note: MediaPipe accuracy is lower on rear camera — this is expected behaviour).

- [ ] **Step 3: Commit mobile verification**

```bash
git commit --allow-empty -m "feat: mobile support — responsive layout and camera toggle verified"
```

---

## Task 10: Custom Theme Picker

Custom theme wiring is in `main.js`. This task verifies end-to-end.

- [ ] **Step 1: Verify custom theme**

Click "Custom" theme button. Expected:
- Color input appears inline in theme bar
- Change color to red (`#ff0000`) → all neon effects, matrix rain, and accent color switch to red
- Fingertip sparks, shockwaves, lightning all use the chosen hue
- HUD accent updates via CSS variable

- [ ] **Step 2: Commit custom theme verification**

```bash
git commit --allow-empty -m "feat: custom color theme picker verified"
```

---

## Task 11: README, .gitignore, GitHub Push

**Files:**
- Verify: `README.md` — update live demo URL now that Pages URL is known
- Verify: `.gitignore` — ensure `.superpowers/` is listed

- [ ] **Step 1: Verify `.gitignore`**

```
.DS_Store
.superpowers/
node_modules/
```

- [ ] **Step 2: Final commit**

```bash
git add -A
git status  # verify no .superpowers files are staged
git commit -m "feat: complete NEON AURA AR — all features and enhancements"
```

- [ ] **Step 3: Add remote and push**

```bash
git remote add origin https://github.com/IBahaaaldin/NEON-AURA-AR.git
git branch -M main
git push -u origin main
```

- [ ] **Step 4: Enable GitHub Pages**

In browser: GitHub repo → Settings → Pages → Source: `Deploy from a branch` → Branch: `main` → Folder: `/ (root)` → Save.

Wait ~60 seconds, then open `https://ibahaaaldi.github.io/NEON-AURA-AR/`.

- [ ] **Step 5: Update README with live URL**

Edit `README.md` — confirm the live demo link matches the actual Pages URL.

```bash
git add README.md
git commit -m "docs: add verified GitHub Pages live demo link"
git push
```

---

## Manual Testing Checklist

Run before declaring done:

- [ ] Chrome: hand tracking, all themes, pinch, 2-hand mandala
- [ ] Safari: camera permission, AudioContext, canvas rendering
- [ ] Firefox: MediaPipe loads, recording works
- [ ] Screenshot downloads valid PNG
- [ ] Recording downloads playable WebM
- [ ] Trail mode accumulates / Clear wipes
- [ ] Custom color applies to all effects
- [ ] Camera toggle (front ↔ rear) works on mobile
- [ ] GitHub Pages URL loads and works (camera requires HTTPS — Pages provides this)
