'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { toHtml, toMarkdown, countWords, sanitizePaste, figureHtml } from './markdown'
import type { Canon, CanonUnit, Draft, OpenPayload, Progress } from './types'

type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error'

const PROGRESS_LABEL: Record<Progress, string> = {
  seed: 'Semilla',
  drafted: 'Borrador',
  reviewed: 'Revisado',
  final: 'Cerrado',
}

const AUTOSAVE_MS = 1400

export default function Editor({
  supabase,
  payload,
  onSignOut,
}: {
  supabase: SupabaseClient
  payload: OpenPayload
  onSignOut: () => void
}) {
  const canon = payload.canon as Canon
  const me = payload.me!

  const [drafts, setDrafts] = useState<Record<string, Draft>>(payload.drafts ?? {})
  const [notes, setNotes] = useState<Record<string, string>>(payload.notes ?? {})
  const [currentId, setCurrentId] = useState<string>(() => firstWritable(canon))
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [railOpen, setRailOpen] = useState(true)
  const [briefOpen, setBriefOpen] = useState(true)
  const [tab, setTab] = useState<'brief' | 'threads' | 'note'>('brief')
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [toasts, setToasts] = useState<{ id: number; text: string; kind: string }[]>([])
  const [marks, setMarks] = useState({ bold: false, italic: false })

  const writeRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<number | null>(null)
  const noteTimerRef = useRef<number | null>(null)
  const dirtyRef = useRef(false)
  const currentRef = useRef(currentId)

  /* ---------------------------------------------------------- indexes */

  const unitById = useMemo(() => new Map(canon.units.map((u) => [u.id, u])), [canon])
  const partOf = useMemo(() => {
    const m = new Map<string, (typeof canon.parts)[number]>()
    for (const p of canon.parts) for (const id of p.units) m.set(id, p)
    return m
  }, [canon])
  const links = useMemo(() => {
    const m = new Map<string, Set<string>>()
    for (const [a, b] of canon.resonances) {
      if (!m.has(a)) m.set(a, new Set())
      if (!m.has(b)) m.set(b, new Set())
      m.get(a)!.add(b)
      m.get(b)!.add(a)
    }
    return m
  }, [canon])

  const unit = unitById.get(currentId) as CanonUnit
  const book = canon.books.find((b) => b.id === unit?.book)
  const part = partOf.get(currentId)
  const blocked = unit?.status === 'disputed'
  const decision = blocked ? canon.decisions.find((d) => d.id === unit.conflict) : null
  const draft = drafts[currentId]
  const accentVar = unit?.book === 'B1' ? 'brass' : unit?.book === 'B2' ? 'albedo' : 'cinnabar'

  const toast = useCallback((text: string, kind = 'ok') => {
    const id = Date.now() + Math.floor(performance.now())
    setToasts((t) => [...t, { id, text, kind }])
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200)
  }, [])

  /* ------------------------------------------------------------ save */

  const persist = useCallback(
    async (unitId: string, body: string, status?: Progress) => {
      const target = unitById.get(unitId)
      if (!target || target.status === 'disputed') return

      setSaveState('saving')
      const words = countWords(body)
      const { error } = await supabase.rpc('kaiten_save', {
        p_unit_id: unitId,
        p_body: body,
        p_status: status ?? drafts[unitId]?.status ?? 'seed',
        p_words: words,
      })

      if (error) {
        setSaveState('error')
        toast('No se pudo guardar. Tu texto sigue aquí — revisa la conexión.', 'warn')
        return
      }

      dirtyRef.current = false
      setDrafts((d) => ({
        ...d,
        [unitId]: {
          body,
          status: status ?? d[unitId]?.status ?? 'seed',
          words,
          updated_at: new Date().toISOString(),
        },
      }))
      setSaveState('saved')
    },
    [supabase, unitById, drafts, toast],
  )

  const flush = useCallback(async () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (!dirtyRef.current || !writeRef.current) return
    const id = currentRef.current
    const target = unitById.get(id)
    if (!target || target.status === 'disputed') return
    await persist(id, toMarkdown(writeRef.current))
  }, [persist, unitById])

  const scheduleSave = useCallback(() => {
    dirtyRef.current = true
    setSaveState('dirty')
    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => void flush(), AUTOSAVE_MS)
  }, [flush])

  /* ------------------------------------------------- load a unit in */

  useEffect(() => {
    currentRef.current = currentId
    const el = writeRef.current
    if (!el || blocked) return
    const body = drafts[currentId]?.body ?? ''
    // truly empty, so `.write:empty::before` can show the placeholder; the
    // browser inserts its own block on first keystroke and toMarkdown treats
    // a bare <div> as a paragraph
    el.innerHTML = body.trim() ? toHtml(body) : ''
    try { document.execCommand('defaultParagraphSeparator', false, 'p') } catch { /* older engines */ }
    dirtyRef.current = false
    setSaveState('idle')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId, blocked])

  const goTo = useCallback(
    async (id: string) => {
      if (id === currentRef.current) return
      await flush()
      setCurrentId(id)
      setSaveState('idle')
      window.requestAnimationFrame(() => {
        writeRef.current?.parentElement?.scrollTo({ top: 0 })
      })
    },
    [flush],
  )

  /* ------------------------------------------------------- guardrails */

  useEffect(() => {
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey
      if (meta && e.key.toLowerCase() === 's') {
        e.preventDefault()
        void flush()
        toast('Guardado', 'ok')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [flush, toast])

  useEffect(() => {
    const onSel = () => {
      if (typeof document.queryCommandState !== 'function') return
      try {
        setMarks({ bold: document.queryCommandState('bold'), italic: document.queryCommandState('italic') })
      } catch {
        /* selection outside the surface */
      }
    }
    document.addEventListener('selectionchange', onSel)
    return () => document.removeEventListener('selectionchange', onSel)
  }, [])

  /* ------------------------------------------------------------ tools */

  function exec(command: string, value?: string) {
    writeRef.current?.focus()
    document.execCommand(command, false, value)
    scheduleSave()
  }

  function insertFigure() {
    const id = window.prompt(
      'Identificador de la figura.\n\nUsa la forma FIG-<unidad>-<letra>, por ejemplo FIG-' +
        currentId +
        '-A. Steph la dibuja y el motor la coloca sola en el libro y en la imprenta.',
      `FIG-${currentId}-A`,
    )
    if (!id) return
    const caption = window.prompt('¿Qué muestra la figura? (pie de imagen)', '') ?? ''
    writeRef.current?.focus()
    document.execCommand('insertHTML', false, figureHtml(id.trim(), caption.trim()) + '<p><br></p>')
    scheduleSave()
  }

  function onPaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const html = e.clipboardData.getData('text/html')
    const plain = e.clipboardData.getData('text/plain')
    document.execCommand('insertHTML', false, sanitizePaste(html, plain))
    if (/<h1[\s>]/i.test(html)) {
      toast('El título viene del canon, así que bajé ese encabezado a subtítulo.', 'warn')
    }
    scheduleSave()
  }

  async function setStatus(next: Progress) {
    if (!writeRef.current || blocked) return
    await persist(currentId, toMarkdown(writeRef.current), next)
    toast(`Marcado como ${PROGRESS_LABEL[next].toLowerCase()}`, 'ok')
  }

  function onNoteChange(value: string) {
    setNotes((n) => ({ ...n, [currentId]: value }))
    if (noteTimerRef.current) window.clearTimeout(noteTimerRef.current)
    noteTimerRef.current = window.setTimeout(() => {
      void supabase.rpc('kaiten_save_note', { p_unit_id: currentId, p_note: value })
    }, 900)
  }

  /* -------------------------------------------------------- progress */

  const lanes = canon.books.map((b) => {
    const units = canon.units.filter((u) => u.book === b.id)
    const written = units.filter((u) => (drafts[u.id]?.words ?? 0) > 0).length
    const blockedCount = units.filter((u) => u.status === 'disputed').length
    return { book: b, total: units.length, written, blockedCount }
  })

  const words = draft?.words ?? 0
  const resonances = [...(links.get(currentId) ?? [])]
    .map((id) => unitById.get(id))
    .filter(Boolean) as CanonUnit[]
  const voice = canon._pipeline?.voices?.[unit?.book ?? '']
  const threads = (canon._pipeline?.threads ?? []).filter((t) => t.units.includes(currentId))
  const prev = neighbour(canon, unit, -1)
  const next = neighbour(canon, unit, +1)

  return (
    <div
      className="app"
      data-rail={railOpen ? 'open' : 'closed'}
      data-brief={briefOpen ? 'open' : 'closed'}
      data-theme={theme}
      style={{ ['--accent' as string]: `var(--${accentVar})` }}
    >
      {/* ------------------------------------------------------ bar */}
      <header className="bar">
        <button
          className="kbtn kbtn--icon"
          onClick={() => setRailOpen((v) => !v)}
          aria-expanded={railOpen}
          title="Los tres libros"
        >
          ☰
        </button>
        <div className="mark">
          Kaiten<b>books</b>
        </div>
        <div className="sep" />
        <div className="saved" data-state={saveState} aria-live="polite">
          <i />
          {saveState === 'saving'
            ? 'Guardando'
            : saveState === 'saved'
              ? 'Guardado'
              : saveState === 'dirty'
                ? 'Sin guardar'
                : saveState === 'error'
                  ? 'Error al guardar'
                  : 'Al día'}
        </div>
        <div className="spacer" />
        <span className="saved" title="Palabras en este capítulo">
          <b style={{ fontVariantNumeric: 'tabular-nums' }}>{words}</b>&nbsp;palabras
        </span>
        <div className="sep" />
        <button className="kbtn kbtn--icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} title="Claro / oscuro">
          {theme === 'dark' ? '☾' : '☀'}
        </button>
        <button className="kbtn" onClick={() => setBriefOpen((v) => !v)} aria-expanded={briefOpen}>
          Guía
        </button>
        <button className="kbtn" onClick={() => void flush().then(onSignOut)}>
          Salir
        </button>
      </header>

      {/* ----------------------------------------------------- rail */}
      <nav className="rail" aria-label="Los tres libros">
        <div className="rail__overview">
          {lanes.map((l) => (
            <div className="lane" key={l.book.id} data-book={l.book.id}>
              <div className="lane__top">
                <span style={{ color: 'inherit' }}>{l.book.title}</span>
                <span>
                  {l.written}/{l.total}
                </span>
              </div>
              <div className="lane__track">
                <i style={{ width: `${(l.written / Math.max(l.total, 1)) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>

        {canon.books.map((b) => (
          <div key={b.id} style={{ ['--book' as string]: `var(--${b.id === 'B1' ? 'brass' : b.id === 'B2' ? 'albedo' : 'cinnabar'})` }}>
            <div className="rail__book">{b.title}</div>
            {canon.parts
              .filter((p) => p.book === b.id)
              .map((p) => (
                <div key={`${b.id}-${p.n}`}>
                  <div className="rail__part">{p.n === 0 ? p.name : `Parte ${p.n} · ${p.name}`}</div>
                  {p.units.map((id) => {
                    const u = unitById.get(id)
                    if (!u) return null
                    const d = drafts[id]
                    const isBlocked = u.status === 'disputed'
                    return (
                      <button
                        key={id}
                        className="uitem"
                        aria-current={id === currentId}
                        data-locked={isBlocked}
                        onClick={() => void goTo(id)}
                      >
                        <span className="n">{u.label}</span>
                        <span className="t">{u.title}</span>
                        <span
                          className="dot"
                          data-p={isBlocked ? 'locked' : d && d.words > 0 ? d.status : undefined}
                          title={isBlocked ? 'Bloqueado' : d && d.words > 0 ? PROGRESS_LABEL[d.status] : 'Sin abrir'}
                        />
                      </button>
                    )
                  })}
                </div>
              ))}
          </div>
        ))}
      </nav>

      {/* -------------------------------------------------- surface */}
      <main className="surface">
        {!blocked && (
          <div className="tools" role="toolbar" aria-label="Formato">
            <button className="tool tool--b" onClick={() => exec('bold')} aria-pressed={marks.bold} title="Negrita ⌘B">
              B
            </button>
            <button className="tool tool--i" onClick={() => exec('italic')} aria-pressed={marks.italic} title="Cursiva ⌘I">
              I
            </button>
            <div className="sep" />
            <button className="tool tool--label" onClick={() => exec('formatBlock', 'p')} title="Texto normal">
              Texto
            </button>
            <button className="tool tool--label" onClick={() => exec('formatBlock', 'h2')} title="Encabezado de sección">
              Sección
            </button>
            <button className="tool tool--label" onClick={() => exec('formatBlock', 'h3')} title="Encabezado menor">
              Subsección
            </button>
            <div className="sep" />
            <button className="tool tool--label" onClick={() => exec('formatBlock', 'blockquote')} title="Cita destacada">
              Cita
            </button>
            <button className="tool" onClick={() => exec('insertUnorderedList')} title="Lista">
              •
            </button>
            <button className="tool" onClick={() => exec('insertOrderedList')} title="Lista numerada">
              1.
            </button>
            <button className="tool" onClick={() => exec('insertHorizontalRule')} title="Separador">
              —
            </button>
            <div className="sep" />
            <button className="tool tool--label" onClick={insertFigure} title="Referenciar una figura">
              Figura
            </button>
          </div>
        )}

        {/* the canon plate — read-only by construction */}
        <section className="plate" aria-label="Datos del capítulo">
          <div className="plate__eyebrow">
            <span>{book?.title}</span>
            <em>{part ? (part.n === 0 ? part.name : `Parte ${part.n} · ${part.name}`) : ''}</em>
            <em>{unit?.label}</em>
          </div>
          <h1>{unit?.title}</h1>
          {unit?.subtitle && <div className="plate__sub">{unit.subtitle}</div>}
          <div className="plate__from">
            <span>Título y estructura vienen del canon · no se editan aquí</span>
          </div>
        </section>

        {blocked ? (
          <section className="blocked">
            <h2>Bloqueado · {unit.conflict}</h2>
            <p>
              <b>{unit.label} — {unit.title}</b> no se puede escribir todavía. Hay dos juegos de
              nombres para los 13 códigos y no está decidido cuál es el verdadero. Escribir
              ahora significa reescribir después.
            </p>
            {decision && (
              <>
                <p>
                  <q>{decision.q}</q>
                </p>
                <p style={{ opacity: 0.75 }}>Detiene: {decision.blocks}</p>
              </>
            )}
            <p>
              En cuanto cierres esa decisión, los trece códigos se abren solos. Mientras tanto
              puedes dejar una nota en la pestaña <b>Nota</b>.
            </p>
          </section>
        ) : (
          <div
            ref={writeRef}
            className="write"
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-multiline="true"
            aria-label={`Texto de ${unit?.label}`}
            spellCheck
            data-register={unit?.book === 'B2' && unit.n !== 0 ? 'transmission' : 'prose'}
            data-placeholder="Empieza por una escena concreta…"
            onInput={scheduleSave}
            onBlur={() => void flush()}
            onPaste={onPaste}
          />
        )}
      </main>

      {/* ---------------------------------------------------- brief */}
      <aside className="brief" aria-label="Guía del capítulo">
        <div className="brief__tabs" role="tablist">
          {(['brief', 'threads', 'note'] as const).map((t) => (
            <button
              key={t}
              className="brief__tab"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
            >
              {t === 'brief' ? 'Guía' : t === 'threads' ? 'Hilos' : 'Nota'}
            </button>
          ))}
        </div>

        <div className="pane" data-on={tab === 'brief'} role="tabpanel">
          <h4>Dónde estás</h4>
          <p>
            {prev ? (
              <>
                Viene después de <strong>{prev.label} — {prev.title}</strong>.{' '}
              </>
            ) : (
              <>Abre el libro. </>
            )}
            {next ? (
              <>
                Le sigue <strong>{next.label} — {next.title}</strong>.
              </>
            ) : (
              <>Cierra el libro.</>
            )}
          </p>

          {voice && (
            <>
              <h4>La voz de este libro</h4>
              <p>{voice.text}</p>
            </>
          )}

          <h4>Estado</h4>
          <div className="statusrow">
            {(['seed', 'drafted', 'reviewed', 'final'] as Progress[]).map((s) => (
              <button
                key={s}
                className="kbtn"
                aria-pressed={(draft?.status ?? 'seed') === s}
                disabled={blocked}
                onClick={() => void setStatus(s)}
              >
                {PROGRESS_LABEL[s]}
              </button>
            ))}
          </div>
          <p style={{ fontSize: '0.8rem' }}>
            {draft?.updated_at
              ? `Última vez guardado: ${new Date(draft.updated_at).toLocaleString('es-MX')}`
              : 'Todavía no has escrito en este capítulo.'}
          </p>

          <h4>Reglas que sostienen los tres libros</h4>
          <ul>
            <li>El título viene del canon. No lo repitas dentro del texto.</li>
            <li>
              No inventes estructura nueva —niveles, fases, códigos—. Si aparece algo, déjalo en{' '}
              <strong>Nota</strong> y se registra como decisión.
            </li>
            <li>
              La fórmula <code>PA = CM × F / R / C</code> se puede mencionar, pero se explica
              en el capítulo VIII del Libro 3.
            </li>
          </ul>
        </div>

        <div className="pane" data-on={tab === 'threads'} role="tabpanel">
          <h4>Resonancias</h4>
          <p>
            Lo que este capítulo toca en los otros dos libros. Basta una frase que lo insinúe —
            no lo repitas.
          </p>
          {resonances.length ? (
            resonances.map((r) => (
              <button key={r.id} className="thread" data-b={r.book} onClick={() => void goTo(r.id)}>
                <span className="n">
                  {r.id} · {canon.books.find((b) => b.id === r.book)?.title}
                </span>
                <span className="t">{r.title}</span>
              </button>
            ))
          ) : (
            <p>Todavía no hay hilos registrados para este capítulo.</p>
          )}

          {threads.length > 0 && (
            <>
              <h4>Hilos donde vive</h4>
              {threads.map((t) => (
                <p key={t.name}>
                  <strong>{t.name}</strong> — {t.units.join(' · ')}
                </p>
              ))}
            </>
          )}
        </div>

        <div className="pane" data-on={tab === 'note'} role="tabpanel">
          <h4>Nota para Steph</h4>
          <p>
            Lo estructural no se arregla dentro de un capítulo. Si algo no cuadra —un nombre,
            un orden, una decisión—, déjalo aquí y se registra donde debe registrarse.
          </p>
          <textarea
            className="note"
            value={notes[currentId] ?? ''}
            onChange={(e) => onNoteChange(e.target.value)}
            placeholder="Lo que notaste mientras escribías…"
          />
        </div>
      </aside>

      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div className="toast" key={t.id} data-kind={t.kind}>
            {t.text}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function firstWritable(canon: Canon): string {
  const flagged = canon.units.find((u) => u.flag === 'next_writing_focus' && u.status !== 'disputed')
  if (flagged) return flagged.id
  const open = canon.units.find((u) => u.status !== 'disputed')
  return open?.id ?? canon.units[0]?.id ?? ''
}

function neighbour(canon: Canon, unit: CanonUnit | undefined, delta: number): CanonUnit | undefined {
  if (!unit) return undefined
  const inBook = canon.units.filter((u) => u.book === unit.book).sort((a, b) => a.n - b.n)
  const i = inBook.findIndex((u) => u.id === unit.id)
  return inBook[i + delta]
}
