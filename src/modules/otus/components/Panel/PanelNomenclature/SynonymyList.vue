<template>
  <!-- The name's history as a synonymy list, as in a revision:
       one paragraph per original name, its later uses in date order -->
  <div class="soi-syn">
    <section
      v-for="g in visibleGroups"
      :key="g.key"
      :class="['soi-syn-group', { invalid: !g.valid }]"
    >
      <p class="soi-syn-head">
        <span
          class="soi-syn-name"
          v-html="g.nameHtml"
        />
        <template v-if="g.original">
          {{ ' ' }}<RefLink
            :entry="g.original"
            :open-key="openKey"
            @toggle="toggle"
          />
        </template>
        <span
          v-if="g.original"
          class="soi-syn-tag sea"
          >{{ t('original') }}</span
        >
        <span
          v-if="!g.valid"
          class="soi-syn-tag terra"
          >{{ t('invalid') }}</span
        >
        <span
          v-for="tag in g.originalTags"
          :key="tag"
          class="soi-syn-tag"
          >{{ tag }}</span
        >
      </p>
      <p
        v-if="g.typeLine"
        class="soi-syn-type"
      >
        {{ g.typeLine }}
      </p>
      <RefCard
        v-if="g.original && openKey === keyOf(g.original)"
        :entry="g.original"
      />

      <ul class="soi-syn-uses">
        <li
          v-for="u in g.uses"
          :key="keyOf(u.entry)"
        >
          <span
            :class="['soi-syn-dash', u.tone || (u.tag ? 'olive' : '')]"
            :title="u.tag || null"
            ><i /></span
          >
          <RefLink
            :entry="u.entry"
            :open-key="openKey"
            @toggle="toggle"
          />
          <span
            v-if="u.note"
            class="soi-syn-note"
          >
            (<span v-html="u.note" />)</span
          >
          <RefCard
            v-if="openKey === keyOf(u.entry)"
            :entry="u.entry"
          />
        </li>
      </ul>
    </section>

    <button
      v-if="groups.length > visibleGroups.length"
      type="button"
      class="soi-syn-more"
      @click="showAll = true"
    >
      {{ t('more', { n: groups.length - visibleGroups.length }) }}
    </button>
  </div>
</template>

<script setup>
import { ref, computed, h, watch, inject } from 'vue'
import CopyRefButton from '@/components/Copy/CopyRefButton.vue'
import { useOtuStore } from '@/modules/otus/store/store'
import { shortTypeLabel } from '../PanelTypeSpecimen/parseTypeLabel'
import { splitLabel, splitRef, entryKind, RELATION_RE } from './nomenEntry'
import { useT } from '@/utils/soiLang.js'

const props = defineProps({
  entries: { type: Array, required: true },
  // show every name at once (when filtering by name or year)
  expanded: { type: Boolean, default: false }
})

const t = useT({
  en: {
    invalid: 'invalid',
    original: 'original description',
    onlyPub: 'Only this publication',
    synonym: 'synonym',
    homonym: 'homonym',
    more: 'Show the other {n} names',
    newComb: 'new comb.',
    newPlace: 'new placement',
    typeDes: 'type designation',
    nomenNudum: 'nomen nudum',
    unavailable: 'unavailable',
    type: 'Type',
    typeSpecies: 'Type species',
    openRef: 'Show the full reference'
  },
  it: {
    invalid: 'non valido',
    original: 'descrizione originale',
    onlyPub: 'Solo questa pubblicazione',
    synonym: 'sinonimo',
    homonym: 'omonimo',
    more: 'Mostra gli altri {n} nomi',
    newComb: 'comb. nuova',
    newPlace: 'nuova collocazione',
    typeDes: 'designazione del tipo',
    nomenNudum: 'nomen nudum',
    unavailable: 'non disponibile',
    type: 'Tipo',
    typeSpecies: 'Specie tipo',
    openRef: 'Mostra il riferimento completo'
  }
})

const store = useOtuStore()
const timeline = computed(() => store.catalog.timeline || [])
const keyOf = (e) => timeline.value.indexOf(e)

// ── one open reference at a time ──
const openKey = ref(null)
function toggle(k) {
  openKey.value = openKey.value === k ? null : k
}

// the clickable short reference ("Peck, 1988: 33")
const RefLink = (p, { emit }) => {
  const e = p.entry
  const parts = splitLabel(e)
  const ref = splitRef(parts.ref || '').ref
  const source = store.catalog.sourceById?.[e.source_id]
  if (!ref) return null
  if (!source) return h('span', { class: 'soi-syn-ref', innerHTML: ref })
  return h('button', {
    type: 'button',
    class: ['soi-syn-ref', 'link', { open: p.openKey === keyOf(e) }],
    title: t('openRef'),
    'aria-expanded': p.openKey === keyOf(e),
    onClick: () => emit('toggle', keyOf(e)),
    innerHTML: ref
  })
}
RefLink.props = ['entry', 'openKey']
RefLink.emits = ['toggle']

// the full reference, as an index card
const pickSource = inject('soiPickSource', null)
const RefCard = (p) => {
  const source = store.catalog.sourceById?.[p.entry.source_id]
  if (!source) return null
  return h('div', { class: 'soi-syn-card' }, [
    h('span', { innerHTML: source.html }),
    h('div', { class: 'mt-1 flex items-center' }, [
      h(CopyRefButton, { reference: source.html }),
      pickSource &&
        h('button', { type: 'button', class: 'soi-only-pub', onClick: () => pickSource(p.entry.source_id) }, t('onlyPub'))
    ])
  ])
}
RefCard.props = ['entry']

// ── reading one entry ──
const italicPart = (html = '') => (html.match(/<i>[\s\S]*<\/i>/)?.[0] || html).replace(/<[^>]+>/g, '').trim()
function readEntry(e) {
  const parts = splitLabel(e)
  const name = parts.name || ''
  // "(subjective synonym of <i>Musca ribesii</i> Linnaeus, 1758)" at the end of the name part
  const rel = name.match(/\s\(([a-z][a-z ]*?\s(?:of|by|for)\s[\s\S]*)\)\s*$/)
  const usedName = rel ? name.slice(0, rel.index) : name
  return { parts, usedName, relation: rel ? rel[1] : '', kind: entryKind(e, timeline.value) }
}

// ── group by original name (protonym) ──
const protonymOf = (e) => {
  const ids = e.protonym_ids || []
  // the protonym whose original description is in this list
  return ids.find((id) => timeline.value.some((x) => x.taxon_name_id === id && (x.protonym_ids || []).includes(id))) ?? ids[0]
}

const groups = computed(() => {
  const validId = store.taxon?.cached_valid_taxon_name_id || store.taxon?.id
  const map = new Map()
  for (const e of props.entries) {
    const pid = protonymOf(e)
    if (!map.has(pid)) map.set(pid, { key: String(pid), pid, entries: [] })
    map.get(pid).entries.push(e)
  }
  const list = [...map.values()].map((g) => {
    const original = g.entries.find((e) => e.taxon_name_id === g.pid && !readEntry(e).parts.inWord && !RELATION_RE.test(e.label))
    const first = original || g.entries[0]
    const r = readEntry(first)
    const nameHtml = original ? r.usedName : (r.usedName || '').replace(/\s*\([^)]*\)\s*$/, '')
    const tags = []
    if (original) {
      const k = r.kind.text
      if (k === 'Nomen nudum') tags.push(t('nomenNudum'))
      if (k === 'Unavailable') tags.push(t('unavailable'))
    }
    let typeLine = ''
    const tl = String(original?.type_label || '').trim()
    if (tl) typeLine = /^type species/i.test(tl) ? `${t('typeSpecies')}: ${tl.replace(/^type species\s*/i, '').replace(/<[^>]+>/g, '')}` : `${t('type')}: ${shortTypeLabel(tl)}`
    const base = italicPart(nameHtml)
    const uses = g.entries
      .filter((e) => e !== original)
      .sort((a, b) => (a.year || 0) - (b.year || 0))
      .map((e) => {
        const x = readEntry(e)
        const notes = []
        // name as used, when it differs from the original combination
        const used = italicPart(x.usedName)
        if (used && used !== base) notes.push(x.usedName.replace(/\s*\((?:[A-Z][^()]*\d{4}[a-z]?)\)\s*$/, '').replace(/\s+[A-Z][^<]*\d{4}[a-z]?\s*$/, ''))
        if (x.relation) notes.push(x.relation)
        let tag = ''
        let tone = ''
        const k = x.kind.text
        if (k === 'New combination') tag = t('newComb')
        else if (k === 'New placement') tag = t('newPlace')
        else if (k === 'Type designation') { tag = t('typeDes'); tone = 'ink' }
        else if (k === 'Nomen nudum') { tag = t('nomenNudum'); tone = 'terra' }
        else if (k === 'Unavailable') { tag = t('unavailable'); tone = 'terra' }
        if (x.relation) {
          const homo = /homonym|replaced/i.test(x.relation)
          tone = homo ? 'terra' : 'amber'
          if (!tag) tag = homo ? t('homonym') : /synonym/i.test(x.relation) ? t('synonym') : ''
        }
        return { entry: e, note: notes.join('; '), tag, tone }
      })
    return {
      key: g.key,
      valid: g.pid === validId || (store.taxon?.id && g.pid === store.taxon.id && store.taxon.is_valid),
      year: Number(first.year) || 9999,
      nameHtml,
      original,
      originalTags: tags,
      typeLine,
      uses
    }
  })
  // the valid name first, then the others by year
  return list.sort((a, b) => Number(b.valid) - Number(a.valid) || a.year - b.year)
})

const showAll = ref(false)
watch(() => props.entries, () => (showAll.value = false))
const visibleGroups = computed(() =>
  showAll.value || props.expanded || groups.value.length <= 4 ? groups.value : groups.value.slice(0, 3)
)
</script>

<style scoped>
.soi-syn {
  padding: 0.4rem 1.25rem 0.9rem;
}
.soi-syn-group {
  padding: 0.65rem 0 0.7rem;
  border-bottom: 1px dashed var(--soi-rule);
}
.soi-syn-group:last-of-type {
  border-bottom: 0;
}
.soi-syn-head {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.45;
  color: var(--soi-ink);
}
.soi-syn-name {
  font-family: 'Fraunces', Georgia, serif;
  font-weight: 600;
}
.soi-syn-group.invalid .soi-syn-name {
  font-weight: 400;
}
.soi-syn-name :deep(i),
.soi-syn-note :deep(i),
.soi-syn-card :deep(i) {
  font-style: italic;
}
.soi-syn-type {
  margin: 0.1rem 0 0;
  font-size: 0.78rem;
  color: var(--soi-ink-soft);
}
.soi-syn-uses {
  margin: 0.3rem 0 0;
  padding: 0;
  list-style: none;
}
.soi-syn-uses li {
  padding: 0.12rem 0 0.12rem 1.2rem;
  text-indent: -1.2rem;
  font-size: 0.85rem;
  line-height: 1.45;
  color: var(--soi-ink-soft);
}
.soi-syn-dash {
  display: inline-block;
  width: 1.2rem;
  text-indent: 0;
  vertical-align: 1px;
  --dot: var(--soi-rule);
}
.soi-syn-dash i {
  display: inline-block;
  width: 0.7rem;
  height: 3px;
  border-radius: 2px;
  background: var(--dot);
}
.soi-syn-dash.olive { --dot: var(--soi-olive); }
.soi-syn-dash.amber { --dot: var(--soi-yellow-deep); }
.soi-syn-dash.terra { --dot: var(--soi-terra); }
.soi-syn-dash.ink { --dot: var(--soi-ink); }
.soi-syn-note {
  color: var(--soi-ink-soft);
}
:deep(.soi-syn-ref) {
  color: var(--soi-ink);
}
:deep(.soi-syn-ref.link) {
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  text-indent: 0;
  cursor: pointer;
  text-decoration: underline;
  text-decoration-color: color-mix(in srgb, var(--soi-yellow) 80%, transparent);
  text-decoration-thickness: 2px;
  text-underline-offset: 3px;
}
:deep(.soi-syn-ref.link:hover),
:deep(.soi-syn-ref.link.open) {
  color: var(--soi-yellow-deep);
}
.soi-syn-tag {
  display: inline-block;
  margin-left: 0.45rem;
  padding: 0.02rem 0.5rem;
  border-radius: 999px;
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  line-height: 1.5;
  text-indent: 0;
  vertical-align: 1px;
  white-space: nowrap;
  --pill: var(--soi-olive);
  color: var(--pill);
  background: color-mix(in srgb, var(--pill) 13%, transparent);
  border: 1px solid color-mix(in srgb, var(--pill) 30%, transparent);
}
.soi-syn-tag.sea { --pill: var(--soi-sea); }
.soi-syn-tag.terra { --pill: var(--soi-terra); }
.soi-syn-tag.amber { --pill: var(--soi-yellow-deep); }
.soi-syn-tag.ink { --pill: var(--soi-ink); }

:deep(.soi-only-pub) {
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
:deep(.soi-syn-card) {
  margin: 0.4rem 0 0.3rem;
  padding: 0.55rem 0.75rem;
  text-indent: 0;
  background: var(--soi-card);
  border: 1px solid var(--soi-rule);
  border-top: 3px double var(--soi-rule);
  font-size: 0.8rem;
  color: var(--soi-ink);
}
:deep(.soi-syn-card a) {
  color: var(--soi-yellow-deep);
  word-break: break-all;
}
.soi-syn-more {
  margin-top: 0.4rem;
  padding: 0;
  border: 0;
  background: none;
  font-size: 0.85rem;
  color: var(--soi-yellow-deep);
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
}
</style>
