# NEON AURA AR — Design Spec

**Date:** 2026-04-20
**Repo:** https://github.com/IBahaaaldin/NEON-AURA-AR.git

---

## Overview

Browser-based AR hand-tracking experience. Uses MediaPipe Hands via webcam, renders neon visual effects on canvas, plays reactive audio via Web Audio API. Deployed as a static site on GitHub Pages.

---

## Project Structure

```
NEON-AURA-AR/
├── index.html          # Entry point — DOM skeleton only, imports JS as module
├── style.css           # All styles (glassmorphism HUD, theme buttons, overlays)
├── js/
│   ├── main.js         # Init, resize, render loop, global state
│   ├── audio.js        # Web Audio engine: ambient hum + pinch zap
│   ├── effects.js      # Particles, shockwaves, matrix rain background
│   ├── gestures.js     # Pinch + spread detection, gesture state
│   ├── mediapipe.js    # MediaPipe Hands setup, camera, onResults handler
│   └── capture.js      # Screenshot (PNG) + WebM screen recording
├── README.md           # Description, features, live demo link, usage
└── .gitignore          # .DS_Store, .superpowers/, node_modules
```

---

## Architecture

### Rendering Pipeline

Two canvas layers, both mirrored (`scaleX(-1)`) to match video:

- **bgCanvas (z:1)** — matrix rain. Uses `destination-out` fade each frame; speed scales with hand velocity.
- **mainCanvas (z:5)** — hand skeleton, fingertip bloom, particles, shockwaves, lightning, mandala. Uses `screen` composite for neon glow. Fades via `destination-out` for motion blur trails.
- **video (z:0)** — raw camera feed, darkened with CSS filter.

Render loop: `requestAnimationFrame` → `drawBackground()` → `updatePhysics()` → hand rendering → gesture detection.

### Module Communication

All modules share a single `state` object exported from `main.js`:
- `state.hands` — latest MediaPipe landmarks
- `state.time` — elapsed seconds
- `state.theme` — current theme name
- `state.handVelocity` — scalar movement speed
- `state.trailMode` — boolean, freeze bgCanvas fade
- `state.recording` — boolean, MediaRecorder active

### Data Flow

```
Camera → MediaPipe → onResults() → state.hands
state.hands → gestures.js → detectGestures() → particles/shockwaves/audio
renderLoop → effects.js → draw to bgCanvas + mainCanvas
```

---

## Features

### Core (from reference)

| Feature | Implementation |
|---|---|
| Hand tracking | MediaPipe Hands, maxNumHands=2, modelComplexity=1 |
| Neon skeleton | `drawConnectors` + shadow bloom on fingertips |
| Particles | Physics array, gravity, fade, spawned at fingertips |
| Shockwave | Ripple array, eased radius expansion |
| Matrix rain | Character columns, speed = `1 + velocity * 100` |
| Cross-hand lightning | Jagged midpoint jitter line when tips < 150px apart |
| Gradient lines | Linear gradient between matching fingertips of both hands |
| Mandala | Rotate-translated star polygon from all 10 fingertips |
| Ambient hum | Sine oscillator, pitch+volume = inverse of index-finger distance |
| Pinch zap | Sawtooth burst, 800→40Hz, 150ms decay |
| 5 themes | Rainbow, Cyberpunk, Lava, Ocean, Galaxy — HSL functions |
| HUD | Hands, FPS, gesture label, spread % |

### Enhancement 1 — Screenshot & Record (`capture.js`)

- **Screenshot:** `mainCanvas.toDataURL('image/png')` → `<a download>` click → PNG file.
- **Record:** `HTMLCanvasElement.captureStream(30)` on mainCanvas → `MediaRecorder` (video/webm) → collect chunks → Blob → download WebM on stop.
- UI: floating button bar bottom-right. 📷 and ⏺/⏹ buttons. Always on top (z:20).

### Enhancement 2 — Trail Mode (`effects.js` + `main.js`)

- Toggle button in HUD or floating bar: 🎨 Draw / 🎨 Live.
- When `state.trailMode = true`: skip the `destination-out` fade step on bgCanvas — characters and trails accumulate.
- 🗑 Clear button: `bgCtx.clearRect(0,0,w,h)`.
- Trail mode indicator shown in HUD.

### Enhancement 3 — Mobile Support

- **Layout:** `style.css` media queries. Theme bar scrolls horizontally (`overflow-x: auto; flex-wrap: nowrap`) on screens < 600px. HUD font-size scales down.
- **Camera toggle:** 🔄 button switches `facingMode` between `"user"` and `"environment"`. Restarts the MediaPipe Camera instance.
- **Touch targets:** all buttons min 44×44px.
- **Viewport meta:** `width=device-width, initial-scale=1, maximum-scale=1` (prevent double-tap zoom during experience).

### Enhancement 4 — Custom Theme Picker

- "Custom" button added to theme bar.
- Clicking opens an `<input type="color">` positioned inline.
- On color change: parse hex → derive HSL → create theme function: `() => chosenColor` (solid) with subtle `lightness` oscillation via `Math.sin(time)`.
- Stored as `themes['Custom']` entry — same interface as other themes.

---

## Error Handling

- MediaPipe load failure: show error message overlay ("Camera not available. Check permissions.").
- AudioContext suspended (browser autoplay policy): resolved by requiring user click on start button before `initAudio()`.
- MediaRecorder not supported: hide record button, show tooltip "Recording not supported in this browser".
- Camera permission denied: overlay remains with error message.

---

## Testing

Manual verification checklist:
- [ ] Hand tracking works in Chrome/Safari/Firefox
- [ ] All 5 themes switch correctly
- [ ] Pinch triggers shockwave + zap sound
- [ ] 2-hand lightning and mandala render
- [ ] Screenshot downloads valid PNG
- [ ] Record produces downloadable WebM
- [ ] Trail mode accumulates / Clear wipes
- [ ] Camera toggle works on mobile (rear camera)
- [ ] Custom color picker applies to all effects
- [ ] GitHub Pages deployment serves correctly

---

## Deployment

1. `git remote add origin https://github.com/IBahaaaldin/NEON-AURA-AR.git`
2. Push to `main`
3. GitHub repo Settings → Pages → Source: `main` branch, root `/`
4. Live at `https://ibahaaaldi.github.io/NEON-AURA-AR/`
5. README links to live demo URL

---

## Out of Scope

- Backend / server-side logic
- User accounts or saved sessions
- Three.js / WebGL — plain Canvas 2D only
- NPM dependencies or bundler
