// js/effects.js — background matrix rain, particles, shockwaves
// NOTE: imports from main.js are live bindings. We never use them at module
// eval time (only inside function bodies), so circular deps are safe here.

import { state, themes, bgCtx, ctx } from './main.js';

const fontSize = 16;
let matrixColumns = [];

// Lazy-initialized on first drawBackground call (state.width is 0 at eval time)
function initMatrixColumns() {
  const maxCols = Math.floor(state.width / fontSize);
  if (matrixColumns.length === maxCols) return;
  matrixColumns = new Array(maxCols).fill(1).map(() => (Math.random() * state.height) / fontSize);
}

// ─── Particles ────────────────────────────────────────────────────────────────
const particles = [];

export function createParticles(pos, color, count = 3) {
  if (particles.length > 800) return;
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
  if (ripples.length > 20) return;
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
  ctx.save();
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
  ctx.restore();
}

// ─── Matrix rain background (called each frame) ───────────────────────────────
export function drawBackground() {
  // Lazy init — state.width is set by the time renderLoop first calls this
  initMatrixColumns();

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
