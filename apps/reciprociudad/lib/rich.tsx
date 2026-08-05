import { Fragment, type ReactNode } from 'react';
import { accentOf } from './site-content';

/**
 * The tiny markup Fer can type in /admin — deliberately NOT HTML.
 *
 *   **palabra**    → the accent <em class="oro|agua|…"> on titles,
 *                    plain <b> on body copy (fields with no accent configured)
 *   salto de línea → <br/>
 *
 * Everything else React renders as plain text, so nothing an editor types can
 * inject markup or script into the page.
 */

function marked(text: string, accent: string | undefined, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const k = `${keyPrefix}-m-${i++}`;
    out.push(
      accent ? (
        <em className={accent} key={k}>
          {m[1]}
        </em>
      ) : (
        <b key={k}>{m[1]}</b>
      ),
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** Render an editable string with accents + line breaks. */
export function rich(text: string, accent?: string): ReactNode {
  const lines = (text ?? '').split('\n');
  return lines.map((line, i) => (
    <Fragment key={`l${i}`}>
      {i > 0 && <br />}
      {marked(line, accent, `l${i}`)}
    </Fragment>
  ));
}

/** Render by key — picks up the accent configured for that field. */
export function richKey(copy: Record<string, string>, key: string): ReactNode {
  return rich(copy[key] ?? '', accentOf(key));
}

/** Plain text for attributes (alt, aria-label, title) — strips the markers. */
export function plain(text: string): string {
  return (text ?? '').replace(/\*\*(.+?)\*\*/g, '$1').replace(/\n/g, ' ');
}
