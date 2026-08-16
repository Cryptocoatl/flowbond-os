// SERVER-ONLY — garden climate from Open-Meteo.
//
// Open-Meteo needs no API key and no account, which is why it's the right
// dependency for something every survey calls. More importantly it publishes
// the two numbers a gardener actually schedules against:
//
//   ET0  — reference evapotranspiration, i.e. how much water the atmosphere
//          pulled out of the ground today. Irrigation need ≈ ET0 − rainfall.
//          Everything else is a proxy for this.
//   soil temperature at 6 cm — what decides whether a seed will germinate.
//          Air temperature is the number people quote and the wrong one.

export interface ClimateDay {
  date: string
  tMax: number
  tMin: number
  rainMm: number
  /** Reference evapotranspiration, mm. */
  et0: number
  uvMax: number
}

export interface GardenClimate {
  timezone: string
  elevationM: number
  days: ClimateDay[]
  /** Mean soil temperature at 6 cm over the next 48 h, °C. */
  soilTemp6cm: number | null
  /** Mean volumetric soil moisture 0–1 cm over the next 48 h, m³/m³. */
  soilMoisture: number | null
  /** Rain expected over the forecast window, mm. */
  rainTotalMm: number
  /** ET0 total over the same window, mm. */
  et0TotalMm: number
  /** Positive = the garden loses more water than it receives. */
  waterDeficitMm: number
  /** Coldest night in the window — the frost question. */
  coldestNightC: number
  /** Hottest day in the window — the heat-stress question. */
  hottestDayC: number
}

const DAILY = [
  'temperature_2m_max',
  'temperature_2m_min',
  'precipitation_sum',
  'et0_fao_evapotranspiration',
  'uv_index_max',
].join(',')

const HOURLY = ['soil_temperature_6cm', 'soil_moisture_0_to_1cm'].join(',')

function mean(xs: (number | null)[]): number | null {
  const v = xs.filter((x): x is number => typeof x === 'number')
  return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 100) / 100 : null
}

/**
 * Fetch a 7-day outlook for one garden. Returns null on any failure — a survey
 * must still work for a garden that has never set its location, and no weather
 * is better than wrong weather.
 */
export async function getGardenClimate(
  latitude: number,
  longitude: number,
  days = 7,
): Promise<GardenClimate | null> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
      `&daily=${DAILY}&hourly=${HOURLY}&timezone=auto&forecast_days=${days}`

    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    const d = await res.json()
    if (!d?.daily?.time) return null

    const dd = d.daily
    const daysOut: ClimateDay[] = dd.time.map((date: string, i: number) => ({
      date,
      tMax: dd.temperature_2m_max[i],
      tMin: dd.temperature_2m_min[i],
      rainMm: dd.precipitation_sum[i] ?? 0,
      et0: dd.et0_fao_evapotranspiration[i] ?? 0,
      uvMax: dd.uv_index_max[i] ?? 0,
    }))

    const rainTotalMm = Math.round(daysOut.reduce((s, x) => s + x.rainMm, 0) * 10) / 10
    const et0TotalMm = Math.round(daysOut.reduce((s, x) => s + x.et0, 0) * 10) / 10

    return {
      timezone: d.timezone ?? 'UTC',
      elevationM: d.elevation ?? 0,
      days: daysOut,
      soilTemp6cm: mean((d.hourly?.soil_temperature_6cm ?? []).slice(0, 48)),
      soilMoisture: mean((d.hourly?.soil_moisture_0_to_1cm ?? []).slice(0, 48)),
      rainTotalMm,
      et0TotalMm,
      waterDeficitMm: Math.round((et0TotalMm - rainTotalMm) * 10) / 10,
      coldestNightC: Math.min(...daysOut.map(x => x.tMin)),
      hottestDayC: Math.max(...daysOut.map(x => x.tMax)),
    }
  } catch {
    return null
  }
}

/** Compact brief for the model — numbers plus what they imply, no prose padding. */
export function climateBrief(c: GardenClimate): string {
  const lines = [
    `Next ${c.days.length} days (${c.timezone}, ${c.elevationM} m):`,
    ...c.days.map(d =>
      `  ${d.date}: ${d.tMin}–${d.tMax}°C, rain ${d.rainMm} mm, ET0 ${d.et0} mm, UV ${d.uvMax}`),
    `Totals: rain ${c.rainTotalMm} mm vs ET0 ${c.et0TotalMm} mm → water balance ${
      c.waterDeficitMm > 0 ? `${c.waterDeficitMm} mm SHORT` : `${Math.abs(c.waterDeficitMm)} mm surplus`}.`,
  ]
  if (c.soilTemp6cm !== null) lines.push(`Soil temperature at 6 cm: ${c.soilTemp6cm}°C (this governs germination, not air temperature).`)
  if (c.soilMoisture !== null) lines.push(`Surface soil moisture: ${c.soilMoisture} m³/m³.`)
  if (c.coldestNightC <= 4) lines.push(`⚠ Coldest night ${c.coldestNightC}°C — frost risk for tender plants.`)
  if (c.hottestDayC >= 33) lines.push(`⚠ Hottest day ${c.hottestDayC}°C — heat stress risk.`)
  lines.push(
    'Use this for timing. Do not propose watering that incoming rain will do for you, ' +
    'and do not propose sowing if the soil is too cold for that seed.',
  )
  return lines.join('\n')
}
