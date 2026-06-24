'use client';

// ════════════════════════════════════════════════════════════════════════
//  ClaudIA · meeting audio capture  (lib/claudia/capture.ts)
//
//  Captures meeting audio and emits fixed 16 kHz mono Float32 windows for the
//  on-device Whisper worker. Three sources:
//    • 'mic'  — the room (in-person meetings) via getUserMedia
//    • 'tab'  — the meeting tab/screen audio (online calls) via getDisplayMedia
//    • 'both' — mic + tab mixed (you in the room joining an online call)
//
//  The AudioContext is created at 16 kHz so it resamples each source down for
//  us; the ScriptProcessor sums all connected sources into one mono stream.
//  Nothing here touches the network — windows are handed straight to the worker.
// ════════════════════════════════════════════════════════════════════════

export type CaptureSource = 'mic' | 'tab' | 'both';

export interface CaptureHandle {
  stop: () => void;            // stops tracks + flushes the final partial window
  readonly source: CaptureSource;
}

interface CaptureOpts {
  windowSec?: number;          // length of each emitted window (default 18s)
  onWindow: (audio: Float32Array, tOffsetSec: number) => void;
  onError?: (e: Error) => void;
  onLevel?: (rms: number) => void; // 0..1 input level, for a live meter
}

const TARGET_RATE = 16000;

async function getMic(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  });
}

async function getTab(): Promise<MediaStream> {
  // Browsers only expose tab/system audio through getDisplayMedia, and most
  // require a video request alongside it. We grab video, keep only the audio.
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: true,
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
  });
  const audio = stream.getAudioTracks();
  if (!audio.length) {
    stream.getTracks().forEach((t) => t.stop());
    throw new Error('no-tab-audio'); // user didn't tick "share tab audio"
  }
  // Drop the video track — we only want the meeting's audio.
  stream.getVideoTracks().forEach((t) => { t.stop(); stream.removeTrack(t); });
  return stream;
}

export async function startCapture(source: CaptureSource, opts: CaptureOpts): Promise<CaptureHandle> {
  const windowSec = opts.windowSec ?? 18;
  const streams: MediaStream[] = [];

  try {
    if (source === 'mic' || source === 'both') streams.push(await getMic());
    if (source === 'tab' || source === 'both') streams.push(await getTab());
  } catch (e) {
    streams.forEach((s) => s.getTracks().forEach((t) => t.stop()));
    throw e;
  }

  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioCtx({ sampleRate: TARGET_RATE });
  const rate = ctx.sampleRate; // honored as 16k on modern browsers; used for math regardless

  const sources = streams.map((s) => ctx.createMediaStreamSource(s));
  const processor = ctx.createScriptProcessor(4096, 1, 1);
  const sink = ctx.createGain();
  sink.gain.value = 0; // keep the graph pulling without echoing audio to speakers

  sources.forEach((src) => src.connect(processor)); // multiple inputs sum into one
  processor.connect(sink);
  sink.connect(ctx.destination);

  const windowSamples = Math.floor(windowSec * rate);
  let acc: number[] = [];
  let emittedSamples = 0;
  let stopped = false;

  const emit = (samples: number[]) => {
    const buf = new Float32Array(samples);
    const tOffset = emittedSamples / rate;
    emittedSamples += buf.length;
    opts.onWindow(buf, tOffset);
  };

  processor.onaudioprocess = (ev: AudioProcessingEvent) => {
    if (stopped) return;
    const ch = ev.inputBuffer.getChannelData(0);
    // live level meter (cheap RMS)
    if (opts.onLevel) {
      let sum = 0;
      for (let i = 0; i < ch.length; i++) sum += ch[i] * ch[i];
      opts.onLevel(Math.min(1, Math.sqrt(sum / ch.length) * 4));
    }
    for (let i = 0; i < ch.length; i++) acc.push(ch[i]);
    while (acc.length >= windowSamples) {
      emit(acc.slice(0, windowSamples));
      acc = acc.slice(windowSamples);
    }
  };

  const stop = () => {
    if (stopped) return;
    stopped = true;
    processor.onaudioprocess = null;
    if (acc.length > rate * 0.5) emit(acc); // flush a final partial window (>0.5s)
    acc = [];
    try { processor.disconnect(); sink.disconnect(); sources.forEach((s) => s.disconnect()); } catch { /* noop */ }
    streams.forEach((s) => s.getTracks().forEach((t) => t.stop()));
    ctx.close().catch(() => { /* noop */ });
  };

  // If the user stops tab-sharing from the browser chrome, end the capture too.
  streams.forEach((s) => s.getTracks().forEach((t) => { t.onended = () => stop(); }));

  return { stop, source };
}
