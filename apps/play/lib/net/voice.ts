'use client';
// =============================================================================
// VoiceClient — the in-game call.
//
// This is what makes Kai World feel like being together instead of texting
// about it: a real, always-open voice channel between the players in the room,
// so you talk while you play instead of switching to WhatsApp.
//
// The audio is peer-to-peer WebRTC. It never passes through our Worker — the
// room server only relays the offer/answer/ICE handshake. Nothing is recorded
// and there is no media server to pay for or to trust.
//
// Negotiation follows the "perfect negotiation" pattern so two players tapping
// the mic at the same instant can't deadlock each other: the peer with the
// higher id is polite and yields on collision.
// =============================================================================
import type { RoomClient } from './room';

/** Public STUN is enough for two homes; a TURN relay can be added via env. */
function iceServers(): RTCIceServer[] {
  const base: RTCIceServer[] = [{ urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302'] }];
  const extra = process.env.NEXT_PUBLIC_KAI_TURN;
  if (!extra) return base;
  try {
    const parsed = JSON.parse(extra) as RTCIceServer | RTCIceServer[];
    return base.concat(Array.isArray(parsed) ? parsed : [parsed]);
  } catch {
    return base;
  }
}

interface Peer {
  pc: RTCPeerConnection;
  audio: HTMLAudioElement;
  analyser?: AnalyserNode;
  buf?: Uint8Array<ArrayBuffer>;
  polite: boolean;
  makingOffer: boolean;
  ignoreOffer: boolean;
}

type Sig =
  | { kind: 'desc'; desc: RTCSessionDescriptionInit }
  | { kind: 'ice'; cand: RTCIceCandidateInit };

export type VoiceState = 'off' | 'asking' | 'on' | 'denied' | 'unsupported';

export class VoiceClient {
  /** 0..1 speaking level per peer id (plus your own under `you`). Read per frame. */
  readonly levels = new Map<string, number>();

  private room: RoomClient;
  private peers = new Map<string, Peer>();
  private stream: MediaStream | null = null;
  private ac: AudioContext | null = null;
  private raf = 0;
  private localAnalyser: { an: AnalyserNode; buf: Uint8Array<ArrayBuffer> } | null = null;

  state: VoiceState = 'off';
  onState: ((s: VoiceState, detail?: string) => void) | null = null;

  constructor(room: RoomClient) {
    this.room = room;
  }

  private setState(s: VoiceState, detail?: string) {
    this.state = s;
    this.onState?.(s, detail);
  }

  /**
   * Turn the microphone on. Must be called from a real tap — iOS will not grant
   * the mic (or start audio playback) outside a user gesture.
   */
  async start(): Promise<void> {
    if (this.state === 'on' || this.state === 'asking') return;
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection === 'undefined') {
      this.setState('unsupported');
      return;
    }
    this.setState('asking');
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        // Echo cancellation matters here: the guide's voice comes out of the
        // same speaker the mic is listening to.
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
    } catch {
      this.setState('denied');
      return;
    }

    this.ac = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    await this.ac.resume().catch(() => {});
    this.meterLocal();

    this.setState('on');
    this.room.send({ t: 'voice', on: true });

    // Push our audio into every peer we already have, and reach out to the rest.
    for (const m of this.room.members) this.ensurePeer(m.id, true);
    this.pump();
  }

  stop() {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    for (const [, p] of this.peers) {
      p.pc.getSenders().forEach((s) => s.track && p.pc.removeTrack(s));
    }
    this.ac?.close().catch(() => {});
    this.ac = null;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.levels.clear();
    this.setState('off');
    this.room.send({ t: 'voice', on: false });
  }

  /** Tear down everything, including inbound audio. Called when leaving the room. */
  destroy() {
    this.stop();
    for (const [, p] of this.peers) {
      p.pc.close();
      p.audio.srcObject = null;
      p.audio.remove();
    }
    this.peers.clear();
  }

  /** A player left the room. */
  drop(id: string) {
    const p = this.peers.get(id);
    if (!p) return;
    p.pc.close();
    p.audio.srcObject = null;
    p.audio.remove();
    this.peers.delete(id);
    this.levels.delete(id);
  }

  /**
   * A player joined. We only initiate toward them if our own mic is live —
   * otherwise we wait, and answer whenever they call us.
   */
  greet(id: string) {
    if (this.state === 'on') this.ensurePeer(id, true);
  }

  // ---- signalling -----------------------------------------------------------
  private ensurePeer(id: string, initiate: boolean): Peer {
    let p = this.peers.get(id);
    if (!p) {
      const pc = new RTCPeerConnection({ iceServers: iceServers() });
      const audio = document.createElement('audio');
      audio.autoplay = true;
      (audio as HTMLAudioElement & { playsInline: boolean }).playsInline = true;
      audio.setAttribute('playsinline', '');
      audio.style.display = 'none';
      document.body.appendChild(audio);

      p = {
        pc,
        audio,
        // Deterministic tie-break: higher id yields on an offer collision.
        polite: this.room.you > id,
        makingOffer: false,
        ignoreOffer: false,
      };
      this.peers.set(id, p);

      pc.onicecandidate = (e) => {
        if (e.candidate) this.room.send({ t: 'sig', to: id, d: { kind: 'ice', cand: e.candidate.toJSON() } satisfies Sig });
      };
      pc.ontrack = (e) => {
        audio.srcObject = e.streams[0];
        audio.play().catch(() => {
          /* will start on the next tap; iOS is strict about this */
        });
        this.meterRemote(id, e.streams[0]);
      };
      pc.onnegotiationneeded = async () => {
        const peer = this.peers.get(id);
        if (!peer) return;
        try {
          peer.makingOffer = true;
          await pc.setLocalDescription();
          if (pc.localDescription) {
            this.room.send({ t: 'sig', to: id, d: { kind: 'desc', desc: pc.localDescription.toJSON() } satisfies Sig });
          }
        } catch {
          /* the peer went away mid-offer */
        } finally {
          peer.makingOffer = false;
        }
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed') pc.restartIce();
      };
    }

    // Adding our track fires onnegotiationneeded, which drives the offer.
    if (initiate && this.stream) {
      const has = p.pc.getSenders().some((s) => s.track?.kind === 'audio');
      if (!has) for (const track of this.stream.getAudioTracks()) p.pc.addTrack(track, this.stream);
    }
    return p;
  }

  /** Feed in a signalling message relayed by the room. */
  async onSignal(from: string, data: unknown) {
    const sig = data as Sig;
    if (!sig || typeof sig !== 'object') return;
    // Answer even with the mic off, so you can hear the other player right away.
    const p = this.ensurePeer(from, false);
    const { pc } = p;

    try {
      if (sig.kind === 'desc') {
        const offerCollision = sig.desc.type === 'offer' && (p.makingOffer || pc.signalingState !== 'stable');
        p.ignoreOffer = !p.polite && offerCollision;
        if (p.ignoreOffer) return;

        await pc.setRemoteDescription(sig.desc);
        if (sig.desc.type === 'offer') {
          if (this.stream) {
            const has = pc.getSenders().some((s) => s.track?.kind === 'audio');
            if (!has) for (const track of this.stream.getAudioTracks()) pc.addTrack(track, this.stream);
          }
          await pc.setLocalDescription();
          if (pc.localDescription) {
            this.room.send({ t: 'sig', to: from, d: { kind: 'desc', desc: pc.localDescription.toJSON() } satisfies Sig });
          }
        }
      } else if (sig.kind === 'ice') {
        try {
          await pc.addIceCandidate(sig.cand);
        } catch {
          if (!p.ignoreOffer) throw new Error('ice');
        }
      }
    } catch {
      /* a dropped handshake self-heals on the next offer */
    }
  }

  // ---- speaking meters (drive the glow ring over each avatar) ---------------
  private meterLocal() {
    if (!this.ac || !this.stream) return;
    const src = this.ac.createMediaStreamSource(this.stream);
    const an = this.ac.createAnalyser();
    an.fftSize = 256;
    src.connect(an);
    this.localAnalyser = { an, buf: new Uint8Array(new ArrayBuffer(an.frequencyBinCount)) };
  }

  private meterRemote(id: string, stream: MediaStream) {
    if (!this.ac) {
      // Receiving without a mic of our own: still need a context to meter.
      this.ac = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      this.ac.resume().catch(() => {});
      this.pump();
    }
    const p = this.peers.get(id);
    if (!p) return;
    const src = this.ac.createMediaStreamSource(stream);
    const an = this.ac.createAnalyser();
    an.fftSize = 256;
    src.connect(an);
    p.analyser = an;
    p.buf = new Uint8Array(new ArrayBuffer(an.frequencyBinCount));
  }

  private pump() {
    if (this.raf) return;
    const tick = () => {
      if (this.localAnalyser) this.levels.set('you', level(this.localAnalyser.an, this.localAnalyser.buf));
      for (const [id, p] of this.peers) {
        if (p.analyser && p.buf) this.levels.set(id, level(p.analyser, p.buf));
      }
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }
}

function level(an: AnalyserNode, buf: Uint8Array<ArrayBuffer>): number {
  an.getByteTimeDomainData(buf);
  let peak = 0;
  for (let i = 0; i < buf.length; i++) {
    const v = Math.abs(buf[i] - 128) / 128;
    if (v > peak) peak = v;
  }
  return Math.min(1, peak * 3);
}
