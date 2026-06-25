# FlowMe → Tianguis product ingest

The path that lets a vendor load a product in **FlowMe** (flowme.one) and have it
appear in the **Tianguis** marketplace (flowgarden.life). Independent apps, one
HTTP contract over the shared FBID/Supabase project — same pattern as the
RefiRides delivery bridge.

## Endpoint

```
POST https://www.flowgarden.life/api/flowgarden/tianguis/ingest
Authorization: Bearer <the vendor's Supabase access token>
Content-Type: multipart/form-data
```

Auth uses the vendor's **own** FBID token (the session token FlowMe already holds,
since both apps share Supabase project `fgsrcxxccdjqyrpkitmk`). No API key is
shared with FlowMe; a vendor can only create products as themselves.

## Fields

| field | required | notes |
|---|---|---|
| `name` | ✅ | product name |
| `price` | — | decimal string, e.g. `"45.00"` (or send `price_cents`) |
| `currency` | — | default `MXN` |
| `category` | — | `vegetables \| fruits \| herbs \| seedlings \| honey \| eggs \| dairy \| crafts \| other` (default `other`) |
| `file` | see rule | image: jpeg/png/webp/heic, ≤10 MB |
| `photo_url` | see rule | alternative to `file` — an already-hosted image URL |
| `description`, `quantity`, `unit`, `pickup_label`, `pickup_lat`, `pickup_lng` | — | optional |

**Photo rule:** every category **except produce** (`vegetables`, `fruits`,
`herbs`, `seedlings`) MUST include an image (`file` or `photo_url`) → otherwise
`422`. Produce may be listed without a picture.

First-time vendors get a personal **stall** provisioned automatically, so no
garden setup is needed before the first upload.

## Example (FlowMe client)

```ts
const fd = new FormData()
fd.set('name', 'Raw wildflower honey')
fd.set('price', '180.00')
fd.set('category', 'honey')
fd.set('unit', 'jar')
fd.set('file', imageFile) // required for non-produce

const res = await fetch('https://www.flowgarden.life/api/flowgarden/tianguis/ingest', {
  method: 'POST',
  headers: { Authorization: `Bearer ${supabaseAccessToken}` },
  body: fd,
})
const { ok, product, marketplace_url } = await res.json()
// -> live at marketplace_url (https://www.flowgarden.life/tianguis)
```

## Responses

- `201 { ok: true, product, marketplace_url }`
- `401` missing/invalid token · `400` bad payload/missing name · `422` photo required · `500` upload/db error

## Not yet (Phase 1 — vendor presence model)

Multi-image, delivery area + hours, farmers-market schedule + stand photo,
payout rails / tips / split — these extend this same endpoint once the presence
schema lands. Today it carries photo + name + price + basic pickup.
