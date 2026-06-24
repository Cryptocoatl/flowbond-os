'use client';

// ════════════════════════════════════════════════════════════════════════
//  ClaudIA · transcription client  (lib/claudia/transcribe.ts)
//
//  Thin main-thread handle over the on-device Whisper worker. It owns the
//  worker, serializes transcription requests, and surfaces load progress. The
//  audio Float32 buffers are transferred (zero-copy) into the worker and never
//  touch the network — only the public model weights are fetched once, by the
//  worker itself, from the CDN.
// ════════════════════════════════════════════════════════════════════════

export interface LoadProgress {
  status: string;       // 'initiate' | 'download' | 'progress' | 'done' | 'ready' ...
  file?: string;
  progress?: number;    // 0..100 while a file downloads
}

type Pending = { resolve: (text: string) => void; reject: (e: Error) => void };

export class Transcriber {
  private worker: Worker | null = null;
  private ready = false;
  private seq = 0;
  private pending = new Map<number, Pending>();
  private onProgress?: (p: LoadProgress) => void;

  /** Boot the worker and load the model. Resolves once Whisper is ready on-device. */
  async init(onProgress?: (p: LoadProgress) => void): Promise<void> {
    this.onProgress = onProgress;
    if (this.ready) return;
    if (!this.worker) {
      this.worker = new Worker('/claudia/transcribe-worker.js', { type: 'module' });
      this.worker.onmessage = (e: MessageEvent) => this.onMessage(e.data);
      this.worker.onerror = () => {
        for (const p of this.pending.values()) p.reject(new Error('transcribe-worker-error'));
        this.pending.clear();
      };
    }
    await new Promise<void>((resolve, reject) => {
      this.readyResolve = resolve;
      this.readyReject = reject;
      this.worker!.postMessage({ type: 'init' });
    });
    this.ready = true;
  }

  private readyResolve?: () => void;
  private readyReject?: (e: Error) => void;

  private onMessage(msg: {
    type: string; id?: number; text?: string; message?: string;
    status?: string; file?: string; progress?: number;
  }) {
    switch (msg.type) {
      case 'progress':
        this.onProgress?.({ status: msg.status || 'progress', file: msg.file, progress: msg.progress });
        break;
      case 'ready':
        this.onProgress?.({ status: 'ready' });
        this.readyResolve?.();
        break;
      case 'result': {
        const p = msg.id != null ? this.pending.get(msg.id) : undefined;
        if (p) { this.pending.delete(msg.id!); p.resolve(msg.text || ''); }
        break;
      }
      case 'error': {
        const err = new Error(msg.message || 'transcribe-error');
        if (msg.id != null && this.pending.has(msg.id)) {
          this.pending.get(msg.id)!.reject(err);
          this.pending.delete(msg.id);
        } else {
          this.readyReject?.(err);
        }
        break;
      }
    }
  }

  /** Transcribe one 16 kHz mono window. `language` null = autodetect (ES/EN). */
  transcribe(audio: Float32Array, language?: string | null): Promise<string> {
    if (!this.worker || !this.ready) return Promise.reject(new Error('transcriber-not-ready'));
    const id = ++this.seq;
    return new Promise<string>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      // Transfer the underlying buffer (zero-copy) — caller must not reuse it after.
      this.worker!.postMessage({ type: 'transcribe', id, audio, language: language ?? null }, [audio.buffer]);
    });
  }

  dispose(): void {
    this.worker?.terminate();
    this.worker = null;
    this.ready = false;
    this.pending.clear();
  }
}
