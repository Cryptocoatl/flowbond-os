import { createContext, useContext } from 'react';
import type { Block, MarkKey } from '@/content/types';
import type { BlockRow, CommentRow, Role } from '@/lib/room';
import { DeckBlock } from '@/deck/blocks';
import Annotatable from '@/components/Annotatable';

/**
 * Chapters need blocks and the annotation handlers, and threading eleven props
 * through twelve chapters would drown the choreography in plumbing. One
 * context, one `<B/>` component, and a chapter reads as what it looks like.
 */

export interface RoomCtx {
  blocks: Map<string, BlockRow>;
  role: Role;
  userId: string;
  myMarks: Record<string, MarkKey>;
  commentsByBlock: Record<string, CommentRow[]>;
  onMark: (blockId: string, mark: MarkKey | null) => Promise<void>;
  onComment: (blockId: string, body: string, parentId?: string) => Promise<unknown>;
  onResolve: (id: string, resolved: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  /** A viewer sees the whole flow and can touch none of it. */
  canMark?: boolean;
  canComment?: boolean;
}

const Ctx = createContext<RoomCtx | null>(null);
export const RoomProvider = Ctx.Provider;

export function useRoomCtx() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useRoomCtx outside provider');
  return c;
}

/** Read a block's payload, for chapters that lay it out themselves. */
export function usePayload<T extends Block>(k: string): T | null {
  const ctx = useRoomCtx();
  return (ctx.blocks.get(k)?.payload as T | undefined) ?? null;
}

/**
 * One annotated block, by permanent key.
 *
 * `data-in` marks it as something the chapter timeline animates. If a chapter
 * forgets to animate it, it is still visible — the resting state is always
 * "readable", never "invisible waiting for JS".
 */
export function B({
  k,
  accent,
  onColor = false,
  className,
  anim = true,
  tag,
  headless = false,
}: {
  k: string;
  accent: string;
  onColor?: boolean;
  className?: string;
  anim?: boolean;
  headless?: boolean;
  /** Which handle the chapter's timeline grabs this by: data-card, data-row… */
  tag?: 'card' | 'row' | 'col' | 'site';
}) {
  const ctx = useRoomCtx();
  const row = ctx.blocks.get(k);
  if (!row) return null;

  const node = <DeckBlock block={row.payload as Block} ctx={{ onColor, accent, headless }} />;
  const handle = tag ? { [`data-${tag}`]: '' } : anim ? { 'data-in': '' } : {};

  // A viewer gets the block with no gutter at all, rather than a gutter that
  // refuses — an affordance that does nothing is worse than no affordance.
  const annotatable = row.annotatable && (ctx.canMark !== false || ctx.canComment !== false);

  return (
    <div className={className} {...handle}>
      {annotatable ? (
        <Annotatable
          blockId={row.id}
          blockKey={row.block_key}
          accent={accent}
          onColor={onColor}
          mark={ctx.myMarks[row.id]}
          comments={ctx.commentsByBlock[row.id] ?? []}
          userId={ctx.userId}
          isOwner={ctx.role === 'owner'}
          onMark={ctx.onMark}
          onComment={ctx.onComment}
          onResolve={ctx.onResolve}
          onDelete={ctx.onDelete}
          canMark={ctx.canMark !== false}
          canComment={ctx.canComment !== false}
        >
          {node}
        </Annotatable>
      ) : (
        node
      )}
    </div>
  );
}
