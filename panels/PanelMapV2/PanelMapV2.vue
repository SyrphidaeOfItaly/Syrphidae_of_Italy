<template>
  <VCard :class="{ 'map-full': isFull }">
    <VCardHeader class="flex items-baseline justify-between gap-3">
      <h2 class="text-md soi-serif">{{ t('title') }}</h2>
      <p
        v-if="summary.length"
        class="map-summary text-xs"
      >
        <template
          v-for="(part, i) in summary"
          :key="part"
        >
          <span v-if="i"> · </span><span>{{ part }}</span>
        </template>
      </p>
    </VCardHeader>
    <div class="relative">
      <Teleport to="body">
        <VModal
          v-if="activeCitation"
          @close="activeCitation = null"
        >
          <template #header>
            <div class="text-sm font-medium">{{ t('reference') }}</div>
          </template>
          <div
            class="px-4 pb-4 text-sm leading-relaxed"
            v-html="linkify(activeCitation.full)"
          />
        </VModal>
      </Teleport>
      <ClientOnly>
        <VSpinner v-if="isLoading" />
        <VMap
          :class="isFull ? 'map-full-map' : 'h-[26rem] max-h-[26rem]'"
          dragging
          :cluster="cluster"
          :zoom="zoom"
          :zoom-bounds="8"
          :geojson="store.distribution.geojson"
          :cluster-icon-create-function="makeClusterIconFor"
          :geojson-options="geojsonOptions"
          @geojson:ready="onGeojsonReady"
        />
        <div ref="popupElement">
          <MapPopup
            v-if="popupItem"
            :items="popupItem.base"
            :targets="popupItem.target"
            @selected="dwcTableRef.show"
            @citation-selected="activeCitation = $event"
          />
        </div>
        <div class="absolute right-3 top-3 z-[400] flex gap-1.5">
          <button
            type="button"
            class="map-tool"
            :title="isFull ? t('exitFull') : t('full')"
            :aria-label="isFull ? t('exitFull') : t('full')"
            @click="isFull = !isFull"
          >
            <svg
              viewBox="0 0 16 16"
              aria-hidden="true"
            ><path
              v-if="!isFull"
              d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
            /><path
              v-else
              d="M6 2v4H2M14 6h-4V2M10 14v-4h4M2 10h4v4"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
            /></svg>
          </button>
          <VButton
            class="h-6 text-sm"
            primary
            @click="() => (isOtuSearchVisible = true)"
          >
            {{ t('search') }}
          </VButton>
        </div>

        <OtuSearch
          v-if="isOtuSearchVisible"
          :otu="otu"
          :shapes="store.distribution.geojson"
          @close="() => (isOtuSearchVisible = false)"
        />

        <CachedMap
          v-if="store.distribution.cachedMap"
          :cached-map="store.distribution.cachedMap"
        />
      </ClientOnly>
    </div>
    <!-- Detailed records still on their way: the summary map is showing -->
    <div
      v-if="store.distribution.loadingDetail"
      class="map-note flex items-center gap-2 px-3 py-1.5 text-xs"
    >
      <span
        class="map-dot"
        aria-hidden="true"
      />
      <span>{{ t('loadingDetail') }}</span>
    </div>

    <!-- Records filed under the valid name or one of its synonyms -->
    <div
      v-if="nameOptions.length > 1"
      class="map-names flex flex-wrap gap-1.5 px-3 py-2"
      role="group"
      aria-label="Filter by name"
    >
      <button
        type="button"
        :class="['map-chip', { on: !store.distribution.filterOtuId }]"
        :aria-pressed="!store.distribution.filterOtuId"
        @click="store.setFilterOtu(null)"
      >
        {{ t('all') }} <span class="map-chip-n">{{ countFor(null) }}</span>
      </button>
      <button
        v-for="n in nameOptions"
        :key="n.id"
        type="button"
        :class="['map-chip', { on: store.distribution.filterOtuId === n.id }]"
        :aria-pressed="store.distribution.filterOtuId === n.id"
        @click="store.setFilterOtu(store.distribution.filterOtuId === n.id ? null : n.id)"
      >
        <span
          class="[&_i]:italic"
          v-html="n.html"
        />
        <span
          v-if="!n.valid"
          class="map-chip-inv"
          >{{ t('invalid') }}</span
        >
        <span class="map-chip-n">{{ countFor(n.id) }}</span>
      </button>
    </div>

    <!-- Editors only (?editor=1): records far from every other record of this taxon -->
    <div
      v-if="isEditor && outliers.length"
      class="map-outliers px-3 py-2 text-xs"
    >
      <p class="map-outliers-head">
        {{ outliers.length === 1 ? t('checkOne') : t('checkN', { n: outliers.length }) }}
      </p>
      <ul>
        <li
          v-for="o in outliers"
          :key="o.key"
        >
          <button
            type="button"
            class="map-outlier"
            @click="zoomToFeature(o.feature)"
          >
            {{ o.label }} — {{ t('kmAway', { n: fmtKm(o.km) }) }}
          </button>
        </li>
      </ul>
    </div>

    <!-- Highlight what one reference recorded -->
    <div
      v-if="store.distribution.sources?.length > 1"
      class="map-sources flex flex-wrap items-center gap-2 px-3 py-2 text-xs"
    >
      <label
        for="map-source"
        class="map-sources-label"
        >{{ t('source') }}</label
      >
      <select
        id="map-source"
        class="map-source-select"
        :value="store.distribution.filterSourceId || ''"
        @change="store.setFilterSource(Number($event.target.value) || null)"
      >
        <option value="">{{ t('allSources', { n: store.distribution.sources?.length }) }}</option>
        <option
          v-for="src in store.distribution.sources"
          :key="src.id"
          :value="src.id"
          :title="src.full"
        >
          {{ src.short }} — {{ src.count === 1 ? t('region1') : t('regionN', { n: src.count }) }}
        </option>
      </select>
      <span
        v-if="currentSource"
        class="map-source-full"
        :title="currentSource.full"
        >{{ currentSource.full }}</span
      >
    </div>

    <div
      v-if="store.distribution.errorMessage"
      class="flex flex-row p-2 text-xs italic"
    >
      * {{ store.distribution.errorMessage }}
    </div>
    <div
      v-if="store.distribution.currentShapeTypes.length"
      class="map-legend flex flex-wrap gap-x-4 gap-y-1 px-3 py-2 text-xs"
    >
      <span
        v-for="type in store.distribution.currentShapeTypes"
        :key="type"
        class="inline-flex items-center gap-0.5"
      >
        <button
          type="button"
          :class="['map-legend-item', { off: (store.distribution.hiddenTypes || []).includes(type) }]"
          :aria-pressed="!(store.distribution.hiddenTypes || []).includes(type)"
          :title="(store.distribution.hiddenTypes || []).includes(type) ? t('show') : t('hide')"
          @click="store.toggleType(type)"
        >
          <span
            :class="['inline-block w-3 h-3 rounded-sm', LEGEND[type]?.background]"
            aria-hidden="true"
          />
          <span>{{ legendLabel(type) }}</span>
          <span
            v-if="typeCounts[type]"
            class="map-chip-n"
            >{{ typeCounts[type] }}</span
          >
        </button>
        <button
          v-if="type === 'TypeMaterial' && !(store.distribution.hiddenTypes || []).includes(type)"
          type="button"
          class="map-legend-zoom"
          :title="t('zoomType')"
          :aria-label="t('zoomType')"
          @click="zoomToType(type)"
        >
          <svg
            class="map-zoom-icon"
            viewBox="0 0 16 16"
            aria-hidden="true"
          ><circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M10.4 10.4 14 14M5 7h4M7 5v4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
        </button>
      </span>
    </div>
    <DwcTable ref="dwcTableRef" />
  </VCard>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { otuNames } from '../_shared/otuNames'
import { useT } from '@/utils/soiLang.js'

const t = useT({
  en: {
    title: 'Distribution', reference: 'Reference', search: 'Search', full: 'Full screen', exitFull: 'Exit full screen',
    loadingDetail: 'Showing the summary map; loading the detailed records…', all: 'All', invalid: 'invalid',
    checkOne: 'Check this record: far from every other record', checkN: 'Check these {n} records: far from every other record',
    kmAway: '{n} km away', source: 'Source', allSources: 'All sources ({n})', region1: '1 region', regionN: '{n} regions',
    show: 'Show on the map', hide: 'Hide from the map', zoomType: 'Zoom to the primary type',
    fieldOccurrence: 'Field occurrence', specimen: 'Specimen',
    specimen1: '1 specimen', specimenN: '{n} specimens', fieldObs1: '1 field observation', fieldObsN: '{n} field observations',
    primaryType1: '1 primary type', primaryTypeN: '{n} primary types',
    Aggregate: 'Summary (literature and records)', AssertedAbsent: 'Asserted absent', AssertedDistribution: 'Asserted distribution',
    Georeference: 'Georeference', CollectionObject: 'Collection object', TypeMaterial: 'Primary type', FieldOccurrence: 'Field occurrence'
  },
  it: {
    title: 'Distribuzione', reference: 'Riferimento', search: 'Cerca', full: 'Schermo intero', exitFull: 'Esci dallo schermo intero',
    loadingDetail: 'Mappa riassuntiva; caricamento dei record dettagliati…', all: 'Tutti', invalid: 'non valido',
    checkOne: 'Controlla questo record: lontano da tutti gli altri', checkN: 'Controlla questi {n} record: lontani da tutti gli altri',
    kmAway: 'a {n} km', source: 'Fonte', allSources: 'Tutte le fonti ({n})', region1: '1 regione', regionN: '{n} regioni',
    show: 'Mostra sulla mappa', hide: 'Nascondi dalla mappa', zoomType: 'Zoom sul tipo primario',
    fieldOccurrence: 'Osservazione', specimen: 'Esemplare',
    specimen1: '1 esemplare', specimenN: '{n} esemplari', fieldObs1: '1 osservazione', fieldObsN: '{n} osservazioni',
    primaryType1: '1 tipo primario', primaryTypeN: '{n} tipi primari',
    Aggregate: 'Sintesi (letteratura e record)', AssertedAbsent: 'Assenza segnalata', AssertedDistribution: 'Distribuzione da letteratura',
    Georeference: 'Georeferenziazione', CollectionObject: 'Esemplare', TypeMaterial: 'Tipo primario', FieldOccurrence: 'Osservazione'
  }
})
const legendLabel = (type) => t(type)

function linkify(html) {
  if (!html) return ''
  return html.replace(
    /(?<!href=["'])(?<!">)(https?:\/\/[^\s<>"]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-secondary-color hover:underline">$1</a>'
  )
}
import { useDistributionStore } from './store/useDistributionStore.js'
import { makeClusterIconFor } from './clusters'
import { useGeojsonOptions } from './composables/useGeojsonOptions.js'
import { LEGEND } from './constants'
import MapPopup from './components/MapPopup.vue'
import CachedMap from './components/CachedMap.vue'
import OtuSearch from './components/Search/OtuSearch.vue'
import DwcTable from './components/DwcTable.vue'

const props = defineProps({
  otuId: {
    type: [String, Number],
    required: true
  },

  otu: {
    type: Object,
    required: true
  },

  taxon: {
    type: Object,
    required: true
  },

  cluster: {
    type: Boolean,
    default: true
  }
})

const zoom = 2
const isLoading = ref(true)
const activeCitation = ref(null)
const isOtuSearchVisible = ref(false)
// Full screen: the card covers the window; Esc leaves
const isFull = ref(false)
const onKey = (e) => e.key === 'Escape' && (isFull.value = false)
watch(isFull, (v) => {
  document.documentElement.style.overflow = v ? 'hidden' : ''
  v ? window.addEventListener('keydown', onKey) : window.removeEventListener('keydown', onKey)
})
const dwcTableRef = ref(null)
const store = useDistributionStore()
const popupElement = ref(null)
const { popupItem, geojsonOptions } = useGeojsonOptions({ popupElement })

// Names behind the records, for the filter chips (only when there is more than one)
const nameOptions = ref([])
watch(
  () => store.distribution.otuIds,
  async (ids) => {
    nameOptions.value = ids?.length > 1 ? await otuNames(ids) : []
  }
)
// ── Editor mode: ?editor=1 (remembered in this browser), ?editor=0 to leave ──
const isEditor = ref(false)
onMounted(() => {
  const q = new URLSearchParams(location.hash.split('?')[1] || location.search)
  try {
    if (q.get('editor') === '1') localStorage.setItem('soi-editor', '1')
    if (q.get('editor') === '0') localStorage.removeItem('soi-editor')
    isEditor.value = localStorage.getItem('soi-editor') === '1'
  } catch {}
})

// A representative point for any shape: the point itself, or the middle of its outline
function centerOf(geom) {
  if (!geom) return null
  if (geom.type === 'Point') return geom.coordinates
  if (geom.type === 'GeometryCollection') return centerOf(geom.geometries?.[0])
  let minX = 180, maxX = -180, minY = 90, maxY = -90
  const walk = (c) => {
    if (typeof c[0] === 'number') {
      minX = Math.min(minX, c[0]); maxX = Math.max(maxX, c[0])
      minY = Math.min(minY, c[1]); maxY = Math.max(maxY, c[1])
    } else c.forEach(walk)
  }
  walk(geom.coordinates || [])
  return minX <= maxX ? [(minX + maxX) / 2, (minY + maxY) / 2] : null
}
function km([x1, y1], [x2, y2]) {
  const r = Math.PI / 180
  const a = Math.sin(((y2 - y1) * r) / 2) ** 2 + Math.cos(y1 * r) * Math.cos(y2 * r) * Math.sin(((x2 - x1) * r) / 2) ** 2
  return 12742 * Math.asin(Math.sqrt(a))
}
const fmtKm = (n) => Math.round(n).toLocaleString('en-US')

// Specimens and observations more than 1,000 km (and 3× the usual spacing)
// from the nearest other record of any kind
const outliers = computed(() => {
  if (!isEditor.value) return []
  const pts = store.distribution.rawFeatures
    .map((f) => ({ f, c: centerOf(f.geometry) }))
    .filter((p) => p.c)
  if (pts.length < 4) return []
  const nearest = pts.map((p, i) =>
    Math.min(...pts.map((q, j) => (i === j ? Infinity : km(p.c, q.c))))
  )
  const sorted = [...nearest].sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)]
  return pts
    .map((p, i) => ({ ...p, km: nearest[i] }))
    .filter((p) => ['CollectionObject', 'FieldOccurrence'].includes(p.f.properties.base?.type))
    .filter((p) => p.km > 1000 && p.km > median * 3)
    .map((p) => ({
      key: `${p.f.properties.base.type}-${p.f.properties.base.id}`,
      feature: p.f,
      km: p.km,
      label: p.f.properties.base.type === 'FieldOccurrence'
        ? `${t('fieldOccurrence')} ${p.f.properties.base.id}`
        : `${t('specimen')} ${p.f.properties.base.id}`
    }))
})

// Zoom to one record on the map and open its popup
function zoomToFeature(feature) {
  if (!geoGroup) return
  const id = feature.properties.base?.id
  let target = null
  geoGroup.eachLayer((l) => {
    const base = l.feature?.properties?.base
    if ((Array.isArray(base) ? base : [base]).some((b) => b?.id === id)) target = target || l
  })
  if (!target) return
  const map = geoGroup._map
  const open = () => target.fire('click', { latlng: target.getLatLng?.() || target.getBounds?.().getCenter() })
  if (target.getLatLng) {
    const go = () => {
      map.setView(target.getLatLng(), Math.max(map.getZoom(), 7))
      map.once('moveend', open)
    }
    typeof geoGroup.zoomToShowLayer === 'function' ? geoGroup.zoomToShowLayer(target, go) : go()
  } else {
    map.fitBounds(target.getBounds(), { maxZoom: 7 })
    map.once('moveend', open)
  }
}

const currentSource = computed(() =>
  store.distribution.sources.find((x) => x.id === store.distribution.filterSourceId)
)

// Records per kind (published distribution, specimens, types…), following the name filter
const shownFeatures = computed(() => {
  const d = store.distribution
  return d.filterOtuId
    ? d.rawFeatures.filter((f) => Number(f.properties.target?.id) === Number(d.filterOtuId))
    : d.rawFeatures
})
const typeCounts = computed(() => {
  const c = {}
  shownFeatures.value.forEach((f) => {
    const t = f.properties.base?.type
    if (t) c[t] = (c[t] || 0) + 1
  })
  return c
})
const plural = (n, key) => (n === 1 ? t(`${key}1`) : t(`${key}N`, { n }))
const summary = computed(() => {
  if (store.distribution.loadingDetail || !shownFeatures.value.length) return []
  const c = typeCounts.value
  return [
    c.AssertedDistribution && plural(c.AssertedDistribution, 'region'),
    c.CollectionObject && plural(c.CollectionObject, 'specimen'),
    c.FieldOccurrence && plural(c.FieldOccurrence, 'fieldObs'),
    c.TypeMaterial && plural(c.TypeMaterial, 'primaryType')
  ].filter(Boolean)
})

// The map's layer group, handed over by VMap once the shapes are drawn
let geoGroup = null
function onGeojsonReady(group) {
  geoGroup = group
  isLoading.value = false
}

const hasType = (layer, type) => {
  const base = layer.feature?.properties?.base
  return (Array.isArray(base) ? base : [base]).some((b) => b?.type === type)
}

// Zoom to the primary type (a dot or a small area) and open its popup
function zoomToType(type) {
  if (!geoGroup) return
  const map = geoGroup._map
  const layers = []
  geoGroup.eachLayer((l) => hasType(l, type) && layers.push(l))
  if (!map || !layers.length) return
  const layer = layers[0]
  const open = () => layer.fire('click', { latlng: layer.getLatLng?.() || layer.getBounds?.().getCenter() })

  if (layer.getLatLng) {
    const go = () => {
      map.setView(layer.getLatLng(), Math.max(map.getZoom(), 9), { animate: true })
      map.once('moveend', open)
    }
    typeof geoGroup.zoomToShowLayer === 'function' ? geoGroup.zoomToShowLayer(layer, go) : go()
  } else if (layer.getBounds) {
    map.fitBounds(layer.getBounds(), { maxZoom: 9 })
    map.once('moveend', open)
  }
}

const countFor = (otuId) =>
  store.distribution.rawFeatures.filter(
    (f) => otuId == null || Number(f.properties.target?.id) === Number(otuId)
  ).length

onMounted(() => {
  isLoading.value = true

  store.loadDistribution({
    otuId: props.otuId,
    rankString: props.taxon.rank_string
  })
})

onBeforeUnmount(() => {
  document.documentElement.style.overflow = ''
  window.removeEventListener('keydown', onKey)
  store.resetRequest()
  store.$reset()
})
</script>

<style scoped>
.map-note {
  color: rgba(var(--color-base-content), 0.7);
  border-top: 1px solid rgba(var(--color-base-muted), 1);
}
.map-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 999px;
  background: var(--soi-yellow-deep);
  animation: map-pulse 1.2s ease-in-out infinite;
}
@keyframes map-pulse {
  50% { opacity: 0.25; }
}
@media (prefers-reduced-motion: reduce) {
  .map-dot { animation: none; }
}
.map-summary {
  color: rgba(var(--color-base-content), 0.6);
  text-align: right;
}
.map-legend {
  border-top: 1px solid rgba(var(--color-base-muted), 1);
}
.map-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.1rem 0.4rem;
  margin: -0.1rem -0.4rem;
  border-radius: 999px;
  background: transparent;
  border: 1px solid transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
}
.map-legend-item:hover,
.map-legend-item:focus-visible {
  border-color: rgba(var(--color-base-content), 0.2);
}
.map-legend-item.off {
  opacity: 0.4;
  text-decoration: line-through;
}
.map-tool {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 4px;
  background: #fff;
  color: #333;
  border: 1px solid rgba(0, 0, 0, 0.25);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
  cursor: pointer;
}
.map-tool svg { width: 0.9rem; height: 0.9rem; }
.map-tool:hover { color: var(--soi-yellow-deep); }
.map-full {
  position: fixed !important;
  inset: 0.75rem;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  overflow: auto;
  box-shadow: 0 0 0 100vmax rgba(0, 0, 0, 0.45);
}
.map-full > .relative {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
}
.map-full-map {
  flex: 1 1 auto;
  min-height: 60vh;
}
.map-legend-zoom {
  padding: 0.1rem 0.35rem;
  border-radius: 999px;
  background: transparent;
  border: 1px solid transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
}
.map-legend-zoom:hover,
.map-legend-zoom:focus-visible {
  border-color: color-mix(in srgb, var(--soi-yellow-deep) 50%, transparent);
  color: var(--soi-yellow-deep);
}
.map-zoom-icon {
  width: 0.85rem;
  height: 0.85rem;
  opacity: 0.7;
}
.map-outliers {
  border-top: 1px dashed var(--soi-terra);
  background: color-mix(in srgb, var(--soi-terra) 10%, transparent);
  color: var(--soi-terra);
}
.map-outliers-head {
  font-weight: 700;
  margin-bottom: 0.2rem;
}
.map-outlier {
  background: none;
  border: 0;
  padding: 0;
  color: inherit;
  font: inherit;
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
}
.map-sources {
  border-top: 1px solid rgba(var(--color-base-muted), 1);
}
.map-sources-label {
  font-weight: 600;
  color: rgba(var(--color-base-content), 0.7);
}
.map-source-select {
  max-width: 100%;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  border: 1px solid rgba(var(--color-base-muted), 1);
  background: transparent;
  color: inherit;
  font: inherit;
}
.map-source-full {
  flex: 1 1 100%;
  color: rgba(var(--color-base-content), 0.6);
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.map-names {
  border-top: 1px dashed var(--soi-rule);
  column-gap: 1.1rem !important;
}
.map-chip {
  display: inline-flex;
  align-items: baseline;
  gap: 0.3rem;
  padding: 0.1rem 0.1rem 0.15rem;
  border: 0;
  border-bottom: 2px solid transparent;
  background: none;
  color: var(--soi-ink-soft);
  font-family: 'Fraunces', Georgia, serif;
  font-size: 0.85rem;
  cursor: pointer;
}
.map-chip:hover {
  color: var(--soi-ink);
}
.map-chip.on {
  color: var(--soi-ink);
  border-bottom-color: var(--soi-yellow);
  font-weight: 600;
}
.map-chip-n { font-size: 0.68rem; opacity: 0.6; }
.map-chip-inv {
  font-family: 'Source Sans 3', system-ui, sans-serif;
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--soi-terra);
}
</style>
