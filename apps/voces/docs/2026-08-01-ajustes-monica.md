# Ajustes para desarrollo — Voces para el Alma

**Origen:** documento de Mónica Salgado, 1 de agosto de 2026.
**Estado:** implementado y en producción (voces.world · voces.flowme.one) el 1-ago-2026.
**Código:** `apps/voces/{index,admin,mi-voz,crear-perfil,unete}.html`
**Base de datos:** `supabase/migrations/vpa_0034_comision_agenda_perfil.sql` + `vpa_0035_commission_terms_no_fk.sql`

---

## Trazabilidad: qué pedía cada punto → qué se construyó → cómo se verificó

| # | Pedido | Implementación | Verificación |
|---|---|---|---|
| 1 | Carta tras "Continuar", antes del resto del cuestionario | Pantalla intermedia `#carta` en `/crear-perfil` (no es paso numerado: no hubo que renumerar el wizard). Texto íntegro, ES/EN, saludo con el nombre capturado. `cartaSeen` evita repetirla; un borrador restaurado con paso>1 la salta | Servida en prod (`id="carta"`, `cartaBody`, const `CARTA`); revisada en Brave |
| 2.1 | Campo de comisión por especialista, default 20 %, ajustable sin desarrollo | `app_vpa_specialists.commission_pct` + panel **/admin → "% Comisiones"** (`vpa_commissions_overview`) con edición por voz y edición del default global (`app_vpa_settings.default_commission_pct` = 20). También campo en el editor de especialista | Backfill sin cambiar tratos: Mónica 10, ALVERA 30, Laura 10, Bugallo 20, Uriel 20; Silvio hereda 10 de su plan Pro; resto 20 |
| 2.2 | Leyenda de comisión antes de pagar | Leyenda del lado del **especialista**: `/mi-voz` (al marcar "vender vía Voces" y en Membresía), `/crear-perfil` paso 5, y `/unete` antes del botón de pagar. Ver "Decisión de alcance" abajo | Servida en prod en las 3 páginas |
| 2.3 | Casilla de aceptación obligatoria + registro de quién/cuándo/qué % | Tabla append-only `app_vpa_commission_terms` (RLS deny-all) + RPCs `vpa_my_commission` / `vpa_accept_commission` / `vpa_commission_acceptances`. **Gate server-side** en `vpa_upsert_offering`: sin aceptación al % vigente no se puede guardar una oferta con `sell_via_voces` | **E2E 4/4** simulando sesión real (Laura, 10 %) en transacción con rollback: sin aceptar → `commission_terms_required`; acepta → publica; % inventado → `commission_changed`. Anon recibe 42501 en las 3 RPC y 401 en la tabla |
| 3 | Calendario público permanente, sin registro, con **todos** los eventos del día | Sección `#calendario` en la portada (+ nav y footer). Columnas `event_at` / `event_ends_at` / `event_location` en ofertas, expuestas en la vista pública. Junta talleres (`starts_at`) y ofertas con fecha; abre en el mes del próximo evento; clic en día → todos los eventos de ese día; sin día elegido lista el mes completo | Vista pública anon ya devuelve `event_at`; sección servida en prod. **Se ve vacío hasta que una oferta real tenga fecha** |
| 4 | País de residencia + LinkedIn | `country` ya existía en la tabla pero era **ineditable** (`vpa_upsert_specialist` lo ignoraba) → ahora se guarda, con selector de países en /admin. LinkedIn nuevo en `contact_socials.linkedin` (/crear-perfil paso 3 y /admin). `vpa_pending_approvals` devuelve país + LinkedIn + Instagram + web, y **⏳ Aprobaciones los muestra** marcando en rojo "sin LinkedIn" | Servido en prod; usado en la pantalla de verificación previa a publicar |
| 5 | Saltos de línea en Certificaciones y Descripción de oferta | **La causa no era el input**: en /mi-voz y /crear-perfil ya eran `textarea` y el texto **se guardaba bien** — se perdía al *mostrarlo* (HTML colapsa los saltos). Fix: `white-space:pre-line` en perfil público, tienda, filas de oferta, revisión del alta y solicitudes de /admin. Aparte, **en /admin Certificaciones sí era un input de una línea** (`t:"text"`) → cambiado a `textarea` | Servido en prod. Las descripciones ya guardadas con saltos se ven bien sin re-capturar |

---

## Decisiones de alcance tomadas en desarrollo

1. **Dónde va la leyenda de comisión (punto 2.2 vs 2.3).** El punto 2.2 la pedía "en el checkout, antes del botón de pagar", pero describiéndola como *dirigida al especialista/vendedor*; el punto 2.3 dejaba explícitamente a desarrollo elegir el momento. Se puso **del lado del especialista** (publicar su oferta y contratar su membresía), **no en el checkout del comprador**: al comprador la comisión entre Voces y la voz no le dice nada y ensucia el paso de pago. La casilla obligatoria vive en el mismo lugar, que es donde produce el respaldo formal.
2. **Default global 20 % (confirmado por Steph).** Antes convivían **tres defaults distintos**: 50 % en el split del checkout, 15 % en el de MercadoPago, y el del plan en medio. Ahora hay una sola cadena: `commission_pct` de la voz → comisión de su plan → ajuste global (20 %) → 20. Lo ya negociado se respetó con backfill; ninguna venta cambió de reparto.
3. **La carta como pantalla intermedia, no como paso 6.** Cumple el flujo pedido (Continuar → carta → Siguiente) sin renumerar los 5 pasos del wizard ni tocar validaciones, borrador y navegación existentes.
4. **La comisión nunca la mueve la voz.** `vpa__apply_changes` (ediciones propuestas por el especialista) no acepta `commission_pct`, y `vpa_accept_commission` ignora el porcentaje que mande el navegador: firma el vigente en base de datos.

## Pendiente conocido

- **El calendario está vacío hasta que exista una fecha real.** Ninguna oferta tiene `event_at` todavía. Mónica debe ponerle fecha a un taller o conferencia real (/admin → Ofertas, o la voz desde /mi-voz) para verlo poblado. No se sembraron datos de ejemplo a propósito: el calendario anterior fallaba justamente por mostrar información falsa.

---
---

# Documento original (verbatim)

**Fecha:** 1 de agosto, 2026

Este documento agrupa 5 temas distintos, cada uno en su propia sección.

---

# TEMA 1: Carta de presentación para especialistas

## Nota de flujo (para desarrollo)

El formulario de registro como especialista debe conservar dos pasos:
1. **Pantalla 1:** Formulario inicial (nombre, correo electrónico, etc.), como está actualmente.
2. Al hacer clic en **"Continuar"**, mostrar la carta de presentación (texto abajo).
3. Al hacer clic en **"Siguiente"**, continuar con el resto del cuestionario.

**Motivo:** Evitar que la carta (que detalla las condiciones y beneficios pensados para especialistas) sea visible para cualquier usuario que entre por curiosidad al flujo de registro sin haber empezado el proceso real.

---

## Carta de presentación (texto a mostrar en la plataforma)

**Estimado/a [Nombre],**

Bienvenido/a a **Voces para el Alma / Voices for the Soul**, la plataforma internacional de referencia que conecta, de manera confiable, segura y eficiente, a personas, empresas e instituciones con profesionales y especialistas de excelencia.

No te estamos invitando a sumarte a un directorio más, te estamos invitando a formar parte de un **ecosistema global** donde el talento, el conocimiento y la experiencia convergen para generar resultados extraordinarios, y a posicionar tu voz, tu marca personal y tu trabajo ante una audiencia internacional que hoy no tiene fronteras.

**Al unirte a Voces, tendrás acceso a:**

- **Exposición internacional integral.** No solo tu perfil y tu marca personal ganan visibilidad ante personas, empresas y organizaciones de distintos países, cada producto o servicio que ofrezcas se posiciona con el mismo alcance: sesiones uno a uno, material digital descargable, conferencias presenciales o digitales, y talleres o cursos. Además, cada producto cuenta con su propio link para compartir, y tu perfil se convierte así en tu **tienda personal**, por fin todo tu trabajo reunido en un solo lugar. El material que subas debe ser de tu autoría y coherente con la temática de tu perfil, para mantener la calidad y confiabilidad que distingue a Voces.
- **Una plataforma de alto nivel, sin competencia interna.** Cada especialista pasa por un proceso de verificación antes de integrarse a la comunidad, lo que garantiza que compartes espacio únicamente con profesionales de excelencia. La visibilidad dentro de la plataforma depende del tipo de membresía que contrates (Básica o Pro), y dentro de tu nivel, apareces en las búsquedas que se hacen en internet exactamente ante el perfil de mercado correcto: si un empresario busca una conferencia de alto nivel, encuentra tu propuesta, si un estudiante busca acompañamiento en un momento difícil, encuentra la tuya. Esto sin depender de un algoritmo que favorece a unos sobre otros dentro de un mismo nivel de membresía, y sin importar el precio de tus productos o servicios, desde opciones más accesibles hasta propuestas de alto valor (*high ticket*), porque cada uno llega directamente a quien realmente lo está buscando.
- **Infraestructura lista para gestionar y monetizar tu conocimiento.** Pagos internacionales, agenda automatizada y un calendario de tus talleres y cursos visible para quienes quieran inscribirse, con registro y pago integrados directamente en la plataforma, sin que tengas que ocuparte de la logística administrativa. Además, tus eventos con fecha ya definida aparecen en el **calendario público de la página principal**, visible para cualquier visitante: puedes anunciar un gran evento con meses de anticipación, promocionarlo con descuentos por *early bird*, y saber que ya está agendado y visible desde el primer día. Así, tú te enfocas únicamente en lo que mejor sabes hacer: transformar vidas.

Más que conectar personas con profesionales, en Voces gestionamos relaciones de confianza que convierten cada necesidad en una solución, y cada encuentro en una oportunidad de crecimiento, para quien lo recibe, y para ti, como el liderazgo detrás de esa transformación.

**Continúa para conocer los siguientes pasos y poder evaluar tu perfil.**

---

---

# TEMA 2: Comisión por especialista y leyenda antes del pago

## 1. Campo de comisión configurable por especialista (panel interno)

**Situación actual:** No existe un campo definido para asignar el porcentaje de comisión que la plataforma retiene por especialista.

**Comportamiento esperado:**
- Agregar en el panel interno de Voces un campo de **porcentaje de comisión** asignable de forma individual a cada especialista.
- **Valor por default: 20%.**
- Debe poder ajustarse caso por caso desde el panel (Monica ya tiene casos negociados distintos: 10%, 20%, 50%, etc.), sin requerir cambios de desarrollo cada vez que se negocie un porcentaje distinto.

## 2. Leyenda de comisión visible antes de pagar

**Situación actual:** No hay ninguna indicación visible para el comprador sobre la comisión que retiene la plataforma.

**Comportamiento esperado:**
- Justo antes de completar el pago (en el checkout, antes del botón de pagar), mostrar una leyenda dirigida al especialista/vendedor indicando el porcentaje de comisión acordado con Voces para esa venta específica, tomando el valor configurado en el campo del punto 1.
- Texto sugerido: **"Por esta venta, Voces retiene una comisión del [X]%. Es la misma lógica que aplica en cualquier plataforma: a cambio, recibes exposición internacional, herramientas de gestión y cobro, y un espacio donde tu trabajo puede crecer sin límite de fronteras. No te estamos dando un lugar donde publicar, te estamos proponiendo un negocio en conjunto, con depósitos prácticamente inmediatos según la forma de cobro que hayas configurado."** (el [X]% se reemplaza automáticamente por el porcentaje asignado a ese especialista).

**Aplica a:** Todos los especialistas, con porcentaje individual según lo configurado en su perfil.

---

## 3. Casilla de aceptación de comisión (tipo términos y condiciones)

**Situación actual:** No existe ningún mecanismo de aceptación explícita por parte del especialista respecto a la comisión que se le cobrará.

**Comportamiento esperado:**
- Antes de que el especialista pueda dirigirse al flujo de pago/cobro de su producto (o al momento de publicar la oferta, a definir con desarrollo cuál punto es más adecuado), debe mostrarse la leyenda de comisión (ver punto 2) junto con una **casilla de aceptación obligatoria**, tipo términos y condiciones.
- El especialista debe marcar la casilla confirmando que entiende y acepta el porcentaje de comisión aplicable a su cuenta antes de poder continuar.
- Esto sirve como respaldo formal para evitar cualquier malentendido posterior sobre el cobro de comisión.
- Debe quedar registrado en el sistema qué especialista aceptó, cuándo, y bajo qué porcentaje (para trazabilidad legal/administrativa).

**Aplica a:** Todos los especialistas, con el porcentaje individual que les corresponda.

---

# TEMA 3: Calendario público en página principal

## Contexto

En una fase temprana del desarrollo de la plataforma, se incluyó un calendario visible en la página principal, con datos de ejemplo (información falsa/de prueba) de especialistas inscritos. Al hacer clic en un día con evento, se desplegaba el ícono/aviso correspondiente con el detalle del evento.

## Comportamiento esperado (aclaración/confirmación de la función)

- El calendario debe estar **visible permanentemente en la página principal**, no solo en un flujo de compra o registro.
- Cualquier persona (sin necesidad de estar registrada) puede hacer clic en un día del calendario y ver las conferencias o talleres que los especialistas estén promocionando **ese día**.
- **Solo aparecen en este calendario los talleres/conferencias que ya tienen una fecha establecida por el especialista al publicarlos.** No aplica a servicios que requieran contratarse primero para después coordinar una fecha (ej. sesiones individuales vía Calendly, que siguen el flujo ya definido en el documento de sesiones).
- Si varios especialistas tienen eventos programados el mismo día, al hacer clic en ese día deben mostrarse **todos los eventos de ese día**, no solo uno.

## Nota

Esta funcionalidad ya existía en una versión temprana del desarrollo (con datos de prueba); este documento confirma y aclara su comportamiento esperado para que el equipo la retome/valide, no es una función nueva desde cero.

---

# TEMA 4: Campos adicionales en cuestionario de especialistas

## Agregar campos al cuestionario de registro

**Situación actual:** El cuestionario de registro de especialistas no incluye país de residencia ni cuenta de LinkedIn (Instagram ya está incluido actualmente).

**Comportamiento esperado:** Agregar los siguientes campos al cuestionario:
- **País de residencia**
- **Cuenta de LinkedIn** (link de perfil)

**Motivo:** Estos datos permiten validar el posicionamiento profesional del especialista a través de sus redes empresariales/profesionales, como parte del proceso de verificación antes de integrarse a la plataforma.

---

# TEMA 5: Bug: no se permiten saltos de línea/espacios en texto

## Situación actual

En al menos dos campos de texto del panel de especialista, no es posible insertar saltos de línea ni separación por párrafos:

1. **Certificaciones** (en el perfil del especialista): al escribir varias certificaciones, el campo no permite separarlas visualmente; todo el texto se guarda y se muestra como un bloque corrido, sin espacios entre líneas.
2. **Descripción de oferta** (al crear/editar una oferta): mismo problema. El texto se guarda como un párrafo continuo sin saltos de línea, incluso si el especialista intenta darle formato con espacios o Enter al escribirlo.

**Efecto visual:** En ambos casos, la información se ve amontonada y difícil de leer en el perfil público.

## Comportamiento esperado

- Ambos campos (Certificaciones y Descripción de oferta) deben aceptar saltos de línea/párrafos al escribir (Enter), y respetar ese formato al guardarse y mostrarse en la vista pública.
- Revisar si el campo actual es un input de una sola línea (que por diseño no permite saltos) y, de ser así, cambiarlo a un campo de texto multilínea (textarea) que si los permita.

## Urgencia

Monica tiene ofertas ya publicadas cuyas descripciones necesita actualizar y corregir de formato en cuanto este bug se resuelva.
