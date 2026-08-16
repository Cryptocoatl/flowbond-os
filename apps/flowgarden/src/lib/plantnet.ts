// SERVER-ONLY — species identification via Pl@ntNet.
//
// Claude reads a garden scene well: layout, condition, what a leaf is telling
// you. What it can't do is be 20,000-species precise from a wide shot. Pl@ntNet
// is the specialist for exactly that one question, and it takes 1–5 images OF
// THE SAME PLANT — which is what our multi-angle capture already produces.
//
// Two hard constraints shape how this is used:
//   1. The free tier is 500 identifications/day for the whole app. So this runs
//      ONLY on plants Claude flagged as uncertain, never on every plant.
//   2. Pl@ntNet wants the plant filling the frame. Handing it a wide bed shot
//      returns confident nonsense, so only close-ups are sent.

const ENDPOINT = 'https://my-api.plantnet.org/v2/identify/all'

export interface PlantNetCandidate {
  score: number
  scientificName: string
  commonNames: string[]
  genus: string
  family: string
}

export interface PlantNetResult {
  candidates: PlantNetCandidate[]
  /** Requests left on the key today — worth logging when it gets low. */
  remaining: number | null
}

export type Organ = 'leaf' | 'flower' | 'fruit' | 'bark' | 'auto'

/**
 * Identify one plant from up to 5 images of it. Returns null on any failure —
 * identification is an enhancement, never a reason for a survey to fail.
 */
export async function identifyPlant(
  images: { data: Uint8Array; contentType: string }[],
  organs: Organ[] = [],
): Promise<PlantNetResult | null> {
  const apiKey = process.env.PLANTNET_API_KEY
  if (!apiKey || images.length === 0) return null

  try {
    const form = new FormData()
    images.slice(0, 5).forEach((img, i) => {
      // Pl@ntNet only accepts jpeg/png; HEIC is stored as-is by the uploader but
      // Supabase serves it with its own content type, so fall back to jpeg.
      const type = /png/i.test(img.contentType) ? 'image/png' : 'image/jpeg'
      form.append('images', new Blob([img.data as BlobPart], { type }), `organ${i}.jpg`)
      form.append('organs', organs[i] ?? 'auto')
    })

    const url = `${ENDPOINT}?api-key=${encodeURIComponent(apiKey)}&include-related-images=false&nb-results=5`
    const res = await fetch(url, { method: 'POST', body: form, signal: AbortSignal.timeout(15000) })
    if (!res.ok) {
      // 404 from Pl@ntNet means "nothing matched", which is information, not an
      // error — everything else is worth a line in the log.
      if (res.status !== 404) console.error('[plantnet]', res.status, (await res.text()).slice(0, 200))
      return null
    }

    const d = await res.json()
    if (!Array.isArray(d?.results)) return null

    return {
      remaining: typeof d.remainingIdentificationRequests === 'number' ? d.remainingIdentificationRequests : null,
      candidates: d.results.slice(0, 5).map((r: {
        score: number
        species: {
          scientificNameWithoutAuthor: string
          commonNames?: string[]
          genus?: { scientificNameWithoutAuthor?: string }
          family?: { scientificNameWithoutAuthor?: string }
        }
      }) => ({
        score: Math.round(r.score * 1000) / 1000,
        scientificName: r.species.scientificNameWithoutAuthor,
        commonNames: r.species.commonNames ?? [],
        genus: r.species.genus?.scientificNameWithoutAuthor ?? '',
        family: r.species.family?.scientificNameWithoutAuthor ?? '',
      })),
    }
  } catch (err) {
    console.error('[plantnet] request failed:', err)
    return null
  }
}

/** One line per candidate, for handing back to the model to arbitrate. */
export function candidatesBrief(r: PlantNetResult): string {
  if (r.candidates.length === 0) return 'Pl@ntNet returned no match.'
  return r.candidates
    .map(c => `${(c.score * 100).toFixed(1)}% ${c.scientificName}${c.commonNames.length ? ` (${c.commonNames.slice(0, 2).join(', ')})` : ''} — family ${c.family}`)
    .join('\n')
}
