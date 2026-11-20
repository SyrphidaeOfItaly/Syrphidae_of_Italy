<template>
  <VCard>
    <VSpinner
      v-if="store.catalog.isLoading"
      logo-class="w-8 h-8"
      legend=""
    />
    <VCardHeader class="flex justify-between">
      <h2 class="text-md">
        {{ t('title') }} ({{ store.catalog.timeline.length }})
      </h2>
      <PanelDropdown
        :menu-options="menuOptions"
        panel-key="taxonomy"
      />
    </VCardHeader>

    <!-- The history in one line, then how to read it -->
    <div class="soi-nom-top px-5 pt-3 pb-2">
      <p
        v-if="summary.length"
        class="soi-nom-summary"
      >
        <template
          v-for="(part, i) in summary"
          :key="i"
        >
          <span
            v-if="i"
            class="soi-nom-sep"
          > · </span><span v-html="part" />
        </template>
      </p>
      <div
        class="soi-nom-view"
        role="group"
        :aria-label="t('view')"
      >
        <button
          type="button"
          :class="{ on: view === 'name' }"
          :aria-pressed="view === 'name'"
          @click="setView('name')"
        >
          {{ t('byName2') }}
        </button>
        <button
          type="button"
          :class="{ on: view === 'date' }"
          :aria-pressed="view === 'date'"
          @click="setView('date')"
        >
          {{ t('byDate') }}
        </button>
      </div>
    </div>

    <!-- An invalid name's page: its own history, or the valid name's whole one -->
    <p
      v-if="store.catalog.scoped"
      class="soi-nom-note px-5 py-2"
    >
      <template v-if="store.catalog.showingOwn">
        {{ t('ownOnly') }}
        <button
          type="button"
          class="soi-nom-link"
          @click="store.setOwnHistory(false)"
        >
          {{ t('showFull', { n: store.catalog.timelineAll.length }) }}
        </button>
      </template>
      <template v-else>
        {{ t('fullHistory') }}
        <button
          type="button"
          class="soi-nom-link"
          @click="store.setOwnHistory(true)"
        >
          {{ t('showOwn', { n: store.catalog.ownTimeline.length }) }}
        </button>
      </template>
    </p>

    <!-- A valid name's page: the original names it brings together -->
    <nav
      v-else-if="nameGroups.length > 1"
      class="soi-nom-names px-5 py-2"
      :aria-label="t('byName')"
    >
      <span class="soi-nom-names-label">{{ t('names') }}</span>
      <button
        type="button"
        :class="['soi-nom-name', { on: !group }]"
        :aria-pressed="!group"
        @click="group = null"
      >
        {{ t('all') }} <sup>{{ store.catalog.timeline.length }}</sup>
      </button>
      <button
        v-for="g in shownNames"
        :key="g.key"
        type="button"
        :class="['soi-nom-name', { on: group === g.key, invalid: !g.valid }]"
        :aria-pressed="group === g.key"
        :title="g.valid ? t('validTip') : t('invalidTip')"
        @click="group = group === g.key ? null : g.key"
      >
        <span v-html="g.html" />
        <span
          v-if="!g.valid"
          class="soi-nom-inv"
          >{{ t('inv') }}</span
        >
        <sup>{{ g.count }}</sup>
      </button>
      <button
        v-if="nameGroups.length > NAMES_SHOWN"
        type="button"
        class="soi-nom-link"
        @click="allNames = !allNames"
      >
        {{ allNames ? t('fewer') : t('more', { n: nameGroups.length - NAMES_SHOWN }) }}
      </button>
    </nav>

    <NomenRuler
      :entries="groupTimeline"
      :timeline="store.catalog.timeline || []"
      :selected-year="yearFilter"
      @select="pickYear"
    />

    <div
      v-if="yearFilter || pubFilter"
      class="soi-nom-year px-5 py-2"
    >
      <span
        v-if="yearFilter"
        class="soi-serif"
        >{{ yearFilter }}</span
      >
      <span
        v-else
        class="soi-serif"
        >{{ pubLabel(pubFilter) }}</span
      >
      <span>{{ filteredTimeline.length === 1 ? t('entry1') : t('entryN', { n: filteredTimeline.length }) }}</span>
      <button
        type="button"
        class="soi-nom-link"
        @click="clearFilters"
      >
        {{ yearFilter ? t('allYears') : t('allPubs') }}
      </button>
      <!-- the publications of that year: pick one -->
      <span
        v-if="yearFilter && yearPubs.length > 1"
        class="soi-nom-pubs"
      >
        <button
          type="button"
          :class="['soi-nom-pub', { on: !pubFilter }]"
          @click="pubFilter = null"
        >
          {{ t('allPubsShort', { n: yearPubs.length }) }}
        </button>
        <button
          v-for="p in yearPubs"
          :key="p.id"
          type="button"
          :class="['soi-nom-pub', { on: pubFilter === p.id }]"
          @click="pubFilter = pubFilter === p.id ? null : p.id"
        >
          {{ p.label }} <sup>{{ p.n }}</sup>
        </button>
      </span>
    </div>

    <SynonymyList
      v-if="view === 'name'"
      :entries="filteredTimeline"
      :expanded="showAll || !!group || !!yearFilter || !!pubFilter"
    />
    <ChronoList
      v-else
      :entries="filteredTimeline"
    />
  </VCard>
</template>

<script setup>
import { ref, computed, watch, provide } from 'vue'
import { useOtuStore } from '@/modules/otus/store/store'
import SynonymyList from './SynonymyList.vue'
import ChronoList from './ChronoList.vue'
import { splitLabel, splitRef, entryKind } from './nomenEntry'
import PanelDropdown from '../PanelDropdown.vue'
import NomenRuler from './NomenRuler.vue'
import { useT } from '@/utils/soiLang.js'

const MAX_CITATIONS = 2

defineProps({
  otuId: { type: [Number, String], required: true },
  taxonId: { type: [Number, String], required: true },
  taxon: { type: Object, default: undefined },
  otu: { type: Object, default: undefined }
})

const t = useT({
  en: {
    title: 'Nomenclature',
    ownOnly: 'Only the history of this name.',
    showFull: 'Show the whole history of the valid name ({n})',
    fullHistory: 'The whole history of the valid name.',
    showOwn: 'Only this name ({n})',
    byName: 'Filter by name',
    names: 'Names',
    all: 'All',
    validTip: 'The valid name and its combinations',
    invalidTip: 'An invalid name (synonym) of this species',
    entry1: '1 entry',
    entryN: '{n} entries',
    allYears: 'Show all years',
    allPubs: 'Show all publications',
    allPubsShort: 'All {n} publications',
    showAll: 'Show all',
    showLess: 'Show less',
    inv: 'invalid',
    view: 'How to list the history',
    byName2: 'By name',
    byDate: 'By date',
    described: 'Described by {a} in {y}',
    syn1: '1 synonym ({a})',
    synN: '{n} synonyms ({a}–{b})',
    since: 'in <i>{g}</i> since {r}',
    more: '+{n} more names',
    fewer: 'fewer names'
  },
  it: {
    title: 'Nomenclatura',
    ownOnly: 'Solo la storia di questo nome.',
    showFull: 'Mostra tutta la storia del nome valido ({n})',
    fullHistory: 'Tutta la storia del nome valido.',
    showOwn: 'Solo questo nome ({n})',
    byName: 'Filtra per nome',
    names: 'Nomi',
    all: 'Tutti',
    validTip: 'Il nome valido e le sue combinazioni',
    invalidTip: 'Un nome non valido (sinonimo) di questa specie',
    entry1: '1 voce',
    entryN: '{n} voci',
    allYears: 'Mostra tutti gli anni',
    allPubs: 'Mostra tutte le pubblicazioni',
    allPubsShort: 'Tutte le {n} pubblicazioni',
    showAll: 'Mostra tutto',
    showLess: 'Mostra meno',
    inv: 'non valido',
    view: 'Come elencare la storia',
    byName2: 'Per nome',
    byDate: 'Per data',
    described: 'Descritta da {a} nel {y}',
    syn1: '1 sinonimo ({a})',
    synN: '{n} sinonimi ({a}–{b})',
    since: 'in <i>{g}</i> dal {r}',
    more: 'altri {n} nomi',
    fewer: 'meno nomi'
  }
})

const store = useOtuStore()
const showAll = ref(false)

// ── by name (synonymy list) or by date (chronology); remembered in this browser ──
let saved = 'name'
try {
  saved = localStorage.getItem('soi-nom-view') || 'name'
} catch {}
const view = ref(saved === 'date' ? 'date' : 'name')
function setView(v) {
  view.value = v
  try {
    localStorage.setItem('soi-nom-view', v)
  } catch {}
}

// ── the history in one line: described when and by whom, synonyms, current genus ──
const shortRef = (ref = '') => ref.replace(/:.*$/, '').replace(/,\s*(\d{4})/, ' $1').trim()
const firstItalic = (html = '') => (html.match(/<i>([^<\s]+)/)?.[1] || '')
const summary = computed(() => {
  const tl = store.catalog.timelineAll || store.catalog.timeline || []
  if (!tl.length) return []
  const validId = store.taxon?.cached_valid_taxon_name_id || store.taxon?.id
  const originals = tl.filter((c) => (c.protonym_ids || []).includes(c.taxon_name_id) && !splitLabel(c).inWord && entryKind(c, tl).text === 'Original description')
  const out = []
  const mine = originals.find((c) => c.taxon_name_id === validId)
  if (mine) {
    const ref = splitRef(splitLabel(mine).ref || '').ref
    const author = ref.replace(/,?\s*\d{4}.*$/, '').trim()
    if (author) out.push(t('described', { a: author, y: mine.year }))
  }
  const syns = originals.filter((c) => c.taxon_name_id !== validId)
  const ys = syns.map((c) => Number(c.year)).filter(Boolean).sort((a, b) => a - b)
  if (syns.length === 1) out.push(t('syn1', { a: ys[0] || '' }))
  else if (syns.length > 1) out.push(t('synN', { n: syns.length, a: ys[0], b: ys.at(-1) }))
  // the latest new combination of the valid name, if the genus changed
  const combs = tl.filter((c) => (c.protonym_ids || []).includes(validId) && entryKind(c, tl).text === 'New combination')
  const last = combs.sort((a, b) => (a.year || 0) - (b.year || 0)).at(-1)
  if (last && mine) {
    const g = firstItalic(splitLabel(last).name)
    if (g && g !== firstItalic(splitLabel(mine).name)) {
      out.push(t('since', { g, r: shortRef(splitRef(splitLabel(last).ref || '').ref) }))
    }
  }
  return out
})

// ── names: the original names (protonyms) this taxon brings together ──
const group = ref(null)
const yearCut = (label = '') => (String(label).match(/^(.*?\b\d{4}[a-z]?)\b/)?.[1] || label).trim()
const plainKey = (html) => html.replace(/<[^>]+>/g, '').trim()

const protonymKey = computed(() => {
  const m = new Map() // protonym id -> name key
  for (const c of store.catalog.timeline || []) {
    if ((c.protonym_ids || []).includes(c.taxon_name_id) && !m.has(c.taxon_name_id)) {
      m.set(c.taxon_name_id, plainKey(yearCut(c.label)))
    }
  }
  return m
})
const keyOf = (c) => {
  const id = (c.protonym_ids || []).find((p) => protonymKey.value.has(p))
  return id === undefined ? null : protonymKey.value.get(id)
}

const nameGroups = computed(() => {
  const validId = store.taxon?.cached_valid_taxon_name_id || store.taxon?.id
  const groups = new Map()
  for (const c of store.catalog.timeline || []) {
    if ((c.protonym_ids || []).includes(c.taxon_name_id)) {
      const key = plainKey(yearCut(c.label))
      if (!groups.has(key)) groups.set(key, { key, html: yearCut(c.label), valid: false, count: 0 })
      if (c.taxon_name_id === validId) groups.get(key).valid = true
    }
  }
  for (const c of store.catalog.timeline || []) {
    const k = keyOf(c)
    if (k && groups.has(k)) groups.get(k).count++
  }
  return [...groups.values()].sort((a, b) => Number(b.valid) - Number(a.valid))
})

// many synonyms: show the first few names, the rest on request (the chosen one always shows)
const NAMES_SHOWN = 4
const allNames = ref(false)
const shownNames = computed(() => {
  if (allNames.value || nameGroups.value.length <= NAMES_SHOWN) return nameGroups.value
  const first = nameGroups.value.slice(0, NAMES_SHOWN)
  const picked = nameGroups.value.find((g) => g.key === group.value)
  return picked && !first.includes(picked) ? [...first, picked] : first
})

const groupTimeline = computed(() => {
  const tl = store.catalog.timeline || []
  return group.value ? tl.filter((c) => keyOf(c) === group.value) : tl
})

// ── year picked on the ruler ──
const yearFilter = ref(null)
function pickYear(y) {
  yearFilter.value = yearFilter.value === y ? null : y
  pubFilter.value = null
}
// ── one publication (a year's chip, or "Only this publication" in a reference card) ──
const pubFilter = ref(null)
function pubLabel(id) {
  const c = (store.catalog.timeline || []).find((x) => x.source_id === id)
  if (!c) return ''
  return splitRef(splitLabel(c).ref).ref.replace(/\s*:.*$/, '').replace(/\.$/, '')
}
const yearPubs = computed(() => {
  const m = new Map()
  for (const c of groupTimeline.value) {
    if (Number(c.year) !== yearFilter.value || !c.source_id) continue
    if (!m.has(c.source_id)) m.set(c.source_id, { id: c.source_id, label: pubLabel(c.source_id), n: 0 })
    m.get(c.source_id).n++
  }
  return [...m.values()]
})
function clearFilters() {
  yearFilter.value = null
  pubFilter.value = null
}
provide('soiPickSource', (id) => {
  pubFilter.value = pubFilter.value === id ? null : id
  if (pubFilter.value) showAll.value = true
})
const filteredTimeline = computed(() =>
  groupTimeline.value.filter(
    (c) =>
      (!yearFilter.value || Number(c.year) === yearFilter.value) &&
      (!pubFilter.value || c.source_id === pubFilter.value)
  )
)
watch(group, (g) => {
  yearFilter.value = null
  pubFilter.value = null
  if (g) showAll.value = true
})
watch(yearFilter, (y) => {
  if (y) showAll.value = true
})


const menuOptions = computed(() => [
  {
    label: showAll.value ? t('showLess') : t('showAll'),
    action: () => (showAll.value = !showAll.value)
  }
])
</script>

<style scoped>
.soi-nom-top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.4rem 1rem;
  border-bottom: 1px dashed var(--soi-rule);
}
.soi-nom-summary {
  margin: 0;
  font-family: 'Fraunces', Georgia, serif;
  font-size: 0.92rem;
  color: var(--soi-ink);
}
.soi-nom-summary :deep(i) {
  font-style: italic;
}
.soi-nom-sep {
  color: var(--soi-ink-soft);
}
.soi-nom-view {
  display: inline-flex;
  border: 1px solid var(--soi-rule);
  border-radius: 999px;
  overflow: hidden;
}
.soi-nom-view button {
  padding: 0.15rem 0.75rem;
  border: 0;
  background: none;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--soi-ink-soft);
  cursor: pointer;
}
.soi-nom-view button.on {
  background: var(--soi-ink);
  color: var(--soi-paper);
}
.soi-nom-note,
.soi-nom-year {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.3rem 0.7rem;
  font-size: 0.85rem;
  color: var(--soi-ink-soft);
  border-bottom: 1px dashed var(--soi-rule);
}
.soi-nom-note {
  border-left: 3px solid var(--soi-terra);
}
.soi-nom-year {
  background: color-mix(in srgb, var(--soi-yellow) 14%, transparent);
}
.soi-nom-pubs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  flex-basis: 100%;
  margin-top: 0.2rem;
}
.soi-nom-pub {
  padding: 0.05rem 0.6rem;
  border-radius: 999px;
  border: 1px solid var(--soi-rule);
  background: var(--soi-card);
  font: inherit;
  font-size: 0.78rem;
  color: var(--soi-ink);
  cursor: pointer;
}
.soi-nom-pub:hover {
  border-color: var(--soi-yellow-deep);
}
.soi-nom-pub.on {
  background: var(--soi-ink);
  border-color: var(--soi-ink);
  color: var(--soi-paper);
}
.soi-nom-pub sup {
  font-size: 0.65em;
  opacity: 0.7;
}
.soi-nom-year .soi-serif {
  font-size: 1.15rem;
  color: var(--soi-ink);
}
.soi-nom-link {
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  color: var(--soi-yellow-deep);
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
}
.soi-nom-names {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.25rem 1.1rem;
  border-bottom: 1px dashed var(--soi-rule);
}
.soi-nom-names-label {
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--soi-ink-soft);
}
.soi-nom-name {
  padding: 0 0 0.1rem;
  border: 0;
  border-bottom: 2px solid transparent;
  background: none;
  font-family: 'Fraunces', Georgia, serif;
  font-size: 0.9rem;
  color: var(--soi-ink-soft);
  cursor: pointer;
}
.soi-nom-name :deep(i) {
  font-style: italic;
}
.soi-nom-name sup {
  margin-left: 0.15rem;
  font-family: 'Source Sans 3', system-ui, sans-serif;
  font-size: 0.65rem;
}
.soi-nom-name:hover {
  color: var(--soi-ink);
}
.soi-nom-name.on {
  color: var(--soi-ink);
  border-bottom-color: var(--soi-yellow);
}
.soi-nom-inv {
  margin-left: 0.3rem;
  font-family: 'Source Sans 3', system-ui, sans-serif;
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--soi-terra);
}
</style>
