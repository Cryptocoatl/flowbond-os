/**
 * markdown.ts — the exact subset of markdown the trilogy engine renders.
 *
 * Whatever Juan Carlos types has to survive the trip to `manuscript/*.md`,
 * through the engine's renderer, and into both the reader and the printed
 * interior. So this file supports that subset and nothing else:
 *
 *   ## h2 · ### h3 · > quote · - list · 1. list · --- rule
 *   **bold** · *italic* · ![caption](figure:FIG-ID)
 *
 * There is deliberately no H1. Titles come from canon; a manuscript that
 * carries its own title fails the build (validator R2). The toolbar has no
 * button for it and `toMarkdown` demotes any H1 that arrives by paste.
 */

const ESC = /[&<>]/g;
const escHtml = (s: string) =>
  s.replace(ESC, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c] as string);

/* ------------------------------------------------------------------ *
 * markdown → HTML (for loading a draft into the editable surface)
 * ------------------------------------------------------------------ */

function inlineToHtml(text: string): string {
  let s = escHtml(text);
  // figures first: they are a whole-line construct and must not be split by emphasis
  s = s.replace(/!\[([^\]]*)\]\(figure:([^)]+)\)/g, (_m, cap: string, id: string) =>
    figureHtml(id.trim(), cap.trim()),
  );
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  s = s.replace(/_([^_\n]+)_/g, '<em>$1</em>');
  return s;
}

export function figureHtml(id: string, caption: string): string {
  return (
    `<div class="figref" data-fig="${escHtml(id)}" contenteditable="false">` +
    `<b>${escHtml(id)}</b><span>${escHtml(caption) || 'sin pie de imagen'}</span></div>`
  );
}

export function toHtml(md: string): string {
  const lines = (md || '').replace(/\r\n?/g, '\n').split('\n');
  const out: string[] = [];
  let para: string[] = [];
  let list: { type: 'ul' | 'ol'; items: string[] } | null = null;
  let quote: string[] = [];

  const flushPara = () => {
    if (para.length) {
      out.push(`<p>${inlineToHtml(para.join(' '))}</p>`);
      para = [];
    }
  };
  const flushList = () => {
    if (list) {
      out.push(`<${list.type}>${list.items.map((i) => `<li>${inlineToHtml(i)}</li>`).join('')}</${list.type}>`);
      list = null;
    }
  };
  const flushQuote = () => {
    if (quote.length) {
      out.push(`<blockquote>${inlineToHtml(quote.join(' '))}</blockquote>`);
      quote = [];
    }
  };
  const flushAll = () => {
    flushPara();
    flushList();
    flushQuote();
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (!line.trim()) {
      flushAll();
      continue;
    }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      flushAll();
      out.push('<hr>');
      continue;
    }
    // a figure on its own line is a block, not a paragraph
    const fig = /^!\[([^\]]*)\]\(figure:([^)]+)\)\s*$/.exec(line.trim());
    if (fig) {
      flushAll();
      out.push(figureHtml(fig[2].trim(), fig[1].trim()));
      continue;
    }
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      flushAll();
      // canon owns H1 — anything that deep gets pushed down a level
      const level = Math.min(Math.max(h[1].length, 2), 3);
      out.push(`<h${level}>${inlineToHtml(h[2])}</h${level}>`);
      continue;
    }
    const q = /^>\s?(.*)$/.exec(line);
    if (q) {
      flushPara();
      flushList();
      quote.push(q[1]);
      continue;
    }
    const ul = /^[-*+]\s+(.*)$/.exec(line);
    if (ul) {
      flushPara();
      flushQuote();
      if (!list || list.type !== 'ul') {
        flushList();
        list = { type: 'ul', items: [] };
      }
      list.items.push(ul[1]);
      continue;
    }
    const ol = /^\d+[.)]\s+(.*)$/.exec(line);
    if (ol) {
      flushPara();
      flushQuote();
      if (!list || list.type !== 'ol') {
        flushList();
        list = { type: 'ol', items: [] };
      }
      list.items.push(ol[1]);
      continue;
    }
    flushList();
    flushQuote();
    para.push(line.trim());
  }
  flushAll();

  return out.join('\n') || '<p><br></p>';
}

/* ------------------------------------------------------------------ *
 * HTML → markdown (for saving what was typed)
 * ------------------------------------------------------------------ */

function inlineToMd(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return (node.textContent || '').replace(/([*_])/g, '\\$1');
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return '';

  const el = node as HTMLElement;
  const kids = Array.from(el.childNodes).map(inlineToMd).join('');

  switch (el.tagName) {
    case 'BR':
      return '\n';
    case 'STRONG':
    case 'B':
      return kids.trim() ? `**${kids}**` : '';
    case 'EM':
    case 'I':
      return kids.trim() ? `*${kids}*` : '';
    case 'DIV':
      if (el.classList.contains('figref')) {
        const id = el.dataset.fig || '';
        const cap = el.querySelector('span')?.textContent?.trim() ?? '';
        return `![${cap === 'sin pie de imagen' ? '' : cap}](figure:${id})`;
      }
      return kids;
    default:
      return kids;
  }
}

export function toMarkdown(root: HTMLElement): string {
  const blocks: string[] = [];

  for (const child of Array.from(root.children)) {
    const el = child as HTMLElement;
    const tag = el.tagName;

    if (tag === 'HR') {
      blocks.push('---');
      continue;
    }
    if (tag === 'DIV' && el.classList.contains('figref')) {
      blocks.push(inlineToMd(el));
      continue;
    }
    if (tag === 'UL' || tag === 'OL') {
      const items = Array.from(el.querySelectorAll(':scope > li')).map((li, i) => {
        const body = inlineToMd(li).trim();
        return tag === 'UL' ? `- ${body}` : `${i + 1}. ${body}`;
      });
      if (items.length) blocks.push(items.join('\n'));
      continue;
    }
    if (tag === 'BLOCKQUOTE') {
      const body = inlineToMd(el).trim();
      if (body) blocks.push(body.split('\n').map((l) => `> ${l}`).join('\n'));
      continue;
    }
    if (/^H[1-6]$/.test(tag)) {
      const body = inlineToMd(el).trim();
      if (!body) continue;
      // H1 is canon's. Demote anything that claims it.
      const level = tag === 'H1' ? 2 : Math.min(Number(tag[1]), 3);
      blocks.push(`${'#'.repeat(level)} ${body}`);
      continue;
    }

    const body = inlineToMd(el).trim();
    if (body) blocks.push(body);
  }

  return blocks.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** Words, counted the way the engine counts them, so the two never disagree. */
export function countWords(md: string): number {
  const t = (md || '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/!\[[^\]]*\]\(figure:[^)]+\)/g, ' ')
    .replace(/[#*_>|`\-]/g, ' ');
  const m = t.match(/[\p{L}\p{N}'’]+/gu);
  return m ? m.length : 0;
}

/** Paste arrives as arbitrary HTML from anywhere. Take the structure, drop the rest. */
export function sanitizePaste(html: string, plain: string): string {
  if (!html) return toHtml(plain);
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script, style, meta, link, img, iframe, object, embed').forEach((n) => n.remove());
  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return escHtml(node.textContent || '');
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const el = node as HTMLElement;
    const kids = Array.from(el.childNodes).map(walk).join('');
    switch (el.tagName) {
      case 'P': case 'DIV': return kids.trim() ? `<p>${kids}</p>` : '';
      case 'H1': case 'H2': return kids.trim() ? `<h2>${kids}</h2>` : '';
      case 'H3': case 'H4': case 'H5': case 'H6': return kids.trim() ? `<h3>${kids}</h3>` : '';
      case 'BLOCKQUOTE': return kids.trim() ? `<blockquote>${kids}</blockquote>` : '';
      case 'UL': return `<ul>${kids}</ul>`;
      case 'OL': return `<ol>${kids}</ol>`;
      case 'LI': return `<li>${kids}</li>`;
      case 'STRONG': case 'B': return `<strong>${kids}</strong>`;
      case 'EM': case 'I': return `<em>${kids}</em>`;
      case 'BR': return '<br>';
      case 'HR': return '<hr>';
      default: return kids;
    }
  };
  const out = Array.from(doc.body.childNodes).map(walk).join('');
  return out.trim() || toHtml(plain);
}
