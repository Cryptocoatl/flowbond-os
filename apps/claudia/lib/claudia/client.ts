'use client';

// ════════════════════════════════════════════════════════════════════════
//  ClaudIA · client vault  (lib/claudia/client.ts)
//  The ONLY boundary between the surface and the encrypted store. Every byte is
//  encrypted/decrypted HERE, in the browser, under keys derived from the user's
//  factors. The server (and anyone with service_role) sees only ciphertext.
//
//  Lifecycle:  enroll() once  →  unlock() each session  →  read/write.
//  The Master Secret, KEK and DEK live only in this instance's memory.
// ════════════════════════════════════════════════════════════════════════

import { browserClient } from '../supabase';
import * as ZK from './crypto';
import * as GZ from './group-crypto';
import { tierHas, FREE_ENTITLEMENT, type Entitlement, type Feature, type Tier } from './tiers';
import type { ClaudiaTask } from './contract';

const CRED_KEY = (uid: string) => `claudia.passkey.cred.${uid}`;

export interface ChatMessage { role: 'user' | 'assistant'; text: string; }
export interface ReadyTask {
  id: string;
  title: string;
  ready: string;
  venture: string;
  status: 'open' | 'done' | 'archived';
  due_at: string | null;
}
export interface CarePrefs {
  enabled: boolean;
  meal_hours: number; water_hours: number; rest_hours: number;
  quiet_start: number; quiet_end: number; tz: string;
}
export type MeetingSource = 'mic' | 'tab' | 'both';
export interface MeetingSummary {
  id: string;
  source: MeetingSource;
  status: 'recording' | 'ended';
  title: string;            // decrypted ('' if none)
  startedAt: string;
  endedAt: string | null;
  hasNotes: boolean;
}

export class ClaudiaVault {
  private sb = browserClient();
  private uid!: string;
  private ms!: Uint8Array;
  private kek!: Uint8Array;
  private dek!: Uint8Array;
  private dekId!: string;
  private threadId!: string;
  private identity: GZ.IdentityKeyPair | null = null;
  private roomKeys = new Map<string, Uint8Array>();
  // Distinct factor proofs gathered this session — rotation needs ≥2 (2FA step-up).
  private proofs = new Set<ZK.FactorId | 'email'>();

  // ── identity ────────────────────────────────────────────────────────────
  private async requireUser(): Promise<string> {
    const { data } = await this.sb.auth.getUser();
    if (!data.user) throw new Error('not-signed-in');
    return data.user.id; // = flowbond_users.id = auth.uid (§1)
  }

  private async rpc<T = unknown>(fn: string, args?: Record<string, unknown>): Promise<T> {
    const { data, error } = await this.sb.rpc(fn, args ?? {});
    if (error) throw error;
    return data as T;
  }

  /** Has this FBID enrolled ClaudIA's vault yet? (any sealed factor share) */
  async isEnrolled(): Promise<boolean> {
    await ZK.ready();
    this.uid = await this.requireUser();
    const shares = await this.rpc<{ factor: string; sealed_share: string }[]>('claudia_my_key_shares');
    return (shares ?? []).length > 0;
  }

  // ── enrollment (first run) ───────────────────────────────────────────────
  /** Generate the Master Secret and seal it under the live factors. Returns the
   *  recovery phrase to show ONCE. `wantPasskey` enrolls a WebAuthn-PRF passkey. */
  async enroll(opts: { wantPasskey: boolean; displayName: string }): Promise<{ recoveryPhrase: string }> {
    await ZK.ready();
    this.uid = await this.requireUser();

    this.ms = ZK.generateMasterSecret();
    const recoveryPhrase = ZK.generateRecoveryMnemonic();
    const factorKeys: Partial<Record<ZK.FactorId, Uint8Array>> = {
      recovery: ZK.recoveryFactorKey(recoveryPhrase),
    };

    // Only attempt a passkey when the platform can actually make a usable one —
    // otherwise a phone/in-app-browser can hang on credentials.create(). The
    // recovery phrase always seals the MS, so enrollment never depends on this.
    if (opts.wantPasskey && (await ZK.platformPasskeyReady())) {
      try {
        const { credentialId } = await ZK.enrollPasskey(this.uid, opts.displayName || 'flow');
        localStorage.setItem(CRED_KEY(this.uid), credentialId);
        factorKeys.passkey = await ZK.passkeyFactorKey(credentialId);
      } catch {
        // Passkey/PRF unavailable on this device — recovery phrase still seals the MS.
      }
    }

    const shares = ZK.enrollSealMS(this.ms, factorKeys);
    await this.rpc('claudia_save_key_shares', { p_shares: shares });

    await this.openSession();
    return { recoveryPhrase };
  }

  // ── unlock (returning session) ────────────────────────────────────────────
  /** Unlock with the platform passkey (PRF). Throws if no passkey share / cancelled. */
  async unlockWithPasskey(): Promise<void> {
    await ZK.ready();
    this.uid = await this.requireUser();
    const shares = await this.loadShares();
    const sealed = shares.get('passkey');
    if (!sealed) throw new Error('no-passkey-factor');
    const credentialId = localStorage.getItem(CRED_KEY(this.uid)) ?? undefined;
    const key = await ZK.passkeyFactorKey(credentialId);
    this.ms = ZK.unlockMS(sealed, key);
    this.proofs.add('passkey'); // unlocking proves one factor (for rotation step-up)
    await this.openSession();
  }

  /** Unlock with the BIP39 recovery phrase (backup factor). */
  async unlockWithRecovery(mnemonic: string): Promise<void> {
    await ZK.ready();
    this.uid = await this.requireUser();
    if (!ZK.isValidMnemonic(mnemonic)) throw new Error('invalid-recovery-phrase');
    const shares = await this.loadShares();
    const sealed = shares.get('recovery');
    if (!sealed) throw new Error('no-recovery-factor');
    this.ms = ZK.unlockMS(sealed, ZK.recoveryFactorKey(mnemonic));
    this.proofs.add('recovery');
    await this.openSession();
  }

  /** Which live factors are sealed for this user (drives the unlock UI). */
  async availableFactors(): Promise<ZK.FactorId[]> {
    return Array.from((await this.loadShares()).keys());
  }

  private async loadShares(): Promise<Map<ZK.FactorId, string>> {
    const rows = await this.rpc<{ factor: ZK.FactorId; sealed_share: string }[]>('claudia_my_key_shares');
    return new Map((rows ?? []).map((r) => [r.factor, r.sealed_share]));
  }

  // ── derive working keys + bind the conversation DEK ───────────────────────
  private async openSession(): Promise<void> {
    this.kek = ZK.deriveKEK(this.ms);
    this.threadId = await this.rpc<string>('claudia_get_or_create_thread', { p_app: 'flowme' });

    const existing = await this.rpc<{ dek_id: string; wrapped_dek: string }[]>(
      'claudia_get_wrapped_dek', { p_conversation_id: this.threadId },
    );
    if (existing && existing.length) {
      this.dek = ZK.unwrapDEK(existing[0].wrapped_dek, this.kek);
      this.dekId = existing[0].dek_id;
    } else {
      this.dek = ZK.randomDEK();
      const wrapped = ZK.wrapDEK(this.dek, this.kek);
      this.dekId = await this.rpc<string>('claudia_ensure_wrapped_dek', {
        p_conversation_id: this.threadId,
        p_wrapped_dek: wrapped,
      });
    }

    // Ensure this FBID has an identity keypair (for group-ZK sharing). This is a
    // NON-ESSENTIAL feature (groups) whose RPCs may not be deployed yet — it must
    // NEVER block core unlock. Fail soft so the vault always opens.
    try {
      await this.ensureIdentityKey();
    } catch {
      /* group identity key unavailable (RPCs not deployed) — core vault still works */
    }
  }

  // ── identity keypair (group-ZK) — minted once, private sealed under KEK ────
  private async ensureIdentityKey(): Promise<void> {
    const rows = await this.rpc<{ public_jwk: JsonWebKey; sealed_private: string; sealed_nonce: string }[]>(
      'claudia_my_identity_key',
    );
    if (rows && rows.length) {
      const b64 = ZK.decryptContent({ ciphertext: rows[0].sealed_private, nonce: rows[0].sealed_nonce }, this.kek);
      this.identity = { publicJwk: rows[0].public_jwk, privatePkcs8: ZK.fromB64(b64) };
      return;
    }
    const kp = await GZ.generateIdentityKeyPair();
    const sealed = ZK.encryptContent(ZK.toB64(kp.privatePkcs8), this.kek);
    await this.rpc('claudia_upsert_identity_key', {
      p_public_jwk: kp.publicJwk,
      p_sealed_private: sealed.ciphertext,
      p_sealed_nonce: sealed.nonce,
    });
    this.identity = kp;
  }

  get ready(): boolean { return !!this.dek; }

  // ── conversation ──────────────────────────────────────────────────────────
  async loadMessages(): Promise<ChatMessage[]> {
    const rows = await this.rpc<
      { role: 'user' | 'assistant'; ciphertext: string; nonce: string }[]
    >('claudia_thread_messages', { p_thread_id: this.threadId });
    return (rows ?? []).map((r) => ({
      role: r.role,
      text: ZK.decryptContent({ ciphertext: r.ciphertext, nonce: r.nonce }, this.dek),
    }));
  }

  async saveMessage(role: 'user' | 'assistant', text: string): Promise<void> {
    const sealed = ZK.encryptContent(text, this.dek);
    await this.rpc('claudia_save_message', {
      p_thread_id: this.threadId,
      p_role: role,
      p_ciphertext: sealed.ciphertext,
      p_nonce: sealed.nonce,
      p_dek_id: this.dekId,
    });
  }

  // ── tasks (title+ready encrypted; venture is plaintext metadata) ──────────
  async captureTask(task: ClaudiaTask): Promise<void> {
    const sealed = ZK.encryptContent(JSON.stringify({ title: task.title, ready: task.ready }), this.dek);
    await this.rpc('claudia_capture_task', {
      p_ciphertext: sealed.ciphertext,
      p_nonce: sealed.nonce,
      p_dek_id: this.dekId,
      p_venture: task.venture,
      p_due: null,
    });
  }

  async loadTasks(): Promise<ReadyTask[]> {
    const rows = await this.rpc<
      { id: string; venture: string; ciphertext: string; nonce: string; status: ReadyTask['status']; due_at: string | null }[]
    >('claudia_my_tasks');
    return (rows ?? []).map((r) => {
      let title = '', ready = '';
      try {
        const o = JSON.parse(ZK.decryptContent({ ciphertext: r.ciphertext, nonce: r.nonce }, this.dek));
        title = o.title ?? ''; ready = o.ready ?? '';
      } catch { /* tampered/foreign row — skip content */ }
      return { id: r.id, title, ready, venture: r.venture, status: r.status, due_at: r.due_at };
    });
  }

  async setTaskStatus(id: string, status: ReadyTask['status']): Promise<void> {
    await this.rpc('claudia_set_task_status', { p_id: id, p_status: status });
  }

  // ── care (kind + timing only — never content) ─────────────────────────────
  async logCare(kind: 'meal' | 'water' | 'rest'): Promise<void> {
    await this.rpc('claudia_log_care', { p_kind: kind });
  }
  async careState(): Promise<Record<string, string>> {
    const rows = await this.rpc<{ kind: string; last_logged: string }[]>('claudia_care_state');
    return Object.fromEntries((rows ?? []).map((r) => [r.kind, r.last_logged]));
  }
  async getCarePrefs(): Promise<CarePrefs> {
    return this.rpc<CarePrefs>('claudia_get_care_prefs');
  }
  async pendingNudges(): Promise<{ id: string; kind: string }[]> {
    return this.rpc<{ id: string; kind: string }[]>('claudia_my_nudges');
  }

  // ════════════════════════════════════════════════════════════════════════
  //  Meetings — each meeting gets its OWN per-meeting DEK, wrapped under the
  //  same KEK (reusing the wrapped-DEK spine, keyed by meeting id). Transcript
  //  segments and the notes digest are encrypted under that DEK before they
  //  ever leave the device. The transcript itself is produced on-device.
  // ════════════════════════════════════════════════════════════════════════
  private meetingDeks = new Map<string, { dek: Uint8Array; dekId: string }>();

  /** Fetch (or, with create, mint) the per-meeting DEK and cache it for the session. */
  private async meetingDek(meetingId: string, create = false): Promise<{ dek: Uint8Array; dekId: string }> {
    const cached = this.meetingDeks.get(meetingId);
    if (cached) return cached;
    const existing = await this.rpc<{ dek_id: string; wrapped_dek: string }[]>(
      'claudia_get_wrapped_dek', { p_conversation_id: meetingId },
    );
    let entry: { dek: Uint8Array; dekId: string };
    if (existing && existing.length) {
      entry = { dek: ZK.unwrapDEK(existing[0].wrapped_dek, this.kek), dekId: existing[0].dek_id };
    } else if (create) {
      const dek = ZK.randomDEK();
      const dekId = await this.rpc<string>('claudia_ensure_wrapped_dek', {
        p_conversation_id: meetingId,
        p_wrapped_dek: ZK.wrapDEK(dek, this.kek),
      });
      entry = { dek, dekId };
    } else {
      throw new Error('no-meeting-dek');
    }
    this.meetingDeks.set(meetingId, entry);
    return entry;
  }

  /** Start a new meeting; returns the meeting id. DEK is minted + wrapped first. */
  async createMeeting(source: MeetingSource): Promise<string> {
    const meetingId = crypto.randomUUID();
    const { dekId } = await this.meetingDek(meetingId, true);
    await this.rpc('claudia_create_meeting', { p_id: meetingId, p_source: source, p_dek_id: dekId });
    return meetingId;
  }

  /** Append one transcript segment (text encrypted; idx + offset are timing only). */
  async saveMeetingSegment(meetingId: string, idx: number, tOffset: number, text: string): Promise<void> {
    const { dek, dekId } = await this.meetingDek(meetingId);
    const sealed = ZK.encryptContent(JSON.stringify({ text }), dek);
    await this.rpc('claudia_save_meeting_segment', {
      p_meeting_id: meetingId, p_idx: idx, p_t_offset: tOffset,
      p_ciphertext: sealed.ciphertext, p_nonce: sealed.nonce, p_dek_id: dekId,
    });
  }

  async loadMeetingSegments(meetingId: string): Promise<{ idx: number; tOffset: number; text: string }[]> {
    const { dek } = await this.meetingDek(meetingId);
    const rows = await this.rpc<{ idx: number; t_offset: number; ciphertext: string; nonce: string }[]>(
      'claudia_meeting_segments', { p_meeting_id: meetingId },
    );
    return (rows ?? []).map((r) => {
      let text = '';
      try { text = JSON.parse(ZK.decryptContent({ ciphertext: r.ciphertext, nonce: r.nonce }, dek)).text ?? ''; }
      catch { /* tampered/foreign row — skip content */ }
      return { idx: r.idx, tOffset: Number(r.t_offset), text };
    });
  }

  /** End a meeting, optionally sealing an encrypted title under the meeting DEK. */
  async endMeeting(meetingId: string, title?: string): Promise<void> {
    let p_title_ct: string | null = null;
    let p_title_nonce: string | null = null;
    if (title && title.trim()) {
      const { dek } = await this.meetingDek(meetingId);
      const sealed = ZK.encryptContent(title.trim(), dek);
      p_title_ct = sealed.ciphertext; p_title_nonce = sealed.nonce;
    }
    await this.rpc('claudia_end_meeting', { p_meeting_id: meetingId, p_title_ct, p_title_nonce });
  }

  async saveMeetingNotes(meetingId: string, digestJson: string): Promise<void> {
    const { dek, dekId } = await this.meetingDek(meetingId);
    const sealed = ZK.encryptContent(digestJson, dek);
    await this.rpc('claudia_save_meeting_notes', {
      p_meeting_id: meetingId, p_ciphertext: sealed.ciphertext, p_nonce: sealed.nonce, p_dek_id: dekId,
    });
  }

  /** Returns the decrypted digest JSON string, or null if none stored yet. */
  async getMeetingNotes(meetingId: string): Promise<string | null> {
    const { dek } = await this.meetingDek(meetingId);
    const rows = await this.rpc<{ ciphertext: string; nonce: string }[]>(
      'claudia_get_meeting_notes', { p_meeting_id: meetingId },
    );
    if (!rows || !rows.length) return null;
    try { return ZK.decryptContent({ ciphertext: rows[0].ciphertext, nonce: rows[0].nonce }, dek); }
    catch { return null; }
  }

  async listMeetings(): Promise<MeetingSummary[]> {
    const rows = await this.rpc<{
      id: string; source: MeetingSource; status: 'recording' | 'ended';
      title_ct: string | null; title_nonce: string | null;
      started_at: string; ended_at: string | null; has_notes: boolean;
    }[]>('claudia_list_meetings');
    const out: MeetingSummary[] = [];
    for (const r of rows ?? []) {
      let title = '';
      if (r.title_ct && r.title_nonce) {
        try {
          const { dek } = await this.meetingDek(r.id);
          title = ZK.decryptContent({ ciphertext: r.title_ct, nonce: r.title_nonce }, dek);
        } catch { /* skip undecryptable title */ }
      }
      out.push({
        id: r.id, source: r.source, status: r.status, title,
        startedAt: r.started_at, endedAt: r.ended_at, hasNotes: r.has_notes,
      });
    }
    return out;
  }

  async deleteMeeting(meetingId: string): Promise<void> {
    await this.rpc('claudia_delete_meeting', { p_id: meetingId });
    this.meetingDeks.delete(meetingId);
  }

  // ════════════════════════════════════════════════════════════════════════
  //  Group-ZK rooms — a shared recap or community thread, server-blind. The
  //  room key (RK) encrypts all shared content; it is wrapped per-member to
  //  each member's published identity public key. Only members can open it.
  // ════════════════════════════════════════════════════════════════════════

  /** This FBID's published identity public key (for others to wrap to it). */
  get publicKey(): JsonWebKey {
    if (!this.identity) throw new Error('identity-not-ready');
    return this.identity.publicJwk;
  }

  async getPeerPublicKey(userId: string): Promise<JsonWebKey> {
    const jwk = await this.rpc<JsonWebKey | null>('claudia_identity_public', { p_user_id: userId });
    if (!jwk) throw new Error('peer-has-no-identity-key');
    return jwk;
  }

  /** Create a room, seal its title under a fresh RK, and add SELF as a member. */
  async createRoom(kind: 'meeting' | 'community', refId?: string, title?: string): Promise<{ roomId: string; roomKey: Uint8Array }> {
    const roomKey = GZ.randomRoomKey();
    let p_title_ct: string | null = null;
    let p_title_nonce: string | null = null;
    if (title && title.trim()) {
      const sealed = ZK.encryptContent(title.trim(), roomKey);
      p_title_ct = sealed.ciphertext; p_title_nonce = sealed.nonce;
    }
    const roomId = await this.rpc<string>('claudia_create_room', {
      p_kind: kind, p_ref_id: refId ?? null, p_title_ct, p_title_nonce,
    });
    this.roomKeys.set(roomId, roomKey);
    // owner must hold a wrapped key too, or they couldn't reopen the room later
    await this.addRoomMember(roomId, this.uid);
    return { roomId, roomKey };
  }

  /** Wrap this room's RK to a member (by FBID) and store the per-member blob. */
  async addRoomMember(roomId: string, memberUserId: string): Promise<void> {
    const roomKey = await this.openRoomKey(roomId);
    const peerPub = memberUserId === this.uid ? this.publicKey : await this.getPeerPublicKey(memberUserId);
    const wrapped = await GZ.wrapRoomKeyFor(roomKey, peerPub);
    await this.rpc('claudia_add_room_member', {
      p_room_id: roomId, p_member_id: memberUserId,
      p_ephemeral_pub: wrapped.ephemeralPubJwk, p_wrapped_rk: wrapped.wrapped,
    });
  }

  /** Recover the room key as a member (unwrap with our sealed private key). */
  async openRoomKey(roomId: string): Promise<Uint8Array> {
    const cached = this.roomKeys.get(roomId);
    if (cached) return cached;
    if (!this.identity) throw new Error('identity-not-ready');
    const rows = await this.rpc<{ ephemeral_pub: JsonWebKey; wrapped_rk: string }[]>(
      'claudia_my_room_key', { p_room_id: roomId },
    );
    if (!rows || !rows.length) throw new Error('not-a-room-member');
    const rk = await GZ.unwrapRoomKey(
      { ephemeralPubJwk: rows[0].ephemeral_pub, wrapped: rows[0].wrapped_rk },
      this.identity.privatePkcs8,
    );
    this.roomKeys.set(roomId, rk);
    return rk;
  }

  async myRooms(): Promise<{ id: string; kind: 'meeting' | 'community'; refId: string | null; ownerId: string; title: string }[]> {
    const rows = await this.rpc<{
      id: string; kind: 'meeting' | 'community'; ref_id: string | null; owner_id: string;
      title_ct: string | null; title_nonce: string | null;
    }[]>('claudia_my_rooms');
    const out: { id: string; kind: 'meeting' | 'community'; refId: string | null; ownerId: string; title: string }[] = [];
    for (const r of rows ?? []) {
      let title = '';
      if (r.title_ct && r.title_nonce) {
        try {
          const rk = await this.openRoomKey(r.id);
          title = ZK.decryptContent({ ciphertext: r.title_ct, nonce: r.title_nonce }, rk);
        } catch { /* skip undecryptable */ }
      }
      out.push({ id: r.id, kind: r.kind, refId: r.ref_id, ownerId: r.owner_id, title });
    }
    return out;
  }

  // ── recap sharing (group-ZK): publish a meeting digest to other FBIDs ──────
  /**
   * Share a finished meeting's digest with the given FBIDs. Finds or creates the
   * room for this meeting, encrypts the digest under its room key, then wraps the
   * room key to each member. Members who have never opened ClaudIA (no published
   * identity key) land in `failed` — they must open it once before they can be
   * added. Returns the room id + per-member outcome.
   */
  async shareMeetingRecap(meetingId: string, memberFbids: string[]): Promise<{
    roomId: string; shared: string[]; failed: { fbid: string; reason: string }[];
  }> {
    const json = await this.getMeetingNotes(meetingId);
    if (!json) throw new Error('no-notes-to-share');

    // reuse an existing room for this meeting, else create one + store the recap
    const mine = await this.myRooms();
    const existing = mine.find((r) => r.kind === 'meeting' && r.refId === meetingId && r.ownerId === this.uid);
    let roomId: string;
    let roomKey: Uint8Array;
    if (existing) {
      roomId = existing.id;
      roomKey = await this.openRoomKey(roomId);
    } else {
      let title = 'Reunión';
      try { title = JSON.parse(json).title || title; } catch { /* keep default */ }
      const created = await this.createRoom('meeting', meetingId, title);
      roomId = created.roomId; roomKey = created.roomKey;
    }
    // (re)write the encrypted recap under the room key
    const sealed = ZK.encryptContent(json, roomKey);
    await this.rpc('claudia_save_room_recap', {
      p_room_id: roomId, p_ciphertext: sealed.ciphertext, p_nonce: sealed.nonce,
    });

    const shared: string[] = [];
    const failed: { fbid: string; reason: string }[] = [];
    for (const fbid of memberFbids) {
      const id = fbid.trim();
      if (!id || id === this.uid) continue;
      try { await this.addRoomMember(roomId, id); shared.push(id); }
      catch (e) { failed.push({ fbid: id, reason: (e as Error).message }); }
    }
    return { roomId, shared, failed };
  }

  /** Decrypted digest JSON string for a room recap (member or owner), or null. */
  async loadRoomRecap(roomId: string): Promise<string | null> {
    const rk = await this.openRoomKey(roomId);
    const rows = await this.rpc<{ ciphertext: string; nonce: string }[]>(
      'claudia_get_room_recap', { p_room_id: roomId },
    );
    if (!rows || !rows.length) return null;
    try { return ZK.decryptContent({ ciphertext: rows[0].ciphertext, nonce: rows[0].nonce }, rk); }
    catch { return null; }
  }

  /** Meeting rooms shared WITH me (I'm a member, someone else owns them). */
  async sharedMeetingRooms(): Promise<{ id: string; title: string; ownerId: string }[]> {
    const rooms = await this.myRooms();
    return rooms
      .filter((r) => r.kind === 'meeting' && r.ownerId !== this.uid)
      .map((r) => ({ id: r.id, title: r.title || 'Reunión compartida', ownerId: r.ownerId }));
  }

  async roomMembers(roomId: string): Promise<string[]> {
    const rows = await this.rpc<{ member_id: string }[]>('claudia_room_members', { p_room_id: roomId });
    return (rows ?? []).map((r) => r.member_id);
  }

  /** This session's FBID (for "tú" vs others in shared chat). */
  get myFbid(): string { return this.uid; }

  // ── room chat (encrypted under RK; sender_id is plaintext metadata) ────────
  async postRoomMessage(roomId: string, text: string): Promise<void> {
    const rk = await this.openRoomKey(roomId);
    const sealed = ZK.encryptContent(text, rk);
    await this.rpc('claudia_post_room_message', {
      p_room_id: roomId, p_ciphertext: sealed.ciphertext, p_nonce: sealed.nonce,
    });
  }

  async loadRoomMessages(roomId: string, since?: string): Promise<{ id: string; senderId: string; text: string; at: string }[]> {
    const rk = await this.openRoomKey(roomId);
    const rows = await this.rpc<{ id: string; sender_id: string; ciphertext: string; nonce: string; created_at: string }[]>(
      'claudia_room_messages', { p_room_id: roomId, p_since: since ?? null },
    );
    return (rows ?? []).map((r) => {
      let text = '';
      try { text = ZK.decryptContent({ ciphertext: r.ciphertext, nonce: r.nonce }, rk); }
      catch { /* foreign/tampered — skip content */ }
      return { id: r.id, senderId: r.sender_id, text, at: r.created_at };
    });
  }

  /** A standalone community room (chat-first), with optional initial members. */
  async createCommunityRoom(title: string, memberFbids: string[] = []): Promise<string> {
    const { roomId } = await this.createRoom('community', undefined, title);
    for (const fbid of memberFbids) {
      const id = fbid.trim();
      if (id && id !== this.uid) { try { await this.addRoomMember(roomId, id); } catch { /* skip */ } }
    }
    return roomId;
  }

  // ── invite links (RK sealed under a link key carried only in the URL #) ────
  /** Mint an invite. Returns the token + the link key to place in the URL fragment. */
  async createInvite(roomId: string, opts?: { expiresAt?: string; maxUses?: number }): Promise<{ token: string; linkKey: string }> {
    const rk = await this.openRoomKey(roomId);
    const linkKey = GZ.randomRoomKey();                 // 32-byte symmetric link key
    const sealed = ZK.encryptContent(ZK.toB64(rk), linkKey);
    const token = await this.rpc<string>('claudia_create_invite', {
      p_room_id: roomId, p_wrapped_ct: sealed.ciphertext, p_wrapped_nonce: sealed.nonce,
      p_expires_at: opts?.expiresAt ?? null, p_max_uses: opts?.maxUses ?? null,
    });
    return { token, linkKey: ZK.toB64(linkKey) };
  }

  /** Redeem an invite: unwrap RK from the fragment key, then self-join as a member. */
  async redeemInvite(token: string, linkKeyB64: string): Promise<string> {
    const rows = await this.rpc<{ room_id: string; wrapped_ct: string; wrapped_nonce: string }[]>(
      'claudia_get_invite', { p_token: token },
    );
    if (!rows || !rows.length) throw new Error('invite-invalid');
    const linkKey = ZK.fromB64(linkKeyB64);
    const rk = ZK.fromB64(ZK.decryptContent({ ciphertext: rows[0].wrapped_ct, nonce: rows[0].wrapped_nonce }, linkKey));
    const roomId = rows[0].room_id;
    this.roomKeys.set(roomId, rk);
    // become a persistent member: wrap RK to my own identity key
    const wrapped = await GZ.wrapRoomKeyFor(rk, this.publicKey);
    await this.rpc('claudia_join_room_via_invite', {
      p_token: token, p_ephemeral_pub: wrapped.ephemeralPubJwk, p_wrapped_rk: wrapped.wrapped,
    });
    return roomId;
  }

  async revokeInvite(token: string): Promise<void> {
    await this.rpc('claudia_revoke_invite', { p_token: token });
  }

  // ── SafeFlow entitlements (tier/feature gating; authz plane, not ZK content) ─
  private entitlement: Entitlement | null = null;

  /** Effective entitlement for an app ('*' = account-wide). Caches the global one. */
  async myEntitlement(appSlug = '*'): Promise<Entitlement> {
    const rows = await this.rpc<{ tier: Tier; features: string[] | null; app_slug: string; expires_at: string | null }[]>(
      'claudia_my_entitlement', { p_app_slug: appSlug },
    ).catch(() => null);
    const r = rows?.[0];
    const ent: Entitlement = r
      ? { tier: r.tier, features: r.features ?? [], appSlug: r.app_slug, expiresAt: r.expires_at }
      : FREE_ENTITLEMENT;
    if (appSlug === '*') this.entitlement = ent;
    return ent;
  }

  /** Does the current user's tier unlock this feature? (UX gate; enforce server-side too.) */
  async can(feature: Feature, appSlug = '*'): Promise<boolean> {
    const ent = appSlug === '*' && this.entitlement ? this.entitlement : await this.myEntitlement(appSlug);
    return tierHas(ent, feature);
  }

  // ════════════════════════════════════════════════════════════════════════
  //  Private-key ROTATION — re-key the vault when a recovery phrase may have
  //  leaked. Gated by a 2-of-N step-up (any two of passkey / current phrase /
  //  email code) so a leaked phrase ALONE can never rotate or lock you out.
  //  Re-keys the master secret + issues a fresh phrase, re-wraps every DEK and
  //  re-seals the identity key under the new KEK, and commits atomically. Old
  //  phrase opens nothing afterward; content/DEKs/rooms are preserved.
  // ════════════════════════════════════════════════════════════════════════

  /** Which factors have been proven this session (drives the step-up UI). */
  provenFactors(): string[] { return Array.from(this.proofs); }
  rotationReady(): boolean { return this.proofs.size >= 2; }

  /** Prove the passkey factor (a second factor for step-up). */
  async provePasskey(): Promise<boolean> {
    try {
      const sealed = (await this.loadShares()).get('passkey');
      if (!sealed) return false;
      const key = await ZK.passkeyFactorKey(localStorage.getItem(CRED_KEY(this.uid)) ?? undefined);
      ZK.unlockMS(sealed, key); // throws on wrong passkey
      this.proofs.add('passkey');
      return true;
    } catch { return false; }
  }

  /** Prove the current recovery phrase (without using it to unlock). */
  async proveRecovery(mnemonic: string): Promise<boolean> {
    try {
      if (!ZK.isValidMnemonic(mnemonic)) return false;
      const sealed = (await this.loadShares()).get('recovery');
      if (!sealed) return false;
      ZK.unlockMS(sealed, ZK.recoveryFactorKey(mnemonic)); // throws if wrong
      this.proofs.add('recovery');
      return true;
    } catch { return false; }
  }

  /** Send an email one-time code to the account address (a second factor). */
  async sendRotationOtp(): Promise<void> {
    const { data } = await this.sb.auth.getUser();
    const email = data.user?.email;
    if (!email) throw new Error('no-account-email');
    const { error } = await this.sb.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
    if (error) throw error;
  }

  /** Verify the emailed code → proves the email factor. */
  async verifyRotationOtp(code: string): Promise<boolean> {
    const { data } = await this.sb.auth.getUser();
    const email = data.user?.email;
    if (!email) return false;
    const { error } = await this.sb.auth.verifyOtp({ email, token: code.trim(), type: 'email' });
    if (error) return false;
    this.proofs.add('email');
    return true;
  }

  /**
   * Re-key the vault. Requires the vault unlocked (old MS in memory) and ≥2
   * proven factors. Returns the NEW recovery phrase to show ONCE. Lockout-safe:
   * everything is re-wrapped in memory and validated BEFORE the atomic commit,
   * so a failure leaves the old keys fully intact.
   */
  async rotateRecoveryKey(): Promise<{ recoveryPhrase: string }> {
    if (!this.ms || !this.kek) throw new Error('vault-locked');
    if (this.proofs.size < 2) throw new Error('need-two-factors');

    // 1. unwrap ALL DEKs with the OLD KEK first — if any fails we abort here,
    //    before touching the server, so nothing is lost.
    const rows = await this.rpc<{ id: string; conversation_id: string; wrapped_dek: string }[]>('claudia_all_wrapped_deks');
    const plainDeks = (rows ?? []).map((d) => ({ conversation_id: d.conversation_id, dek: ZK.unwrapDEK(d.wrapped_dek, this.kek) }));

    // 2. new master secret + KEK + recovery phrase
    const newMs = ZK.generateMasterSecret();
    const newKek = ZK.deriveKEK(newMs);
    const recoveryPhrase = ZK.generateRecoveryMnemonic();
    const factorKeys: Partial<Record<ZK.FactorId, Uint8Array>> = { recovery: ZK.recoveryFactorKey(recoveryPhrase) };

    // keep the passkey factor if one is enrolled and reachable on this device
    if ((await this.loadShares()).has('passkey')) {
      try { factorKeys.passkey = await ZK.passkeyFactorKey(localStorage.getItem(CRED_KEY(this.uid)) ?? undefined); }
      catch { /* passkey unreachable now — the new phrase still seals the vault */ }
    }
    const shares = ZK.enrollSealMS(newMs, factorKeys); // ≥1 seal guaranteed (recovery)

    // 3. re-wrap DEKs under the new KEK (DEKs unchanged → content untouched)
    const wrapped = plainDeks.map((d) => ({ conversation_id: d.conversation_id, wrapped_dek: ZK.wrapDEK(d.dek, newKek) }));

    // 4. re-seal the identity private key under the new KEK
    let identity: { sealed_private: string; sealed_nonce: string } | null = null;
    if (this.identity) {
      const sealed = ZK.encryptContent(ZK.toB64(this.identity.privatePkcs8), newKek);
      identity = { sealed_private: sealed.ciphertext, sealed_nonce: sealed.nonce };
    }

    // 5. atomic commit — all-or-nothing on the server
    await this.rpc('claudia_rotate_keys', { p_shares: shares, p_wrapped: wrapped, p_identity: identity });

    // 6. swap in the new keys for the live session (DEK/identity/room caches stay valid)
    this.ms = newMs;
    this.kek = newKek;
    this.proofs.clear(); // a fresh rotation needs a fresh step-up
    return { recoveryPhrase };
  }
}

// One vault instance per browser session — the derived keys live in memory after
// unlock, so the VaultGate (where she grants access) and the app behind it must
// share the SAME instance, or the app would boot locked again.
let _vault: ClaudiaVault | null = null;
export function getVault(): ClaudiaVault {
  return (_vault ??= new ClaudiaVault());
}
