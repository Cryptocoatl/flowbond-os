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

    if (opts.wantPasskey) {
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
}

// One vault instance per browser session — the derived keys live in memory after
// unlock, so the VaultGate (where she grants access) and the app behind it must
// share the SAME instance, or the app would boot locked again.
let _vault: ClaudiaVault | null = null;
export function getVault(): ClaudiaVault {
  return (_vault ??= new ClaudiaVault());
}
