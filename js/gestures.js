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
      // createShockwave is re-exported from main.js (which imports it from effects.js)
      // to avoid a direct effects.js → gestures.js → main.js circular cycle
      createShockwave(pos, themes[state.theme](state.time, 1, 1));
      createParticles(pos, themes[state.theme](state.time, 1, 1), 8);
      triggerZap();
      uiGesture.textContent = 'PINCH!';
    }

    lastPinchState[idx] = isPinching;
  });

  if (state.hands[0]) {
    const spread    = getDist(state.hands[0][8], state.hands[0][20]);
    const spreadPct = Math.min(Math.round(spread * 300), 100);
    uiSpread.textContent = spreadPct + '%';

    if (!lastPinchState.includes(true)) {
      uiGesture.textContent = spreadPct > 50 ? 'Open Hand' : 'Fist';
    }
  }
}
