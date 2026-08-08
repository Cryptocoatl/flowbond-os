import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from './supabase';
import type { Block, MarkKey } from '@/content/types';

export type Role = 'owner' | 'guest' | 'viewer';

export interface BlockRow {
  id: string;
  block_key: string;
  section_key: string;
  ordinal: number;
  kind: string;
  annotatable: boolean;
  payload: Block;
}

export interface MarkRow {
  id: string;
  block_id: string;
  user_id: string;
  mark: MarkKey;
  updated_at: string;
}

export interface CommentRow {
  id: string;
  block_id: string;
  parent_id: string | null;
  user_id: string;
  body: string;
  resolved_at: string | null;
  deleted_at: string | null;
  created_at: string;
}

export interface MemberRow {
  id: string;
  email: string;
  user_id: string | null;
  role: Role;
  last_seen_at: string | null;
}

export type RoomState =
  | { status: 'loading' }
  | { status: 'anonymous' }
  /** Authenticated but not on the list. Deliberately indistinguishable from a bad slug. */
  | { status: 'denied' }
  | {
      status: 'ready';
      roomId: string;
      role: Role;
      userId: string;
      blocks: BlockRow[];
      members: MemberRow[];
    };

export function useRoom(slug: string) {
  const [state, setState] = useState<RoomState>({ status: 'loading' });
  const [marks, setMarks] = useState<Record<string, MarkRow>>({});
  const [comments, setComments] = useState<CommentRow[]>([]);

  const load = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (!session) {
      setState({ status: 'anonymous' });
      return;
    }

    const { data: entered, error } = await supabase.rpc('flowroom_enter', { p_slug: slug });
    const row = Array.isArray(entered) ? entered[0] : entered;
    if (error || !row?.room_id) {
      setState({ status: 'denied' });
      return;
    }

    const roomId = row.room_id as string;
    const role = row.role as Role;

    const [blocksRes, marksRes, commentsRes, membersRes] = await Promise.all([
      supabase
        .from('flowroom_blocks')
        .select('id, block_key, section_key, ordinal, kind, annotatable, payload')
        .eq('room_id', roomId)
        .order('ordinal'),
      supabase.from('flowroom_marks').select('id, block_id, user_id, mark, updated_at').eq('room_id', roomId),
      supabase
        .from('flowroom_comments')
        .select('id, block_id, parent_id, user_id, body, resolved_at, deleted_at, created_at')
        .eq('room_id', roomId)
        .order('created_at'),
      supabase.from('flowroom_members').select('id, email, user_id, role, last_seen_at').eq('room_id', roomId),
    ]);

    setMarks(Object.fromEntries((marksRes.data ?? []).map((m) => [`${m.block_id}:${m.user_id}`, m as MarkRow])));
    setComments((commentsRes.data ?? []) as CommentRow[]);
    setState({
      status: 'ready',
      roomId,
      role,
      userId: session.user.id,
      blocks: (blocksRes.data ?? []) as BlockRow[],
      members: (membersRes.data ?? []) as MemberRow[],
    });
  }, [slug]);

  useEffect(() => {
    void load();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') void load();
    });
    return () => sub.subscription.unsubscribe();
  }, [load]);

  /* -- realtime: the console must see a mark inside two seconds ------- */
  const roomId = state.status === 'ready' ? state.roomId : null;
  useEffect(() => {
    if (!roomId) return;
    const channel = supabase
      .channel(`flowroom:${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'flowroom_marks', filter: `room_id=eq.${roomId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            const old = payload.old as MarkRow;
            setMarks((m) => {
              const next = { ...m };
              delete next[`${old.block_id}:${old.user_id}`];
              return next;
            });
          } else {
            const row = payload.new as MarkRow;
            setMarks((m) => ({ ...m, [`${row.block_id}:${row.user_id}`]: row }));
          }
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'flowroom_comments', filter: `room_id=eq.${roomId}` },
        (payload) => {
          const row = payload.new as CommentRow;
          setComments((cs) => {
            const i = cs.findIndex((c) => c.id === row.id);
            if (i === -1) return [...cs, row];
            const next = [...cs];
            next[i] = row;
            return next;
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [roomId]);

  /* -- mutations ------------------------------------------------------ */
  const userId = state.status === 'ready' ? state.userId : null;

  const setMark = useCallback(
    async (blockId: string, mark: MarkKey | null) => {
      if (!userId) return;
      const key = `${blockId}:${userId}`;
      const previous = marks[key];

      // Optimistic, with rollback. A mark that lags feels like a broken toggle.
      setMarks((m) => {
        const next = { ...m };
        if (mark === null) delete next[key];
        else
          next[key] = {
            id: previous?.id ?? `optimistic:${key}`,
            block_id: blockId,
            user_id: userId,
            mark,
            updated_at: new Date().toISOString(),
          };
        return next;
      });

      const { error } =
        mark === null
          ? await supabase.rpc('flowroom_clear_mark', { p_block_id: blockId })
          : await supabase.rpc('flowroom_set_mark', { p_block_id: blockId, p_mark: mark });

      if (error) {
        setMarks((m) => {
          const next = { ...m };
          if (previous) next[key] = previous;
          else delete next[key];
          return next;
        });
        throw error;
      }
    },
    [marks, userId],
  );

  const addComment = useCallback(async (blockId: string, body: string, parentId?: string) => {
    const { data, error } = await supabase.rpc('flowroom_add_comment', {
      p_block_id: blockId,
      p_body: body,
      p_parent_id: parentId ?? null,
    });
    if (error) throw error;
    if (data) setComments((cs) => (cs.some((c) => c.id === data.id) ? cs : [...cs, data as CommentRow]));
    return data as CommentRow;
  }, []);

  const resolveComment = useCallback(async (commentId: string, resolved = true) => {
    const { error } = await supabase.rpc('flowroom_resolve_comment', {
      p_comment_id: commentId,
      p_resolved: resolved,
    });
    if (error) throw error;
    setComments((cs) =>
      cs.map((c) => (c.id === commentId ? { ...c, resolved_at: resolved ? new Date().toISOString() : null } : c)),
    );
  }, []);

  const deleteComment = useCallback(async (commentId: string) => {
    const { error } = await supabase.rpc('flowroom_delete_comment', { p_comment_id: commentId });
    if (error) throw error;
    setComments((cs) =>
      cs.map((c) => (c.id === commentId ? { ...c, deleted_at: new Date().toISOString() } : c)),
    );
  }, []);

  const invite = useCallback(
    async (email: string, note?: string) => {
      if (!roomId) throw new Error('no room');
      const { error } = await supabase.rpc('flowroom_invite_member', {
        p_room_id: roomId,
        p_email: email,
        p_note: note ?? null,
      });
      if (error) throw error;
      // The Worker owns the outbound email — the browser never sees Resend.
      await fetch('/api/invite/notify', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({ roomId, email, note, slug }),
      });
    },
    [roomId, slug],
  );

  /* -- derived -------------------------------------------------------- */
  const myMarks = useMemo(() => {
    const out: Record<string, MarkKey> = {};
    if (!userId) return out;
    for (const [k, v] of Object.entries(marks)) {
      if (k.endsWith(`:${userId}`)) out[v.block_id] = v.mark;
    }
    return out;
  }, [marks, userId]);

  const commentsByBlock = useMemo(() => {
    const out: Record<string, CommentRow[]> = {};
    for (const c of comments) (out[c.block_id] ??= []).push(c);
    return out;
  }, [comments]);

  return {
    state,
    marks,
    myMarks,
    comments,
    commentsByBlock,
    setMark,
    addComment,
    resolveComment,
    deleteComment,
    invite,
    reload: load,
  };
}

/**
 * Reading progress. Steph needs to know she reached the money section even if
 * she left no mark on it — a section counts as read at ≥60% visible for ≥3s.
 */
export function useReadTracking(roomId: string | null) {
  const logged = useRef<Set<string>>(new Set());

  return useCallback(
    (sectionKey: string, el: Element | null) => {
      if (!roomId || !el || logged.current.has(sectionKey)) return () => {};

      let timer: ReturnType<typeof setTimeout> | null = null;
      const io = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            timer ??= setTimeout(() => {
              if (logged.current.has(sectionKey)) return;
              logged.current.add(sectionKey);
              void supabase.rpc('flowroom_log_activity', {
                p_room_id: roomId,
                p_event: 'section_read',
                p_block_key: sectionKey,
                p_meta: {},
              });
              io.disconnect();
            }, 3000);
          } else if (timer) {
            clearTimeout(timer);
            timer = null;
          }
        },
        { threshold: [0, 0.6, 1] },
      );
      io.observe(el);

      return () => {
        if (timer) clearTimeout(timer);
        io.disconnect();
      };
    },
    [roomId],
  );
}

export { MARK_LABELS, MARK_ORDER, MARK_COLORS } from './marks';
