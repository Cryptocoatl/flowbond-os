/** Parse `_emphasis_` into runs so the hero can gild one phrase. */
export function parseEmphasis(s: string): { text: string; em: boolean }[] {
  return s
    .split(/(_[^_]+_)/g)
    .filter(Boolean)
    .map((part) =>
      part.startsWith('_') && part.endsWith('_') && part.length > 2
        ? { text: part.slice(1, -1), em: true }
        : { text: part, em: false },
    );
}
