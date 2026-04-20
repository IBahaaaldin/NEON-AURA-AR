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
