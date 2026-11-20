<template>
  <VCard v-if="count">
    <VCardHeader>
      <h2 class="text-md">{{ count === 1 ? t('title1') : t('titleN', { n: count }) }}</h2>
    </VCardHeader>
    <VCardContent class="text-sm">
      <section
        v-for="sec in sections"
        :key="sec.id"
        class="soi-keys-sec"
      >
        <p class="soi-keys-head">
          {{ t(sec.id) }}
          <span class="soi-keys-help">{{ t(sec.id + 'Help') }}</span>
        </p>
        <ul class="soi-keys-list">
          <li
            v-for="k in sec.items"
            :key="k.name + k.kind"
            class="soi-key"
          >
            <!-- what kind of key: branching (dichotomous) or a matrix -->
            <span
              class="soi-key-icon"
              :title="t(k.kind)"
              aria-hidden="true"
            >
              <svg
                v-if="k.kind === 'dichotomous'"
                viewBox="0 0 20 20"
              >
                <path d="M3 10h5M8 10l4-5h5M8 10l4 5h5" />
              </svg>
              <svg
                v-else
                viewBox="0 0 20 20"
              >
                <rect x="3" y="3" width="6" height="6" rx="1" />
                <rect x="11" y="3" width="6" height="6" rx="1" />
                <rect x="3" y="11" width="6" height="6" rx="1" />
                <rect x="11" y="11" width="6" height="6" rx="1" />
              </svg>
            </span>
            <span class="soi-key-main">
              <RouterLink
                :to="k.versions[0].to"
                class="soi-key-name"
                v-html="k.name"
              />
              <span class="soi-key-kind">{{ t(k.kind) }}</span>
            </span>
            <!-- the same key in more languages: one pill each -->
            <span
              v-if="k.versions.some((v) => v.lang)"
              class="soi-key-langs"
            >
              <RouterLink
                v-for="v in k.versions"
                :key="v.id"
                :to="v.to"
                class="soi-key-lang"
                :title="v.text"
                >{{ v.lang || '—' }}</RouterLink
              >
            </span>
          </li>
        </ul>
      </section>
    </VCardContent>
  </VCard>
</template>

<script setup>
import TaxonWorks from '@/modules/otus/services/TaxonWorks.js'
import { useOtuPageRequest } from '@/modules/otus/helpers/useOtuPageRequest.js'
import { makeAPIRequest } from '@/utils/request'
import { onMounted, onBeforeUnmount, ref, computed } from 'vue'
import { useT, lang } from '@/utils/soiLang.js'

const props = defineProps({
  otuId: { type: Number },
  // taxon.id is the taxon-name id — used to find this taxon's coordinate OTUs.
  taxon: { type: Object, default: undefined }
})

const t = useT({
  en: {
    title1: 'Identification key',
    titleN: 'Identification keys ({n})',
    to: 'Keys to this group',
    toHelp: 'identify its species',
    in: 'Keys that lead here',
    inHelp: 'this taxon is one of the outcomes',
    dichotomous: 'Dichotomous key',
    interactive: 'Interactive key',
    image: 'Image key'
  },
  it: {
    title1: 'Chiave di identificazione',
    titleN: 'Chiavi di identificazione ({n})',
    to: 'Chiavi per questo gruppo',
    toHelp: 'per identificarne le specie',
    in: 'Chiavi che portano qui',
    inHelp: 'questo taxon è uno dei risultati',
    dichotomous: 'Chiave dicotomica',
    interactive: 'Chiave interattiva',
    image: 'Chiave per immagini'
  }
})

const controller = new AbortController()
const keys = ref({ to: { matrices: [], leads: [] }, in: { matrices: [], leads: [] } })

// "Eupeodes (EN)" → { base: "Eupeodes", lang: "EN" }
function splitLang(text = '') {
  const m = String(text).match(/^(.*?)\s*[([]\s*([A-Za-z]{2})\s*[)\]]\s*$/)
  return m ? { base: m[1], lang: m[2].toUpperCase() } : { base: text, lang: '' }
}

// one row per key; the language versions of the same key become pills
function rowsOf(group) {
  const all = [
    ...group.matrices.map((m) => ({
      id: 'm' + m.id,
      text: m.name,
      kind: m.is_media ? 'image' : 'interactive',
      to: { name: m.is_media ? 'image-matrices-id' : 'interactive-key', params: { id: m.id } }
    })),
    ...group.leads.map((l) => ({
      id: 'l' + l.id,
      text: l.text,
      kind: 'dichotomous',
      to: { name: 'dichotomous-key', params: { id: l.id } }
    }))
  ]
  const rows = new Map()
  for (const v of all) {
    const { base, lang: lg } = splitLang(v.text)
    const key = base + '|' + v.kind
    if (!rows.has(key)) rows.set(key, { name: base, kind: v.kind, versions: [] })
    const row = rows.get(key)
    if (!row.versions.some((x) => x.id === v.id)) row.versions.push({ ...v, lang: lg })
  }
  // the page language first
  const here = lang.value.toUpperCase()
  for (const r of rows.values()) r.versions.sort((a, b) => Number(b.lang === here) - Number(a.lang === here))
  return [...rows.values()]
}

const sections = computed(() =>
  ['to', 'in'].map((id) => ({ id, items: rowsOf(keys.value[id]) })).filter((s) => s.items.length)
)
const count = computed(() => sections.value.reduce((n, s) => n + s.items.length, 0))

// /otus/:id/inventory/keys matches a key's leaf lead by its EXACT otu_id. A key
// whose terminal points at a *coordinate* OTU of this taxon (same taxon name,
// different OTU) is therefore invisible on this taxon's page. Fetch each
// coordinate OTU's keys too and merge them in, deduped by id.
async function mergeCoordinateKeys(acc) {
  if (!props.taxon?.id) return
  let coords = []
  try {
    const { data } = await makeAPIRequest.get('/otus', {
      params: { 'taxon_name_id[]': [props.taxon.id], per: 50 },
      signal: controller.signal
    })
    coords = (Array.isArray(data) ? data : []).map((o) => o.id).filter((id) => id && id !== props.otuId)
  } catch {
    return
  }
  if (!coords.length) return
  const results = await Promise.all(
    coords.map((id) =>
      TaxonWorks.getKeys(id)
        .then((r) => r.data)
        .catch(() => null)
    )
  )
  for (const d of results) {
    if (!d) continue
    acc.to.matrices.push(...(d.observation_matrices?.scoped || []))
    acc.to.leads.push(...(d.leads?.scoped || []))
    acc.in.matrices.push(...(d.observation_matrices?.in || []))
    acc.in.leads.push(...(d.leads?.in || []))
  }
}

// TaxonWorks lists a key once per leaf that reaches this taxon: keep one
const uniq = (list) => list.filter((x, i) => list.findIndex((y) => y.id === x.id) === i)

onMounted(() => {
  const params = { otu_id: props.otuId }
  useOtuPageRequest('panel keys', () => TaxonWorks.getKeys(props.otuId, { signal: controller.signal, params }))
    .then(async ({ data }) => {
      const acc = {
        to: { matrices: [...data.observation_matrices.scoped], leads: [...data.leads.scoped] },
        in: { matrices: [...data.observation_matrices.in], leads: [...data.leads.in] }
      }
      await mergeCoordinateKeys(acc)
      for (const g of [acc.to, acc.in]) {
        g.matrices = uniq(g.matrices)
        g.leads = uniq(g.leads)
      }
      keys.value = acc
    })
    .catch(() => {})
})

onBeforeUnmount(() => {
  controller?.abort()
})
</script>

<style scoped>
.soi-keys-sec + .soi-keys-sec {
  margin-top: 0.9rem;
}
.soi-keys-head {
  margin: 0 0 0.3rem;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--soi-ink-soft);
}
.soi-keys-help {
  margin-left: 0.35rem;
  font-weight: 400;
  letter-spacing: 0;
  text-transform: none;
  font-size: 0.78rem;
}
.soi-keys-list {
  margin: 0;
  padding: 0;
  list-style: none;
}
.soi-key {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.45rem 0;
}
.soi-key + .soi-key {
  border-top: 1px solid color-mix(in srgb, var(--soi-rule) 60%, transparent);
}
.soi-key-icon {
  flex: none;
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--soi-olive) 12%, transparent);
}
.soi-key-icon svg {
  width: 1.05rem;
  height: 1.05rem;
  fill: none;
  stroke: var(--soi-olive);
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.soi-key-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  line-height: 1.3;
}
.soi-key-name {
  font-family: 'Fraunces', Georgia, serif;
  font-size: 0.98rem;
  color: var(--soi-ink);
  text-decoration: underline;
  text-decoration-color: var(--soi-yellow);
  text-decoration-thickness: 2px;
  text-underline-offset: 3px;
}
.soi-key-name:hover {
  text-decoration-color: var(--soi-yellow-deep);
}
.soi-key-kind {
  font-size: 0.74rem;
  color: var(--soi-ink-soft);
}
.soi-key-langs {
  display: flex;
  gap: 0.3rem;
}
.soi-key-lang {
  padding: 0.05rem 0.55rem;
  border-radius: 999px;
  border: 1px solid var(--soi-rule);
  background: var(--soi-card);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: var(--soi-ink);
}
.soi-key-lang:hover {
  border-color: var(--soi-ink);
  background: var(--soi-ink);
  color: var(--soi-paper);
}
</style>
