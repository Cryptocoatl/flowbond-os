/**
 * The FlowRoom document room runtime.
 *
 * The documents are hand-written HTML and stay that way — this file never
 * rewrites their prose. It reads the finished page, decides which elements are
 * *blocks* a person could reasonably have an opinion about, and hangs the
 * reacting machinery off them.
 *
 * Two consequences worth keeping:
 *
 *  · Documents 01 and 02 can be dropped in later with no code change. Anything
 *    with the room's stylesheet and this script becomes annotatable.
 *
 *  · A block's identity is a hash of its own words, not its position. Reorder a
 *    document and the notes stay attached; rewrite a paragraph and its notes let
 *    go of it, which is the honest outcome — an "Agreed" belongs to the sentence
 *    that was agreed to, not to the third paragraph of section four forever.
 *
 * Role is decided by the server and applied here by adding classes to <html>.
 * A viewer's page never builds a single control, so there is nothing to hide.
 */
(function () {
  'use strict';

  const MARKS = [
    { key: 'agreed', label: 'Agreed', c: 'var(--m-agreed)' },
    { key: 'question', label: 'Question', c: 'var(--m-question)' },
    { key: 'already_have', label: 'We have this', c: 'var(--m-already_have)' },
    { key: 'different_timeline', label: 'Different timing', c: 'var(--m-different_timeline)' },
    { key: 'not_this', label: 'Not this', c: 'var(--m-not_this)' },
  ];
  const MARK_BY = Object.fromEntries(MARKS.map((m) => [m.key, m]));

  const root = document.documentElement;
  const docId = document.body.dataset.doc || null;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** notes for this document, keyed by block. */
  const byBlock = new Map();
  /** the blocks we found, in document order. */
  const blocks = [];
  let me = null;

  /* ================================================================
     Small helpers
     ================================================================ */

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  const norm = (s) => s.replace(/\s+/g, ' ').trim().slice(0, 400);

  /** FNV-1a, base36. Short enough to read in a URL, stable across sessions. */
  function hash(s) {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return h.toString(36);
  }

  const api = (path, body) =>
    fetch(path, {
      method: body ? 'POST' : 'GET',
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
      .then((r) => r.json())
      .catch(() => ({ ok: false }));

  /* ================================================================
     1 · Reading choreography — runs for everyone, signed in or not
     ================================================================ */

  function choreography() {
    const bar = el('div', 'readbar');
    document.body.appendChild(bar);

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const h = document.documentElement.scrollHeight - innerHeight;
        bar.style.setProperty('--read', h > 0 ? Math.min(1, scrollY / h).toFixed(4) : '1');
        const moon = document.querySelector('.moon');
        if (moon && !reduced) moon.style.transform = `translate3d(0, ${scrollY * 0.14}px, 0)`;
        ticking = false;
      });
    };
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    if (reduced) return;
    root.classList.add('reveal-on');

    // Anything structural that has not already been marked by hand.
    const targets = document.querySelectorAll(
      'h1, h2, h3, .sub, .intro, .lede, .arc, .node, .doc, .ent, .lay, .flag, .note, ' +
        '.test, .tl, .good, .sig, .tablewrap, .stack, .hats, .close, section > p',
    );
    let seen = 0;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          // Stagger only within a burst, so a long scroll never queues a
          // visible delay on something the reader is already looking at.
          e.target.style.setProperty('--d', `${Math.min(seen++ % 6, 5) * 55}ms`);
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.06 },
    );
    targets.forEach((t) => {
      if (t.hasAttribute('data-reveal')) return;
      t.setAttribute('data-reveal', '');
      io.observe(t);
    });

    // A reveal that never fires is a blank page. Whatever the observer has not
    // reached in a second and a half gets shown anyway — the animation is worth
    // having, and worth nothing at the price of hiding the document.
    setTimeout(() => {
      targets.forEach((t) => t.classList.add('is-in'));
    }, 1500);
  }

  /* ================================================================
     2 · Finding the blocks
     ================================================================ */

  const CANDIDATES = [
    'h2',
    '.ent',
    '.lay',
    '.flag',
    '.note',
    '.test',
    '.tl',
    '.good',
    '.sig',
    'blockquote',
    '.intro',
    '.lede',
    '.tablewrap',
    'li',
    'p',
  ].join(',');

  // `.invlist` is the stack inventory in doc 05: forty short entries that are a
  // reference table, not an argument. Annotating each one individually would
  // bury the rails that matter under a wall of them.
  const SKIP =
    '.docmeta, .kicker, .hat, .hats, .close, .rail, .thread, .stamps, .drawer, .whoami, .invlist';

  function findBlocks() {
    const all = Array.from(document.querySelectorAll(CANDIDATES)).filter((n) => {
      if (n.closest(SKIP)) return false;
      if (norm(n.innerText || '').length < 25) return false;
      return true;
    });

    // Outer wins: a paragraph inside a callout is part of the callout, not a
    // block of its own. Without this, rails nest and the page grows fur.
    const set = new Set(all);
    const outer = all.filter((n) => {
      let p = n.parentElement;
      while (p) {
        if (set.has(p)) return false;
        p = p.parentElement;
      }
      return true;
    });

    outer.forEach((n) => {
      n.dataset.block = `${docId}:${hash(norm(n.innerText))}`;
      blocks.push(n);
    });
  }

  /* ================================================================
     3 · Painting what the room already thinks
     ================================================================ */

  function paint(node) {
    const key = node.dataset.block;
    const notes = byBlock.get(key) || [];

    node.querySelector(':scope > .stamps')?.remove();
    node.classList.remove('marked');
    node.style.removeProperty('--mc');

    const marks = notes.filter((n) => n.mark);
    const said = notes.filter((n) => n.body);
    if (!marks.length && !said.length) return;

    const stamps = el('div', 'stamps');

    marks.forEach((n) => {
      const m = MARK_BY[n.mark];
      if (!m) return;
      const s = el('span', 'stamp');
      s.style.setProperty('--c', m.c);
      s.appendChild(el('i'));
      s.appendChild(el('span', null, `${m.label} · ${n.author}`));
      stamps.appendChild(s);
    });

    if (marks.length) {
      node.classList.add('marked');
      node.style.setProperty('--mc', MARK_BY[marks[marks.length - 1].mark].c);
    }

    if (said.length) {
      const t = el('button', 'stamp thread');
      t.type = 'button';
      t.style.setProperty('--c', 'var(--violet)');
      t.appendChild(el('i'));
      t.appendChild(
        el('span', null, said.length === 1 ? '1 note' : `${said.length} notes`),
      );
      t.addEventListener('click', () => toggleThread(node));
      stamps.appendChild(t);
    }

    node.appendChild(stamps);
  }

  const repaint = () => blocks.forEach(paint);

  /* ================================================================
     4 · The rail
     ================================================================ */

  function rail(node) {
    const r = el('div', 'rail');

    if (me.can.mark) {
      MARKS.forEach((m) => {
        const b = el('button');
        b.type = 'button';
        b.title = m.label;
        b.setAttribute('aria-label', m.label);
        b.style.setProperty('--c', m.c);
        b.dataset.mark = m.key;
        b.addEventListener('click', (e) => {
          e.stopPropagation();
          setMark(node, m.key);
        });
        r.appendChild(b);
      });
      if (me.can.comment) r.appendChild(el('div', 'sep'));
    }

    if (me.can.comment) {
      const say = el('button', 'rail-say', 'Say something');
      say.type = 'button';
      say.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleThread(node, true);
      });
      r.appendChild(say);
    }

    node.appendChild(r);
    syncRail(node);
  }

  /** Show which mark *you* left, not the room's aggregate. */
  function syncRail(node) {
    const mine = (byBlock.get(node.dataset.block) || []).find(
      (n) => n.mark && n.author === me.name,
    );
    node.querySelectorAll(':scope > .rail button[data-mark]').forEach((b) => {
      b.setAttribute('aria-pressed', String(Boolean(mine) && mine.mark === b.dataset.mark));
    });
  }

  async function setMark(node, mark) {
    const key = node.dataset.block;
    const notes = byBlock.get(key) || [];
    const mine = notes.find((n) => n.mark && n.author === me.name);
    const next = mine && mine.mark === mark ? null : mark;

    // Optimistic: the click should feel like a decision, not a request.
    const without = notes.filter((n) => !(n.mark && n.author === me.name));
    if (next) without.push({ block_key: key, author: me.name, mark: next, body: null });
    byBlock.set(key, without);
    paint(node);
    syncRail(node);
    tally();

    const res = await api('/api/notes', {
      token: me.token,
      name: me.name,
      blockKey: key,
      mark: next,
    });
    if (!res.ok) load(); // the server is the truth; put it back the way it is.
  }

  /* ================================================================
     5 · Threads
     ================================================================ */

  function toggleThread(node, focus) {
    const open = node.querySelector(':scope > .thread');
    if (open) {
      open.remove();
      node.classList.remove('is-open');
      return;
    }

    const t = el('div', 'thread');
    const notes = (byBlock.get(node.dataset.block) || []).filter((n) => n.body);

    notes.forEach((n) => {
      const m = el('p', 'msg');
      m.appendChild(el('b', null, n.author));
      m.appendChild(el('span', null, n.body));
      t.appendChild(m);
    });

    if (me.can.comment) {
      const ta = el('textarea');
      ta.placeholder = 'Agree, disagree, ask, or say what you already know…';
      ta.maxLength = 4000;
      const go = el('div', 'thread-go');
      const send = el('button', null, 'Leave it on the record');
      send.type = 'button';
      const hint = el('span', 'hint', 'Everyone in the room sees this');
      go.appendChild(send);
      go.appendChild(hint);
      t.appendChild(ta);
      t.appendChild(go);

      const submit = async () => {
        const body = ta.value.trim();
        if (!body) return;
        send.disabled = true;
        const res = await api('/api/notes', {
          token: me.token,
          name: me.name,
          blockKey: node.dataset.block,
          body,
        });
        send.disabled = false;
        if (!res.ok) {
          hint.textContent = 'That did not save. Try once more.';
          return;
        }
        ta.value = '';
        await load();
        node.classList.remove('is-open');
        node.querySelector(':scope > .thread')?.remove();
        toggleThread(node);
      };

      send.addEventListener('click', submit);
      ta.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit();
      });
      if (focus) setTimeout(() => ta.focus(), 30);
    } else if (!notes.length) {
      t.appendChild(el('p', 'msg', 'No notes on this yet.'));
    }

    node.classList.add('is-open');
    node.appendChild(t);
  }

  /* ================================================================
     6 · Who you are, and the tally drawer
     ================================================================ */

  function whoami() {
    const w = el('div', 'whoami');
    w.appendChild(el('span', 'dot'));

    const role =
      me.role === 'owner'
        ? 'Owner'
        : me.role === 'editor'
          ? 'Editor'
          : me.role === 'commenter'
            ? 'Commenter'
            : 'Reading';
    w.appendChild(el('span', null, `${me.name} · ${role}`));

    if (me.role === 'owner') {
      const share = el('a', null, 'Share');
      share.href = '/docs/share';
      w.appendChild(share);
    }

    const out = el('button', null, 'Leave');
    out.type = 'button';
    out.addEventListener('click', async () => {
      await api('/docs/out', {});
      location.href = '/docs/';
    });
    w.appendChild(out);

    document.body.appendChild(w);
  }

  let drawer;

  function tally() {
    if (!docId) return;
    const all = [...byBlock.values()].flat();
    const counts = {};
    all.forEach((n) => {
      if (n.mark) counts[n.mark] = (counts[n.mark] || 0) + 1;
    });
    const said = all.filter((n) => n.body).length;

    let pill = document.querySelector('.tally');
    if (!pill) {
      pill = el('button', 'tally');
      pill.type = 'button';
      pill.addEventListener('click', () => openDrawer());
      document.body.appendChild(pill);
    }
    pill.textContent = '';

    const bits = MARKS.filter((m) => counts[m.key]);
    if (!bits.length && !said) {
      pill.appendChild(el('span', null, 'Nothing marked yet'));
      return;
    }
    bits.forEach((m) => {
      const i = el('i');
      i.style.setProperty('--c', m.c);
      pill.appendChild(i);
      pill.appendChild(el('span', null, String(counts[m.key])));
    });
    if (said) pill.appendChild(el('span', null, `· ${said} note${said === 1 ? '' : 's'}`));
  }

  function openDrawer() {
    if (!drawer) {
      drawer = el('div', 'drawer');
      const head = el('header');
      head.appendChild(el('h2', null, 'Everything the room has said'));
      const x = el('button', 'x', '×');
      x.type = 'button';
      x.setAttribute('aria-label', 'Close');
      x.addEventListener('click', () => drawer.classList.remove('open'));
      head.appendChild(x);
      drawer.appendChild(head);
      drawer.appendChild(el('div', 'body'));
      document.body.appendChild(drawer);
      addEventListener('keydown', (e) => {
        if (e.key === 'Escape') drawer.classList.remove('open');
      });
    }

    const body = drawer.querySelector('.body');
    body.textContent = '';

    let n = 0;
    blocks.forEach((node) => {
      (byBlock.get(node.dataset.block) || []).forEach((note) => {
        n++;
        const entry = el('button', 'entry');
        entry.type = 'button';

        const top = el('div', 'entry-top');
        const m = note.mark ? MARK_BY[note.mark] : null;
        const i = el('i');
        i.style.setProperty('--c', m ? m.c : 'var(--violet)');
        top.appendChild(i);
        top.appendChild(el('span', null, `${m ? m.label : 'Note'} · ${note.author}`));
        entry.appendChild(top);

        if (note.body) entry.appendChild(el('p', 'entry-q', note.body));
        entry.appendChild(el('p', 'entry-src', norm(node.innerText).slice(0, 150)));

        entry.addEventListener('click', () => {
          drawer.classList.remove('open');
          node.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
          node.classList.remove('flash');
          void node.offsetWidth;
          node.classList.add('flash');
        });
        body.appendChild(entry);
      });
    });

    if (!n) {
      body.appendChild(
        el(
          'p',
          'empty',
          'Nothing yet. Hover any paragraph and leave a mark — agreed, a question, ' +
            'or “we already have this”. It shows up here, and Steph sees it.',
        ),
      );
    }

    drawer.classList.add('open');
  }

  /* ================================================================
     7 · Loading
     ================================================================ */

  async function load() {
    const res = await api('/api/notes');
    byBlock.clear();
    (res.notes || []).forEach((n) => {
      if (docId && !String(n.block_key).startsWith(`${docId}:`)) return;
      const list = byBlock.get(n.block_key) || [];
      list.push(n);
      byBlock.set(n.block_key, list);
    });
    repaint();
    blocks.forEach((b) => {
      if (b.querySelector(':scope > .rail')) syncRail(b);
    });
    tally();
  }

  /* ================================================================
     8 · The hub — dim what this key does not open
     ================================================================ */

  function hub() {
    document.querySelectorAll('[data-docid]').forEach((card) => {
      const id = card.dataset.docid;
      const allowed = !me.docs || me.docs.includes(id);
      const pending = card.hasAttribute('data-pending');
      if (!allowed && !pending) card.setAttribute('data-locked', '');
    });

    // The owner's desk exists in the markup for everyone and is revealed for
    // one person. It is a link to a page the server already refuses to serve
    // to anyone else, so hiding it is courtesy rather than security.
    if (me.role === 'owner') {
      document.querySelectorAll('[data-owner-only]').forEach((n) => n.removeAttribute('hidden'));
    }
  }

  /* ================================================================
     Boot
     ================================================================ */

  choreography();

  api('/docs/me').then((res) => {
    if (!res.ok) return;

    me = {
      name: res.name || 'Someone',
      role: res.role,
      docs: res.docs,
      token: res.token,
      can: {
        mark: res.role === 'owner' || res.role === 'editor',
        comment: res.role !== 'viewer',
      },
    };

    whoami();
    hub();

    // A viewer gets the document and the choreography, and stops here. No
    // rails are built, so the page has no controls to notice.
    if (!docId || (!me.can.mark && !me.can.comment)) return;

    if (me.can.mark) root.classList.add('can-mark');
    if (me.can.comment) root.classList.add('can-comment');

    findBlocks();
    blocks.forEach(rail);
    load();
    setInterval(load, 25000);
  });
})();
