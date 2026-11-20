<template>
  <!-- One entry of the name's history, as a line in a field notebook:
       year in the margin, then the kind of act, the name and the reference -->
  <li :class="['soi-led', `tone-${kind.tone}`]">
    <div
      class="soi-led-year"
      aria-hidden="true"
    >
      {{ citation.year || '' }}
    </div>
    <div class="soi-led-body">
      <div
        class="soi-led-kind"
        :title="t(kind.help)"
      >
        {{ t(kind.text) }}
      </div>
      <div
        class="soi-led-name"
        v-html="parts.name"
      />
      <div
        v-if="parts.ref"
        class="soi-led-ref"
      >
        <span v-if="parts.inWord">{{ t('in') + '\u00a0' }}</span>
        <button
          v-if="source"
          type="button"
          class="soi-led-cite"
          :aria-expanded="open"
          :title="t('openRef')"
          @click="open = !open"
          v-html="refSplit.ref"
        />
        <span
          v-else
          v-html="refSplit.ref"
        />
        <span
          v-if="shownTopics.length"
          class="soi-led-topics"
        >
          — {{ shownTopics.join(', ') }}</span
        >
      </div>
      <p
        v-if="typeLine"
        class="soi-led-type"
      >
        {{ typeLine.isSpecies ? t('type') : t('typeSpecies') }}:
        <span v-html="typeLine.html" />
      </p>

      <!-- the full reference, like an index card pulled from the drawer -->
      <div
        v-if="source && open"
        class="soi-led-card"
      >
        <span v-html="source.html" />
        <div class="mt-1">
          <CopyRefButton :reference="source.html" />
        </div>
      </div>
    </div>
  </li>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useOtuStore } from '@/modules/otus/store/store'
import { shortTypeLabel } from '../PanelTypeSpecimen/parseTypeLabel'
import { splitLabel, splitRef, entryKind } from './nomenEntry'
import { useT } from '@/utils/soiLang.js'
import CopyRefButton from '@/components/Copy/CopyRefButton.vue'

const props = defineProps({
  citation: { type: Object, required: true }
})

const store = useOtuStore()
const open = ref(false)

const t = useT({
  en: { in: 'in', openRef: 'Show the full reference', type: 'Type', typeSpecies: 'Type species' },
  it: {
    in: 'in',
    openRef: 'Mostra il riferimento completo',
    type: 'Tipo',
    typeSpecies: 'Specie tipo',
    'Original description': 'Descrizione originale',
    'New combination': 'Nuova combinazione',
    Combination: 'Combinazione',
    'New placement': 'Nuova collocazione',
    Placement: 'Collocazione',
    Cited: 'Citazione',
    'Type designation': 'Designazione del tipo',
    'Nomen nudum': 'Nomen nudum',
    Unavailable: 'Non disponibile',
    'Subjective synonym': 'Sinonimo soggettivo',
    'Objective synonym': 'Sinonimo oggettivo',
    'Synonymic homonym': 'Omonimo sinonimico',
    Homonym: 'Omonimo',
    'Replaced name': 'Nome sostituito',
    'Replacement name': 'Nome sostitutivo',
    'The name as first published (protonym)': 'Il nome come pubblicato la prima volta (protonimo)',
    'First use of this combination': 'Primo uso di questa combinazione',
    'Later use of this combination': 'Uso successivo di questa combinazione',
    'First use of this rank or placement': 'Primo uso di questo rango o collocazione',
    'Later use of this rank or placement': 'Uso successivo di questo rango o collocazione',
    'The name as cited in a later work': 'Il nome citato in un lavoro successivo',
    'A lectotype or neotype is designated or cited here': 'Qui si designa o cita un lectotipo o neotipo',
    'Published without a description: not available': 'Pubblicato senza descrizione: non disponibile',
    'An unavailable or invalid name, linked to an available one': 'Nome non disponibile o non valido, collegato a uno disponibile'
  }
})

const source = computed(() => store.catalog.sourceById?.[props.citation.source_id])
const parts = computed(() => splitLabel(props.citation))
const refSplit = computed(() => splitRef(parts.value.ref || ''))
const kind = computed(() => entryKind(props.citation, store.catalog.timeline || []))
// topics already said by the kind are not repeated
const shownTopics = computed(() =>
  refSplit.value.topics.filter((x) => x.toLowerCase() !== kind.value.text.toLowerCase())
)

// "Type: Lectotype ♀ · ANSP926 · ANSP" (species) or the type species (genera)
const typeLine = computed(() => {
  const tl = String(props.citation.type_label || '').trim()
  if (!tl) return null
  if (/^type species/i.test(tl)) return { isSpecies: false, html: tl.replace(/^type species\s*/i, '') }
  return { isSpecies: true, html: shortTypeLabel(tl) }
})
</script>

<style scoped>
.soi-led {
  display: grid;
  grid-template-columns: 3.4rem 1fr;
  gap: 0 0.9rem;
  padding: 0.7rem 1.25rem 0.75rem 0.75rem;
  border-bottom: 1px dashed var(--soi-rule);
  --tone: var(--soi-ink-soft);
}
.soi-led-year {
  font-family: 'Fraunces', Georgia, serif;
  font-size: 1.05rem;
  line-height: 1.3;
  text-align: right;
  color: var(--soi-ink-soft);
  font-variant-numeric: oldstyle-nums;
  border-right: 2px solid var(--tone);
  padding-right: 0.6rem;
}
.soi-led-body {
  min-width: 0;
}
.soi-led-kind {
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--tone);
}
.soi-led-name {
  margin-top: 0.1rem;
  font-size: 0.92rem;
  color: var(--soi-ink);
  overflow-wrap: anywhere;
}
.soi-led-name :deep(i) {
  font-style: italic;
}
.soi-led-ref {
  margin-top: 0.1rem;
  font-size: 0.82rem;
  color: var(--soi-ink-soft);
}
.soi-led-cite {
  padding: 0;
  border: 0;
  background: none;
  color: var(--soi-yellow-deep);
  font: inherit;
  text-align: left;
  cursor: pointer;
  border-bottom: 1px solid color-mix(in srgb, var(--soi-yellow) 70%, transparent);
}
.soi-led-cite:hover,
.soi-led-cite[aria-expanded='true'] {
  color: var(--soi-ink);
  border-bottom-color: var(--soi-yellow);
}
.soi-led-topics {
  font-style: italic;
}
.soi-led-type {
  margin: 0.25rem 0 0;
  font-size: 0.78rem;
  color: var(--soi-ink-soft);
}
.soi-led-card {
  margin-top: 0.5rem;
  padding: 0.6rem 0.8rem;
  background: var(--soi-card);
  border: 1px solid var(--soi-rule);
  border-top: 3px double var(--soi-rule);
  box-shadow: 2px 2px 0 var(--soi-rule);
  font-size: 0.82rem;
  color: var(--soi-ink);
}
.soi-led-card :deep(a) {
  color: var(--soi-yellow-deep);
  word-break: break-all;
}
.soi-led-card :deep(i) {
  font-style: italic;
}

/* one colour per kind of act, from the SoI palette */
.tone-orig { --tone: var(--soi-sea); }
.tone-comb { --tone: var(--soi-olive); }
.tone-syn { --tone: var(--soi-yellow-deep); }
.tone-warn { --tone: var(--soi-terra); }
.tone-type { --tone: var(--soi-ink); }
.tone-info,
.tone-muted { --tone: var(--soi-rule); }
.tone-muted .soi-led-kind,
.tone-info .soi-led-kind { color: var(--soi-ink-soft); }
</style>
