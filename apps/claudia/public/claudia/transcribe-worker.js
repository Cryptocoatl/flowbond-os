// ════════════════════════════════════════════════════════════════════════
//  ClaudIA · on-device transcription worker  (public/claudia/transcribe-worker.js)
//
//  Whisper runs HERE, in a Web Worker, on the user's device. Raw meeting audio
//  is fed in as 16 kHz mono Float32 windows and never leaves the browser — only
//  the public model weights are fetched (once, then cached) from the CDN. This
//  is the on-device tier of ClaudIA's privacy model: transcription touches no
//  server. (Synthesis of notes is a separate, clearly-labeled cloud step.)
//
//  Loaded as a module worker so top-level `import` from the CDN works. Pinned
//  version keeps behavior reproducible.
// ════════════════════════════════════════════════════════════════════════

import {
  pipeline,
  env,
} from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.2';

// Browser-only: never look for local model files, always pull from the HF CDN.
env.allowLocalModels = false;
env.useBrowserCache = true;

const MODEL = 'Xenova/whisper-base'; // multilingual (ES/EN), ~145 MB, good accuracy/speed

let transcriber = null;
let loading = null;

async function getTranscriber() {
  if (transcriber) return transcriber;
  if (loading) return loading;
  loading = (async () => {
    // Prefer WebGPU when the device supports it; fall back to wasm.
    const tryDevice = async (device) =>
      pipeline('automatic-speech-recognition', MODEL, {
        device,
        progress_callback: (p) => {
          if (p && p.status) {
            self.postMessage({
              type: 'progress',
              status: p.status,
              file: p.file,
              progress: typeof p.progress === 'number' ? p.progress : undefined,
            });
          }
        },
      });
    try {
      const hasWebGPU = typeof navigator !== 'undefined' && 'gpu' in navigator;
      transcriber = await tryDevice(hasWebGPU ? 'webgpu' : 'wasm');
    } catch {
      // WebGPU init can fail on some drivers — fall back to wasm.
      transcriber = await tryDevice('wasm');
    }
    return transcriber;
  })();
  return loading;
}

self.onmessage = async (e) => {
  const msg = e.data || {};

  if (msg.type === 'init') {
    try {
      await getTranscriber();
      self.postMessage({ type: 'ready' });
    } catch (err) {
      self.postMessage({ type: 'error', message: String((err && err.message) || err) });
    }
    return;
  }

  if (msg.type === 'transcribe') {
    const { id, audio, language } = msg;
    try {
      const t = await getTranscriber();
      const out = await t(audio, {
        // language: null → autodetect (handles ES/EN code-switching meetings)
        language: language || null,
        task: 'transcribe',
        chunk_length_s: 30,
        stride_length_s: 5,
        return_timestamps: false,
      });
      const text = (out && (Array.isArray(out) ? out.map((o) => o.text).join(' ') : out.text)) || '';
      self.postMessage({ type: 'result', id, text: text.trim() });
    } catch (err) {
      self.postMessage({ type: 'error', id, message: String((err && err.message) || err) });
    }
    return;
  }
};
