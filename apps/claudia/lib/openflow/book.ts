import fs from 'node:fs';
import path from 'node:path';

/**
 * Build-time parser for the OpenFlow book.
 * Source of truth: content/openflow-book.md (FlowBond Open Book — Stack Audit, Jeff edition).
 * Never hand-copy book content into JSX — edit the markdown and rebuild.
 * Runs server-side only (page is force-static, so this executes at build time).
 */

export type Product = { name: string; what: string; status: string };
export type SubChapter = {
  letter: string;
  title: string;
  html: string;
  products: Product[];
};
export type Chapter = {
  num: number;
  roman: string;
  title: string;
  html: string;
  /** Part III only: lettered A–I product-catalog sub-chapters */
  subs: SubChapter[] | null;
};
export type Book = {
  title: string;
  subtitle: string;
  note: string;
  chapters: Chapter[];
};

const ROMAN: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7 };

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Inline markdown: `code`, **bold**, *italic* — applied after HTML-escaping. */
function inline(s: string): string {
  return esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+(?:\*(?!\*)[^*]*)*)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
}

/** Strip markdown markup for plain-text uses (constellation node names). */
export function plain(s: string): string {
  return s.replace(/\*\*/g, '').replace(/`/g, '').replace(/\*/g, '').trim();
}

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
}

const isTableSep = (line: string) => /^\|[\s|:-]+\|?\s*$/.test(line);

type MdOpts = { tableClass?: string };

/** Minimal markdown → HTML for the controlled book source: headings, hr,
 *  paragraphs, ul/ol lists, tables (with data-label for mobile stacking). */
export function mdToHtml(md: string, opts: MdOpts = {}): string {
  const lines = md.split('\n');
  const out: string[] = [];
  let para: string[] = [];
  let i = 0;

  const flushPara = () => {
    if (para.length) {
      out.push(`<p>${inline(para.join(' '))}</p>`);
      para = [];
    }
  };

  while (i < lines.length) {
    const line = lines[i];
    const t = line.trim();

    if (t === '') {
      flushPara();
      i++;
      continue;
    }
    if (/^---+$/.test(t)) {
      flushPara();
      out.push('<hr />');
      i++;
      continue;
    }
    const h = t.match(/^(#{1,4})\s+(.+)$/);
    if (h) {
      flushPara();
      // book chapters render inside an <article>: md ## → h3, ### → h4
      const level = Math.min(h[1].length + 1, 5);
      out.push(`<h${level}>${inline(h[2])}</h${level}>`);
      i++;
      continue;
    }
    if (t.startsWith('|')) {
      flushPara();
      const rows: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(lines[i].trim());
        i++;
      }
      const body = rows.filter((r) => !isTableSep(r));
      if (body.length >= 1) {
        const header = splitRow(body[0]);
        const cls = opts.tableClass ? ` class="${opts.tableClass}"` : '';
        const thead = `<thead><tr>${header.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead>`;
        const trs = body
          .slice(1)
          .map(
            (r) =>
              `<tr>${splitRow(r)
                .map((c, ci) => `<td data-label="${esc(header[ci] ?? '')}">${inline(c)}</td>`)
                .join('')}</tr>`,
          )
          .join('');
        out.push(`<div class="of-tablewrap"><table${cls}>${thead}<tbody>${trs}</tbody></table></div>`);
      }
      continue;
    }
    if (/^- /.test(t)) {
      flushPara();
      const items: string[] = [];
      while (i < lines.length && /^- /.test(lines[i].trim())) {
        items.push(`<li>${inline(lines[i].trim().slice(2))}</li>`);
        i++;
      }
      out.push(`<ul>${items.join('')}</ul>`);
      continue;
    }
    if (/^\d+\.\s/.test(t)) {
      flushPara();
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        items.push(`<li>${inline(lines[i].trim().replace(/^\d+\.\s/, ''))}</li>`);
        i++;
      }
      out.push(`<ol>${items.join('')}</ol>`);
      continue;
    }
    para.push(t);
    i++;
  }
  flushPara();
  return out.join('\n');
}

const KEEP_LOWER = new Set(['of', 'the', 'and', 'a', 'an', 'for', 'to', 'in', 'on', 'what']);
const ACRONYMS = new Set(['AI', 'ZK', 'XP', 'FBID', 'B2B', 'POS']);

/** Title-case only the ALL-CAPS words of a part heading; leave as-authored
 *  mixed/lowercase spans (e.g. the "(working workflow)" parentheticals) alone. */
function toTitle(caps: string): string {
  return caps
    .split(/(\s+)/)
    .map((tok, i) => {
      if (/^\s+$/.test(tok) || tok !== tok.toUpperCase() || !/[A-Z]/.test(tok)) return tok;
      return tok.replace(/[A-Z]+/g, (run) => {
        if (ACRONYMS.has(run)) return run;
        const lower = run.toLowerCase();
        if (i > 0 && KEEP_LOWER.has(lower)) return lower;
        return lower.charAt(0).toUpperCase() + lower.slice(1);
      });
    })
    .join('');
}

/** Extract product nodes from a sub-chapter body (tables, or bold-led list items). */
function extractProducts(body: string): Product[] {
  const products: Product[] = [];
  const lines = body.split('\n');
  let inTable = false;
  for (const raw of lines) {
    const t = raw.trim();
    if (t.startsWith('|')) {
      if (isTableSep(t)) continue;
      const cells = splitRow(t);
      if (!inTable) {
        inTable = true; // header row
        continue;
      }
      if (cells.length >= 3) {
        products.push({ name: plain(cells[0]), what: plain(cells[1]), status: plain(cells[2]) });
      }
      continue;
    }
    inTable = false;
    const li = t.match(/^- \*\*(.+?)\*\*\s*[—-]\s*(.+)$/);
    if (li) products.push({ name: plain(li[1]), what: plain(li[2]), status: 'Anchor' });
  }
  return products;
}

export function loadBook(): Book {
  const candidates = [
    path.join(process.cwd(), 'content', 'openflow-book.md'),
    path.join(process.cwd(), 'apps', 'claudia', 'content', 'openflow-book.md'),
  ];
  const file = candidates.find((p) => fs.existsSync(p));
  if (!file) throw new Error('openflow-book.md not found — expected in apps/claudia/content/');
  const src = fs.readFileSync(file, 'utf8');

  const chunks = src.split(/\n(?=# PART )/);
  const intro = chunks[0];
  const introTitle = intro.match(/^# (.+)$/m)?.[1] ?? 'FlowBond — Open Book';
  const introSub = intro.match(/^## (.+)$/m)?.[1] ?? '';
  const introNote = intro.match(/^\*(.+)\*$/m)?.[1] ?? '';

  const chapters: Chapter[] = [];
  for (const chunk of chunks.slice(1)) {
    const headMatch = chunk.match(/^# PART ([IVX]+)\s+—\s+(.+)$/m);
    if (!headMatch) continue;
    const roman = headMatch[1];
    const num = ROMAN[roman];
    if (!num) continue;
    const title = toTitle(headMatch[2].trim());
    let body = chunk.slice(chunk.indexOf('\n') + 1);
    // trim the trailing hr separator between parts (keep interior hrs)
    body = body.replace(/\n---+\s*$/, '\n');

    let subs: SubChapter[] | null = null;
    if (num === 3) {
      const pieces = body.split(/\n(?=## [A-I]\. )/);
      const lead = pieces[0].match(/^## [A-I]\. /m) ? '' : pieces.shift() ?? '';
      subs = pieces.map((piece) => {
        const m = piece.match(/^## ([A-I])\.\s+(.+)$/m);
        const letter = m?.[1] ?? '?';
        const subTitle = plain(m?.[2] ?? '');
        const subBody = piece.slice(piece.indexOf('\n') + 1);
        return {
          letter,
          title: subTitle,
          html: mdToHtml(subBody),
          products: letter === 'I' ? [] : extractProducts(subBody),
        };
      });
      body = lead;
    }

    chapters.push({
      num,
      roman,
      title,
      html: mdToHtml(body, num === 4 ? { tableClass: 'of-energy' } : {}),
      subs,
    });
  }

  chapters.sort((a, b) => a.num - b.num);
  return { title: plain(introTitle), subtitle: plain(introSub), note: plain(introNote), chapters };
}
