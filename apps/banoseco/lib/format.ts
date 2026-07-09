export const fmt = (n: number) => (n ?? 0).toLocaleString('es-MX');
export const fmtMxn = (n: number) => '$' + fmt(Math.round(n ?? 0));
