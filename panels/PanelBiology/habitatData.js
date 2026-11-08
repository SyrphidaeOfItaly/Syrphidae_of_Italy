// Habitat data of all SoI species, loaded once and shared by the habitat views
// (genus page "Habitats", species Biology tab: radar and "similar species").
import { makeAPIRequest } from '@/utils'
import { TOPIC, splitList, habitatType } from './traits.js'

// The five broad habitat types drawn in the charts ("other" is left out)
export const MAIN_TYPES = ['woodland', 'scrub', 'grassland', 'wetland', 'farmland']
export const TYPE_COLOR = {
  woodland: '#3d7f57',
  scrub: '#a8902f',
  grassland: '#86ad4c',
  wetland: '#3f86b2',
  farmland: '#c27a3a'
}

const key = (s) => String(s).toLowerCase().replace(/\s+/g, ' ').trim()

let allPromise = null
/** → Map(otuId → [habitat names]) for every species with habitat contents */
export function loadAllHabitats() {
  allPromise ||= makeAPIRequest
    .get('/contents', { params: { topic_id: [TOPIC.habitat], per: 1000 } })
    .then(({ data }) => {
      const map = new Map()
      ;(data || []).forEach((c) => {
        const list = map.get(c.otu_id) || []
        map.set(c.otu_id, [...list, ...splitList(c.text)])
      })
      return map
    })
    .catch(() => new Map())
  return allPromise
}

const nameCache = new Map()
/** OTU ids → Map(id → name html, italics only) */
export async function loadOtuNames(ids = []) {
  const todo = ids.filter((id) => !nameCache.has(id))
  for (let i = 0; i < todo.length; i += 50) {
    const p = new URLSearchParams({ per: '100' })
    todo.slice(i, i + 50).forEach((id) => p.append('otu_id[]', id))
    try {
      const { data } = await makeAPIRequest.get(`/otus?${p}`)
      ;(data || []).forEach((o) =>
        nameCache.set(o.id, String(o.object_tag || o.object_label || '').replace(/<(?!\/?i>)[^>]*>/gi, ''))
      )
    } catch {
      /* names stay unknown */
    }
  }
  return new Map(ids.filter((id) => nameCache.has(id)).map((id) => [id, nameCache.get(id)]))
}

/** habitat names → { woodland: n, scrub: n, … } (number of habitats of each type) */
export function profileOf(names = []) {
  const p = Object.fromEntries(MAIN_TYPES.map((t) => [t, 0]))
  names.forEach((n) => {
    const t = habitatType(n)
    if (t in p) p[t]++
  })
  return p
}

/** Share of habitats two species have in common (Jaccard: shared ÷ all), 0–1 */
export function overlap(a = [], b = []) {
  const A = new Set(a.map(key))
  const B = new Set(b.map(key))
  if (!A.size || !B.size) return 0
  let shared = 0
  A.forEach((h) => B.has(h) && shared++)
  return shared / (A.size + B.size - shared)
}

/** The species whose habitats are most similar to otuId's → [{ id, overlap }] */
export async function mostSimilar(otuId, names, n = 5) {
  const all = await loadAllHabitats()
  return [...all.entries()]
    .filter(([id]) => id !== otuId)
    .map(([id, list]) => ({ id, overlap: overlap(names, list) }))
    .filter((s) => s.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, n)
}
