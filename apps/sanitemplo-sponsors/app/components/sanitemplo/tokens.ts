import { TOKENS } from '@flowbond/sanitemplo-core';

/**
 * Los colores salen 1:1 de TOKENS (config.ts) — ningún componente escribe un
 * hex. Las fuentes se cargan con next/font en el layout; aquí solo se mapean
 * sus CSS variables a los nombres que TOKENS.font declara (Marcellus / Karla /
 * JetBrains Mono). Todo el árbol referencia var(--st-*).
 */
export function tokenVars(font: { display: string; body: string; mono: string }): Record<string, string> {
  const c = TOKENS.color;
  return {
    '--st-tinta': c.tinta,
    '--st-tinta2': c.tinta2,
    '--st-tinta3': c.tinta3,
    '--st-linea': c.linea,
    '--st-linea2': c.linea2,
    '--st-oro': c.oro,
    '--st-oro2': c.oro2,
    '--st-oro-dim': c.oroDim,
    '--st-loto': c.loto,
    '--st-jade': c.jade,
    '--st-cal': c.cal,
    '--st-cal-dim': c.calDim,
    '--st-font-display': `${font.display}, "Marcellus", serif`,
    '--st-font-body': `${font.body}, "Karla", sans-serif`,
    '--st-font-mono': `${font.mono}, "JetBrains Mono", monospace`,
    '--st-entry-ms': `${TOKENS.motion.entryMs}ms`,
    '--st-ease': TOKENS.motion.easeSacred,
  };
}
