import type { Iniciativa, Evento, Servicio } from './types';

/**
 * Placeholder content — the exact copy from the reference `index.html`.
 *
 * TODO(data): replace these literals with live reads from the `reciprociudad`
 * schema once the migration in `supabase/migrations/0001_reciprociudad.sql` is
 * applied. The typed RPC stubs in `lib/reciprociudad.ts` already match these
 * shapes, so the swap is: `const iniciativas = await getIniciativas()`.
 * Until then the page renders these constants (no fabricated live data).
 */

export const INICIATIVAS: Iniciativa[] = [
  {
    id: 'placeholder-1',
    kind: 'tianguis',
    k: 'Tianguis',
    title: 'Mercadito de barrio',
    description: 'Cambia lo que ya no usas por lo que necesitas.',
    slot: 1,
    fbid: null,
  },
  {
    id: 'placeholder-2',
    kind: 'chinampa',
    k: 'Chinampa',
    title: 'Huertos urbanos',
    description: 'Azoteas y patios que vuelven a dar comida.',
    slot: 2,
    fbid: null,
  },
  {
    id: 'placeholder-3',
    kind: 'tiempo',
    k: 'Tiempo',
    title: 'Banco de tiempo',
    description: 'Una hora tuya vale una hora de alguien más.',
    slot: 3,
    fbid: null,
  },
  {
    id: 'placeholder-4',
    kind: 'cultura',
    k: 'Cultura',
    title: 'Ferias y talleres',
    description: 'Aprende y comparte oficios en comunidad.',
    slot: 4,
    fbid: null,
  },
  {
    id: 'placeholder-5',
    kind: 'ciclo',
    k: 'Ciclo',
    title: 'Compostaje vecinal',
    description: 'Tu orgánico se vuelve tierra fértil otra vez.',
    slot: 5,
    fbid: null,
  },
  {
    id: 'placeholder-6',
    kind: 'causas',
    k: 'Causas',
    title: 'Proyectos sociales',
    description: 'Suma recursos a lo que mueve tu colonia.',
    slot: 6,
    fbid: null,
  },
];

// TODO(data): no editorial events/services exist in the reference yet. Keep
// these empty until real `reciprociudad_eventos` / `reciprociudad_servicios`
// rows are seeded — never fabricate listings.
export const EVENTOS: Evento[] = [];
export const SERVICIOS: Servicio[] = [];
