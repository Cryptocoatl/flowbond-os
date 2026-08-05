# Login por celular (SMS) — runbook para conectar Twilio

**Estado actual:** el código de login dual (correo **o** celular) ya está desplegado.
El tab "Celular" está **oculto** tras el flag `NEXT_PUBLIC_PHONE_LOGIN` (no seteado → email-only).
Prenderlo cuando haya proveedor SMS es un solo flip. El correo ya es público y gratis.

## Requisitos (los trae Steph)
Cuenta Twilio **de pago** (saldo prepagado; el "mínimo $20" es saldo, no mensualidad).
Recomendado: **Twilio Verify** (hecho para OTP, maneja compliance MX, sin comprar número).
Costo aprox: ~$0.05–0.09 USD por verificación a México → $20 ≈ 250–400 registros.

Valores a obtener de Twilio:
- `Account SID` (AC…)
- `Auth Token`
- `Verify Service SID` (VA…)  ← si se usa Twilio Verify

## Paso 1 — Guardar llaves en el vault (Steph, en su terminal)
```bash
claudia keys set twilio TWILIO_ACCOUNT_SID        "Twilio Account SID (AC…) — FBID SMS"
claudia keys set twilio TWILIO_AUTH_TOKEN         "Twilio Auth Token (secreto) — FBID SMS"
claudia keys set twilio TWILIO_VERIFY_SERVICE_SID "Twilio Verify Service SID (VA…) — FBID OTP"
```

## Paso 2 — Configurar Supabase Auth (ClaudIA, Management API)
Canónico: `fgsrcxxccdjqyrpkitmk`. Token: `claudia keys get flowme SUPABASE_ACCESS_TOKEN`.
PATCH a `https://api.supabase.com/v1/projects/fgsrcxxccdjqyrpkitmk/config/auth` con:
- `external_phone_enabled = true`
- **Twilio Verify:** `sms_provider = "twilio_verify"` + los campos verify
  (`sms_twilio_verify_*` — confirmar nombres exactos contra el schema del config al momento).
- **o Programmable Messaging clásico:** `sms_provider = "twilio"` +
  `sms_twilio_account_sid`, `sms_twilio_auth_token`, `sms_twilio_message_service_sid` (MG…).
- La plantilla ya está: `Your code is {{ .Code }}` (6 dígitos, exp 60s).

## Paso 3 — Prender el tab en el front
En Vercel (proyecto reciprociudad, prj_kGSXmATqTiG7wIObpg8BILrckylB), env Production:
```
NEXT_PUBLIC_PHONE_LOGIN=1
```

## Paso 4 — Redeploy
Deploy CLI desde raíz del monorepo con el link swapeado a reciprociudad
(ver notas de deploy: la raíz `.vercel` liga a fbid; respaldar/swapear/restaurar).
```bash
# en flowbond-os, con .vercel/project.json apuntando a reciprociudad:
vercel deploy --prod --yes --archive=tgz
```

## Paso 5 — Probar
Con un número real: escribir celular → llega SMS con código → verifyOtp(type:'sms') → FBID creado.
El código del front ya hace todo: `app/components/JoinFBID.tsx` (canal 'phone', normaliza a E.164 +52 por default).

## Notas
- El correo sigue funcionando en paralelo; celular es aditivo (onboarding "con lo que sea").
- Para PROBAR sin costo solo con números propios: `sms_test_otp` en el config (número=código fijo).
- 2FA futuro: enrolar teléfono como segundo factor (`mfa_phone_enroll_enabled`).
