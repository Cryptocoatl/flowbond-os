# BAÑOSECO 🌽

> El juego regenerativo del mundo real · CDMX — app cliente sobre **FlowBond Layer 0**.

Pokémon GO + empire building para una red de baños secos regenerativos. Los usuarios
encuentran y **activan** baños donando $5; los **guardianes** aceptan misiones (cambiar /
sanitizar / llevar a composta las cubetas) y ganan **XP, oro y artefactos**.

Estética: **solarpunk ancestral mexica**. Tablero = chinampas de Tenochtitlan. Tótem = caca de
oro con un brote de vida. BAÑOSECO es una app cliente **independiente** — NO es marca de consumo
de FlowBond.

- **Stack:** Next.js 15 (App Router) + TypeScript + Tailwind 3, en el monorepo `flowbond-os`.
- **Puerto dev:** `3016` · **Dominio:** `bañosecos.reciprociudad.lat`
- **Supabase canónico ÚNICO:** `fgsrcxxccdjqyrpkitmk` (us-east-2, FlowBond-life).
  El ref `eoajujwpdkfuicnoxetk` **NO existe — nunca usarlo.**

## Correr local

```bash
cp apps/banoseco/.env.example apps/banoseco/.env.local   # llena los valores
pnpm install
pnpm --filter @flowbond/banoseco dev
```

## Capa de datos (Pattern A)

Migraciones en `supabase/migrations/` (Layer 0 / Pattern A: prefijo `banoseco_`, FK a
`flowbond_users`, RLS deny-by-default, escritura SOLO por RPC `SECURITY DEFINER`, ledger
append-only). Ambas corren en **dry-run** (`BEGIN … ROLLBACK`); para aplicar, cambia el
`ROLLBACK` final por `COMMIT` o versiónalas con `supabase db push`.

1. `00_banoseco_init.sql` — tablas, RLS, RPCs base. Amplía el allow-list de `app_slug` en
   `flowbond_app_connections` para admitir `banoseco`.
2. `01_banoseco_game.sql` — mecánica de juego: moneda dual (`oro` canjeable / `xp` progresión),
   `reward_xp` + `reward_oro`, energía + recarga solar, `banoseco_connect`,
   `banoseco_become_guardian`, `banoseco_refill_energy`, `banoseco_guardian_profile`,
   `banoseco_leaderboard`, y `complete_mission` acreditando oro **y** xp. Publica realtime.

> Validadas con dry-run contra la DB canónica (transacción revertida). Aplícalas tú.

## Identidad (FBID · Layer 0)

Magic-link **por-app** (Supabase OTP, sin token relay). El callback
(`/auth/callback`) corre `link_auth_or_create_identity()` (crea la fila en `flowbond_users`) y
`banoseco_connect()` (registra la conexión en `flowbond_app_connections`). Agrega el dominio de
BAÑOSECO al allowlist de redirect URLs en Supabase Auth.

## Sin custodia de fondos

Las donaciones van **directo a la cuenta conectada de la red** (Mercado Pago / Stripe vía el QR
apuntando a `NEXT_PUBLIC_BANOSECO_DONATION_URL`). BAÑOSECO solo **registra el evento**
(`banoseco_record_donation`); nunca mueve saldo. No hay wallet con balance en v1.

## Superficies

- **El Mapa** (`/`) — mundo vivo: Mapbox oscuro (toggle ↔ tablero Chinampa), nodos por status,
  donación con QR real.
- **Misiones** (`/misiones`) — aceptar (gasta ⚡) → completar (sube foto) → acredita XP + oro;
  realtime; escalera de rangos hasta Tlazoltéotl; leaderboard de gremio.
- **El Códice** (`/codice`) — manifiesto ancestral, métricas de impacto, lead-gen de sponsors.

## Diferido (TODOs)

- Payout en MXN a guardianes (riesgo regulatorio — v1 solo canje por bienes/servicios).
- Sensores IoT de nivel (ESP32-S3 estilo FlowGarden → `report_full` automático).
- Módulo de carga solar y reciclables con puntos (`record_deposit` ya existe; falta UI).
- Bucket de Storage `banoseco-proofs` para las fotos de prueba (ver `lib/upload.ts`).
- Candados legales: confirmar topología de donaciones no-custodia con Luis Javier; registro de
  marca "BAÑOSECO".
