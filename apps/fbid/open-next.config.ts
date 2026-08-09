// @opennextjs/cloudflare — el hub de identidad FBID sobre Cloudflare Workers.
// Regla de la casa: todo en Cloudflare, nunca en Vercel. Este fue el último
// rezagado, y justo el más crítico: es la puerta de entrada de TODAS las apps
// (magic link, código de 8 dígitos, contraseña, recuperación, handoff a cada
// app). Aquí casi nada es estático — /auth/callback, /auth/confirm,
// /api/handoff y /api/monitor son rutas de servidor, así que el Worker es el
// que trabaja de verdad.
import { defineCloudflareConfig } from '@opennextjs/cloudflare';

export default defineCloudflareConfig();
