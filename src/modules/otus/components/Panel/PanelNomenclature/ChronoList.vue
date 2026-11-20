<template>
  <!-- The same entries as a story: by decade, oldest first.
       Entries of the same year and act in the same work are folded into one line. -->
  <div class="soi-chr">
    <section
      v-for="d in decades"
      :key="d.decade"
      class="soi-chr-decade"
    >
      <h4 class="soi-chr-dec">{{ d.decade }}s</h4>
      <ul>
        <li
          v-for="row in d.rows"
          :key="row.key"
          :class="['soi-chr-row', `tone-${row.tone}`]"
        >
          <span class="soi-chr-year">{{ row.year }}</span>
          <span class="soi-chr-text">
            <template v-if="row.count > 1">
              <strong>{{ t(row.countKey, { n: row.count }) }}</strong>
              <span class="soi-chr-names">
                (<template
                  v-for="(n, i) in openNames.has(row.key) ? row.names : row.names.slice(0, 3)"
                  :key="i"
                  ><span v-if="i">, </span><span v-html="n" /></template
                ><button
                  v-if="row.names.length > 3"
                  type="button"
                  class="soi-chr-more"
                  @click="toggleNames(row.key)"
                >
                  {{ openNames.has(row.key) ? t('less') : t('moreN', { n: row.names.length - 3 }) }}</button
                >)</span
              >
            </template>
            <span
              v-else
              class="soi-chr-name"
              v-html="row.names[0]"
            />
            <template v-if="row.ref">
              <span class="soi-chr-in">{{ row.inWord ? ' ' + t('in') + ' ' : ' ' }}</span>
              <button
                v-if="row.source"
                type="button"
                class="soi-chr-ref"
                :aria-expanded="openKey === row.key"
                @click="openKey = openKey === row.key ? null : row.key"
                v-html="row.ref"
              />
              <span
                v-else
                v-html="row.ref"
              />
            </template>
          </span>
          <span class="soi-chr-act">{{ row.act }}</span>
          <div
            v-if="openKey === row.key && row.source"
            class="soi-chr-card"
          >
            <span v-html="row.source.html" />
            <div class="mt-1 flex items-center">
              <CopyRefButton :reference="row.source.html" />
              <button
                v-if="pickSource && row.sourceId"
                type="button"
                class="soi-only-pub"
                @click="pickSource(row.sourceId)"
              >
                {{ t('onlyPub') }}
              </button>
            </div>
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, inject } from 'vue'
import { useOtuStore } from '@/modules/otus/store/store'
import { splitLabel, splitRef, entryKind } from './nomenEntry'
import { useT } from '@/utils/soiLang.js'
import CopyRefButton from '@/components/Copy/CopyRefButton.vue'

const props = defineProps({
  entries: { type: Array, required: true }
})

const pickSource = inject('soiPickSource', null)
const t = useT({
  en: {
    onlyPub: 'Only this publication',
    in: 'in',
    synN: '{n} names made synonyms',
    combN: '{n} new combinations',
    citedN: '{n} names cited',
    otherN: '{n} acts',
    'Original description': 'original description',
    'New combination': 'new combination',
    Combination: 'combination',
    'New placement': 'new placement',
    Placement: 'placement',
    Cited: 'cited',
    'Type designation': 'type designation',
    'Nomen nudum': 'nomen nudum',
    Unavailable: 'unavailable',
    'Subjective synonym': 'subjective synonym',
    'Objective synonym': 'objective synonym',
    'Synonymic homonym': 'synonymic homonym',
    Homonym: 'homonym',
    'Primary homonym': 'primary homonym',
    'Secondary homonym': 'secondary homonym',
    'Replaced name': 'replaced name',
    'Replacement name': 'replacement name',
    nowSyn: 'original description (now a synonym)',
    moreN: '\u00a0+{n} more',
    less: '\u00a0less'
  },
  it: {
    onlyPub: 'Solo questa pubblicazione',
    in: 'in',
    synN: '{n} nomi messi in sinonimia',
    combN: '{n} nuove combinazioni',
    citedN: '{n} nomi citati',
    otherN: '{n} atti',
    'Original description': 'descrizione originale',
    'New combination': 'nuova combinazione',
    Combination: 'combinazione',
    'New placement': 'nuova collocazione',
    Placement: 'collocazione',
    Cited: 'citazione',
    'Type designation': 'designazione del tipo',
    'Nomen nudum': 'nomen nudum',
    Unavailable: 'non disponibile',
    'Subjective synonym': 'sinonimo soggettivo',
    'Objective synonym': 'sinonimo oggettivo',
    'Synonymic homonym': 'omonimo sinonimico',
    Homonym: 'omonimo',
    'Primary homonym': 'omonimo primario',
    'Secondary homonym': 'omonimo secondario',
    'Replaced name': 'nome sostituito',
    'Replacement name': 'nome sostitutivo',
    nowSyn: 'descrizione originale (ora sinonimo)',
    moreN: '\u00a0+altri {n}',
    less: '\u00a0meno'
  }
})

const store = useOtuStore()
const openKey = ref(null)
// long lists of names in a folded line: first three, the rest on request
const openNames = ref(new Set())
function toggleNames(k) {
  const s = new Set(openNames.value)
  s.has(k) ? s.delete(k) : s.add(k)
  openNames.value = s
}
const validId = computed(() => store.taxon?.cached_valid_taxon_name_id || store.taxon?.id)

// name without the relationship and without its author: "<i>Musca pyrorum</i>"
const bareName = (html = '') =>
  html
    .replace(/\s\(([a-z][a-z ]*?\s(?:of|by|for)\s[\s\S]*)\)\s*$/, '')
    .replace(/\s*\((?:[A-Z][^()]*\d{4}[a-z]?)\)\s*$/, '')
    .replace(/\s+[A-Z][^<]*\d{4}[a-z]?\s*$/, '')
    .trim()

const decades = computed(() => {
  const tl = store.catalog.timeline || []
  const rows = new Map()
  for (const e of [...props.entries].sort((a, b) => (a.year || 0) - (b.year || 0))) {
    const parts = splitLabel(e)
    const { ref } = splitRef(parts.ref || '')
    const kind = entryKind(e, tl)
    const isOriginalOfSynonym = kind.text === 'Original description' && !(e.protonym_ids || []).includes(validId.value)
    const act = isOriginalOfSynonym ? t('nowSyn') : t(kind.text)
    // same year, same work, same act → one line ("9 names made synonyms")
    const fold = ['syn', 'comb', 'muted'].includes(kind.tone)
    const key = fold ? `${e.year}|${e.source_id}|${kind.text}` : `${e.year}|${tl.indexOf(e)}`
    if (!rows.has(key)) {
      rows.set(key, {
        key,
        year: e.year,
        tone: kind.tone,
        act,
        ref,
        inWord: parts.inWord,
        source: store.catalog.sourceById?.[e.source_id],
        sourceId: e.source_id,
        countKey: kind.tone === 'syn' ? 'synN' : kind.tone === 'comb' ? 'combN' : kind.tone === 'muted' ? 'citedN' : 'otherN',
        names: [],
        count: 0
      })
    }
    const row = rows.get(key)
    row.count++
    row.names.push(bareName(parts.name))
  }
  const byDecade = new Map()
  for (const r of rows.values()) {
    const d = Math.floor((Number(r.year) || 0) / 10) * 10
    if (!byDecade.has(d)) byDecade.set(d, { decade: d, rows: [] })
    byDecade.get(d).rows.push(r)
  }
  return [...byDecade.values()].sort((a, b) => a.decade - b.decade)
})
</script>

<style scoped>
.soi-chr {
  padding: 0.3rem 1.25rem 0.9rem;
}
.soi-chr-decade {
  display: grid;
  grid-template-columns: 3.2rem 1fr;
  gap: 0 0.8rem;
  padding: 0.5rem 0;
  border-bottom: 1px dashed var(--soi-rule);
}
.soi-chr-decade:last-child {
  border-bottom: 0;
}
.soi-chr-dec {
  margin: 0.1rem 0 0;
  font-family: 'Fraunces', Georgia, serif;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--soi-ink-soft);
}
.soi-chr-decade ul {
  margin: 0;
  padding: 0;
  list-style: none;
}
.soi-chr-row {
  display: grid;
  grid-template-columns: 2.6rem 1fr auto;
  gap: 0 0.6rem;
  align-items: baseline;
  padding: 0.15rem 0;
  font-size: 0.86rem;
  line-height: 1.45;
  --tone: var(--soi-ink-soft);
}
.soi-chr-year {
  font-variant-numeric: tabular-nums;
  color: var(--soi-ink-soft);
}
.soi-chr-text {
  min-width: 0;
  color: var(--soi-ink);
}
.soi-chr-text :deep(i),
.soi-chr-card :deep(i) {
  font-style: italic;
}
.soi-chr-names {
  color: var(--soi-ink-soft);
}
.soi-chr-more {
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  color: var(--soi-yellow-deep);
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.soi-chr-in {
  color: var(--soi-ink-soft);
}
.soi-chr-ref {
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  color: var(--soi-ink);
  cursor: pointer;
  text-decoration: underline;
  text-decoration-color: color-mix(in srgb, var(--soi-yellow) 80%, transparent);
  text-decoration-thickness: 2px;
  text-underline-offset: 3px;
}
.soi-chr-ref:hover,
.soi-chr-ref[aria-expanded='true'] {
  color: var(--soi-yellow-deep);
}
.soi-chr-act {
  justify-self: end;
  padding: 0.02rem 0.5rem;
  border-radius: 999px;
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  line-height: 1.5;
  white-space: nowrap;
  color: var(--tone);
  background: color-mix(in srgb, var(--tone) 13%, transparent);
  border: 1px solid color-mix(in srgb, var(--tone) 30%, transparent);
}
.soi-chr-card {
  grid-column: 2 / -1;
  margin: 0.35rem 0 0.3rem;
  padding: 0.55rem 0.75rem;
  background: var(--soi-card);
  border: 1px solid var(--soi-rule);
  border-top: 3px double var(--soi-rule);
  font-size: 0.8rem;
}
.soi-chr-card :deep(a) {
  color: var(--soi-yellow-deep);
  word-break: break-all;
}
.tone-orig { --tone: var(--soi-sea); }
.tone-comb { --tone: var(--soi-olive); }
.tone-syn { --tone: var(--soi-yellow-deep); }
.tone-warn { --tone: var(--soi-terra); }
.tone-type { --tone: var(--soi-ink); }
@media (max-width: 560px) {
  .soi-chr-row {
    grid-template-columns: 2.6rem 1fr;
  }
  .soi-chr-act {
    grid-column: 2;
    justify-self: start;
  }
}

.soi-only-pub {
  margin-left: 0.6rem;
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  font-size: 0.78rem;
  color: var(--soi-yellow-deep);
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
}
</style>
