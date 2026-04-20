// js/mediapipe.js — MediaPipe Hands + Camera setup
// Uses browser globals: Hands, Camera (loaded from CDN in index.html)

import { state, videoElement } from './main.js';
import { updateHum } from './audio.js';
import { getDist } from './gestures.js';

let cameraInstance = null;
let handsInstance  = null;

export function initMediaPipe() {
  // Stop existing camera before restarting (e.g. facing mode change)
  if (cameraInstance) {
    cameraInstance.stop();
    cameraInstance = null;
  }

  if (handsInstance) { handsInstance.close(); handsInstance = null; }

  // eslint-disable-next-line no-undef
  handsInstance = new Hands({
    locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
  });

  handsInstance.setOptions({
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7,
  });

  handsInstance.onResults(results => {
    if (!results.multiHandLandmarks) {
      state.hands        = [];
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
      await handsInstance.send({ image: videoElement });
    },
    width: 1280,
    height: 720,
    facingMode: state.facingMode || 'user',
  });

  cameraInstance.start().catch(err => {
    console.error('Camera failed to start:', err);
  });
}
