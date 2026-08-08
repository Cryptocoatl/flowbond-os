# flowbond-os — cómo se trabaja en este repo

Monorepo con ~24 productos en `apps/`. Comparten paquetes en `packages/`, y el que
de verdad los une es **`@flowbond/auth` (FBID)**: identidad única para todo el
ecosistema. Todo lo demás debe poder vivir y desplegarse por separado.

## Ramas — la regla que evita el enredo

**Una rama = un producto, y siempre nace de `origin/main`.**

```bash
git fetch origin
git switch -c voces/precios-por-pais origin/main     # ✅ nace de main
```

Nunca crear una rama desde la rama en la que ya estabas trabajando. Así fue como
`feat/danz-now-fbid-allowlist` acabó cargando 41 commits de 9 productos y
`feat/reciprociudad-admin` otros 38: cada rama heredaba todo lo que la anterior
aún no había mergeado, y el nombre dejó de decir nada sobre el contenido.

**Nombre:** `<producto>/<qué-hace>` — `voces/…`, `astroflow/…`, `tulum/…`.
Para cambios que no son de un producto: `chore/…`, `fbid/…`, `packages/…`.

**Antes de commitear, comprueba que estás donde crees:**

```bash
git branch --show-current      # ¿coincide con la app que estás tocando?
git status --short apps/       # ¿sólo hay cambios de ESA app?
```

El árbol de trabajo suele tener cambios ajenos de otras sesiones. **Nunca uses
`git add -A` ni `git commit -a`**: añade rutas explícitas (`git add apps/voces`).

**Un commit toca una sola app.** Hoy se cumple; mantenlo.

**Main entra por PR.** `main` es lo desplegado. Al terminar: PR contra `main`,
merge, y de ahí sale la siguiente rama. Si despliegas desde una rama sin
mergear, el próximo merge a `main` puede revertir lo que está en producción —
ya pasó una vez con reciprociudad.lat.

**¿Otra sesión trabajando en el mismo árbol?** Es lo normal aquí. Si necesitas
cambiar de rama o mergear, hazlo en un worktree aparte para no pisarle el
trabajo a nadie:

```bash
git worktree add /tmp/wt-mi-tarea origin/main
```

## Despliegue

**Cloudflare, no Vercel.** El ecosistema se está mudando; no crees proyectos
nuevos en Vercel. Estáticos → Cloudflare Pages; Next.js → Workers (OpenNext).
Antes de dar algo por desplegado, compruébalo en vivo: si la respuesta trae la
cabecera `x-vercel-id`, sigue sirviéndose desde Vercel.

Al migrar un sitio, **apaga la copia vieja**: quedarse las dos vivas significa
que la mitad del mundo ve una versión sin tus arreglos (pasó con
`voces-deploy.vercel.app`, que siguió sirviendo un bug de precios ya corregido y
con su panel de administración abierto).

## Datos y privacidad

Las ~16 apps comparten **un solo proyecto Supabase y una sola llave `anon`**, que
va publicada en el HTML de cada sitio. Eso significa que **la única frontera
entre un producto y otro es la RLS de cada tabla**.

- Cada producto usa su prefijo (`app_vpa_`, `ops_`, `kai_`, `flowscrow_`…).
- **Nunca** `FOR SELECT TO anon USING (true)` sobre una tabla con datos de
  personas. Si algo es público, publica una **vista sin PII**, no la tabla.
- Un RPC `SECURITY DEFINER` **tiene que comprobar quién pregunta** (`auth.uid()`
  o un helper como `flowscrow_is_signer()`). No basta con esconder el botón en
  el frontend: el endpoint es público.
- Las llaves `service_role` sólo en servidor (rutas API, Workers, Edge
  Functions). Jamás en un componente cliente ni en `NEXT_PUBLIC_*`.

Tras cualquier cambio de DDL, corre una ronda de FloGuard
(`.claude/skills/floguard`) — los advisors detectan RLS faltante.

## Código

Ninguna app importa código de otra app; hoy se cumple y así debe seguir. Lo
compartido vive en `packages/` y se consume por su nombre (`@flowbond/auth`).
