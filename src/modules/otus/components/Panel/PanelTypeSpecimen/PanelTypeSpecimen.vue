<template>
  <VCard v-if="groups.length">
    <VCardHeader class="flex justify-between">
      <h2 class="text-md">
        {{ shownCount > 1 ? t('titleN', { n: shownCount }) : t('title1') }}
      </h2>
      <PanelDropdown panel-key="panel:typeMaterial" />
    </VCardHeader>
    <VCardContent class="text-sm">
      <!-- grouped by the name each type was designated for -->
      <ul class="soi-tg-list">
        <li
          v-for="g in groups"
          :key="g.id"
          class="soi-tg"
        >
          <p class="soi-tg-name">
            <span v-html="g.html" />
            <span
              v-if="!g.valid"
              class="soi-tg-inv"
              >{{ t('invalid') }}</span
            >
          </p>
          <p
            v-for="tp in g.items"
            :key="tp.id"
            :class="['soi-tg-type', { primary: tp.primary }]"
          >
            <b>{{ tp.status }}</b>
            <span
              v-if="tp.sex"
              :title="tp.sex === '♀' ? t('female') : t('male')"
              >&nbsp;{{ tp.sex }}</span
            >
            <template
              v-for="part in [tp.catalog, tp.repository, tp.notes].filter(Boolean)"
              :key="part"
            >
              <span class="soi-tg-sep">·</span>{{ part }}
            </template>
          </p>
        </li>
      </ul>
    </VCardContent>
  </VCard>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { SPECIMEN_TYPES } from '../../../constants'
import { useOtuPageRequest } from '@/modules/otus/helpers/useOtuPageRequest'
import { useOtuStore } from '@/modules/otus/store/store'
import { parseTypeLabel, isPrimaryType } from './parseTypeLabel'
import PanelDropdown from '../PanelDropdown.vue'
import TaxonWorks from '../../../services/TaxonWorks'
import { useT } from '@/utils/soiLang.js'
import { splitLabel } from '../PanelNomenclature/nomenEntry'

const props = defineProps({
  otuId: { type: [String, Number], required: true }
})

const t = useT({
  en: { title1: 'Type specimen', titleN: 'Type specimens ({n})', invalid: 'invalid', female: 'female', male: 'male', unnamed: 'Name not given' },
  it: { title1: 'Esemplare tipico', titleN: 'Esemplari tipici ({n})', invalid: 'non valido', female: 'femmina', male: 'maschio', unnamed: 'Nome non indicato' }
})

const store = useOtuStore()
const typeMaterials = ref([])

// "Ichneumon navus Say, 1836" → "<i>Ichneumon navus</i> Say, 1836"
function nameHtml(name = '') {
  const tokens = String(name).split(' ')
  let n = 1
  while (n < tokens.length && (/^[a-z]/.test(tokens[n]) || /^\([A-Z][a-z]+\)$/.test(tokens[n]))) n++
  return `<i>${tokens.slice(0, n).join(' ')}</i> ${tokens.slice(n).join(' ')}`.trim()
}

// TaxonWorks sometimes sends no name: take it from the nomenclature entries
function nameFromCatalog(id) {
  const c = (store.catalog?.timeline || []).find((x) => x.taxon_name_id === id && (x.protonym_ids || []).includes(id))
  return c ? splitLabel(c).name.replace(/\s\([a-z][\s\S]*\)\s*$/, '') : t('unnamed')
}

const groups = computed(() => {
  const map = new Map()
  for (const tm of typeMaterials.value) {
    const p = parseTypeLabel(tm.label)
    const key = tm.protonym_id || tm.taxon_name
    if (!map.has(key)) map.set(key, { id: key, html: tm.taxon_name ? nameHtml(tm.taxon_name) : nameFromCatalog(tm.protonym_id), valid: !!tm.is_valid, items: [] })
    map.get(key).items.push({ id: tm.id, ...p, primary: isPrimaryType(p.status) })
  }
  const list = [...map.values()].sort((a, b) => Number(b.valid) - Number(a.valid))
  // on an invalid name's page: only that name's types
  const tx = store.taxon || {}
  if (tx.cached_valid_taxon_name_id && tx.cached_valid_taxon_name_id !== tx.id) {
    const own = list.filter((g) => String(g.id) === String(tx.id))
    if (own.length) return own
  }
  return list
})
const shownCount = computed(() => groups.value.reduce((n, g) => n + g.items.length, 0))

watch(
  () => props.otuId,
  () => {
    if (!props.otuId) return
    useOtuPageRequest('panel:typeMaterial', () => TaxonWorks.getOtuTypeMaterial(props.otuId))
      .then(({ data }) => {
        typeMaterials.value = data.type_materials_catalog_labels.sort(
          (a, b) => SPECIMEN_TYPES.indexOf(a.type_type) - SPECIMEN_TYPES.indexOf(b.type_type)
        )
      })
      .catch(() => {})
  },
  { immediate: true }
)
</script>

<style scoped>
.soi-tg-list {
  margin: 0;
  padding: 0;
  list-style: none;
}
.soi-tg {
  padding: 0.45rem 0;
}
.soi-tg + .soi-tg {
  border-top: 1px solid color-mix(in srgb, var(--soi-rule) 60%, transparent);
}
.soi-tg p {
  margin: 0;
}
.soi-tg-name {
  font-family: 'Fraunces', Georgia, serif;
  font-size: 0.92rem;
  color: var(--soi-ink);
}
.soi-tg-name :deep(i) {
  font-style: italic;
}
.soi-tg-inv {
  display: inline-block;
  margin-left: 0.45rem;
  padding: 0.02rem 0.5rem;
  border-radius: 999px;
  font-family: 'Source Sans 3', system-ui, sans-serif;
  font-size: 0.66rem;
  font-weight: 700;
  line-height: 1.5;
  vertical-align: 1px;
  color: var(--soi-terra);
  background: color-mix(in srgb, var(--soi-terra) 13%, transparent);
  border: 1px solid color-mix(in srgb, var(--soi-terra) 30%, transparent);
}
.soi-tg-type {
  padding-left: 1rem;
  font-size: 0.82rem;
  line-height: 1.45;
  color: var(--soi-ink-soft);
}
.soi-tg-type b {
  font-weight: 600;
  color: var(--soi-ink);
}
.soi-tg-type.primary b {
  color: var(--soi-terra);
}
.soi-tg-sep {
  margin: 0 0.4rem;
  color: var(--soi-rule);
}
</style>
