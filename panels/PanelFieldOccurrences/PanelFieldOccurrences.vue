<template>
  <VCard class="soi-fo">
    <VCardHeader class="flex items-center justify-between gap-3">
      <span>{{ t('title') }}<span v-if="records.length" class="soi-fo-count">{{ records.length }}</span></span>
    </VCardHeader>
    <VCardContent>
      <ClientOnly>
        <VSpinner v-if="isLoading" />
      </ClientOnly>

      <p v-if="!isLoading && !records.length" class="text-sm soi-muted">{{ t('empty') }}</p>

      <template v-else-if="!isLoading">
        <p class="soi-fo-lead">
          {{ t('lead') }}
          <template v-if="summary">· {{ summary }}</template>
        </p>

        <ul class="soi-fo-grid">
          <li v-for="r in shown" :key="r.id" class="soi-fo-card">
            <!-- photo: iNaturalist first, then TaxonWorks images -->
            <a
              v-if="r.inat?.photo"
              :href="r.inat.url"
              target="_blank"
              rel="noopener"
              class="soi-fo-photo"
              :title="t('openInat')"
            >
              <img :src="r.inat.photo" :alt="name + ' · ' + r.place" loading="lazy" />
            </a>
            <button
              v-else-if="r.images.length"
              type="button"
              class="soi-fo-photo"
              @click="openViewer(r.images, 0)"
            >
              <img :src="r.images[0].medium || r.images[0].original" :alt="name" loading="lazy" />
            </button>
            <a
              v-else-if="r.tiles"
              :href="r.mapUrl"
              target="_blank"
              rel="noopener"
              class="soi-fo-photo soi-fo-map"
              :title="t('openMap')"
            >
              <img
                v-for="tile in r.tiles"
                :key="tile.src"
                :src="tile.src"
                alt=""
                class="soi-fo-tile"
                :style="{ left: tile.left + 'px', top: tile.top + 'px' }"
                loading="lazy"
              />
              <span class="soi-fo-pin" aria-hidden="true" />
              <span class="soi-fo-mapcredit">© OpenStreetMap</span>
            </a>
            <div v-else class="soi-fo-photo soi-fo-nophoto" aria-hidden="true">
              <span>{{ t('noPhoto') }}</span>
            </div>

            <div class="soi-fo-body">
              <p class="soi-fo-date">{{ r.date || t('noDate') }}</p>
              <p class="soi-fo-place">{{ r.place || '—' }}</p>

              <p class="soi-fo-tags">
                <span v-if="r.sex" class="soi-fo-tag">{{ r.sex }}</span>
                <span v-if="r.stage" class="soi-fo-tag">{{ r.stage }}</span>
                <span v-if="r.count > 1" class="soi-fo-tag">{{ t('count', { n: r.count }) }}</span>
                <span v-if="r.elevation" class="soi-fo-tag">{{ r.elevation }}</span>
                <span v-if="r.inat?.grade" class="soi-fo-tag soi-fo-grade">{{ t(r.inat.grade) }}</span>
              </p>

              <dl class="soi-fo-facts">
                <template v-if="r.observer">
                  <dt>{{ t('observer') }}</dt>
                  <dd>{{ r.observer }}</dd>
                </template>
                <template v-if="r.identifiedBy">
                  <dt>{{ t('identified') }}</dt>
                  <dd>{{ r.identifiedBy }}<template v-if="r.identifiedYear"> ({{ r.identifiedYear }})</template></dd>
                </template>
                <template v-if="r.coords">
                  <dt>{{ t('coords') }}</dt>
                  <dd>
                    <a :href="r.mapUrl" target="_blank" rel="noopener">{{ r.coords }}</a>
                  </dd>
                </template>
              </dl>

              <p class="soi-fo-links">
                <a v-if="r.inat" :href="r.inat.url" target="_blank" rel="noopener" class="soi-fo-inat">
                  {{ t('openInat') }} ↗
                </a>
                <button
                  v-if="r.images.length && r.inat?.photo"
                  type="button"
                  class="soi-fo-more"
                  @click="openViewer(r.images, 0)"
                >
                  {{ t('photos', { n: r.images.length }) }}
                </button>
              </p>
              <p v-if="r.inat?.attribution" class="soi-fo-credit">{{ t('photo') }}: {{ r.inat.attribution }}</p>
            </div>
          </li>
        </ul>

        <button
          v-if="!showAll && records.length > MAX"
          type="button"
          class="soi-fo-showall"
          @click="showAll = true"
        >
          {{ t('showAll', { n: records.length }) }}
        </button>
      </template>

      <ImageViewer
        v-if="isViewerVisible"
        :images="currentImages"
        :index="currentIndex"
        :next="currentImages.length - 1 > currentIndex"
        :previous="currentIndex > 0"
        @select-index="(i) => (currentIndex = i)"
        @next="() => currentIndex++"
        @previous="() => currentIndex--"
        @close="() => (isViewerVisible = false)"
      />
    </VCardContent>
  </VCard>
</template>

<script setup>
// Field occurrences (observations without a preserved specimen, e.g. iNaturalist photos)
// as cards: photo, date, place, elevation, observer, identifier, link to the source.
// When the occurrenceID is an iNaturalist UUID, the photo, the link and the
// research-grade status are read from the iNaturalist API.
import { computed, onMounted, ref } from 'vue'
import { makeAPIRequest } from '@/utils'
import { lang, useT } from '@/utils/soiLang.js'

const MAX = 12
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const props = defineProps({
  otuId: { type: Number, required: true }
})

const t = useT({
  en: {
    title: 'Field observations',
    photo: 'Photo',
    lead: 'Records without a preserved specimen, such as verified photographs.',
    empty: 'No field observations for this species yet.',
    noPhoto: 'No photo',
    noDate: 'Date unknown',
    observer: 'Observer',
    identified: 'Identified by',
    coords: 'Coordinates',
    openInat: 'View on iNaturalist',
    openMap: 'Open on the map',
    photos: '{n} photo(s) in SoI',
    count: '{n} individuals',
    showAll: 'Show all {n} observations',
    obs1: '1 observation',
    obsN: '{n} observations',
    regions: '{n} regions',
    region1: '1 region',
    Male: 'male',
    Female: 'female',
    Adult: 'adult',
    Larva: 'larva',
    Pupa: 'pupa',
    research: 'research grade',
    needs_id: 'needs ID',
    casual: 'casual'
  },
  it: {
    title: 'Osservazioni sul campo',
    photo: 'Foto',
    lead: 'Segnalazioni senza esemplare conservato, ad esempio fotografie verificate.',
    empty: 'Ancora nessuna osservazione sul campo per questa specie.',
    noPhoto: 'Nessuna foto',
    noDate: 'Data sconosciuta',
    observer: 'Osservatore',
    identified: 'Determinato da',
    coords: 'Coordinate',
    openInat: 'Vedi su iNaturalist',
    openMap: 'Apri sulla mappa',
    photos: '{n} foto in SoI',
    count: '{n} individui',
    showAll: 'Mostra tutte le {n} osservazioni',
    obs1: '1 osservazione',
    obsN: '{n} osservazioni',
    regions: '{n} regioni',
    region1: '1 regione',
    Male: 'maschio',
    Female: 'femmina',
    Adult: 'adulto',
    Larva: 'larva',
    Pupa: 'pupa',
    research: 'livello ricerca',
    needs_id: 'da verificare',
    casual: 'occasionale'
  }
})

const raw = ref([])
const inat = ref({}) // uuid → { url, photo, attribution, grade }
const name = ref('')
const isLoading = ref(true)
const showAll = ref(false)
const isViewerVisible = ref(false)
const currentImages = ref([])
const currentIndex = ref(0)

const fmtDate = (iso) => {
  if (!iso) return ''
  const [y, m, d] = String(iso).split('T')[0].split('/')[0].split('-')
  if (!m) return y
  const date = new Date(Date.UTC(+y, +m - 1, +(d || 1)))
  const opts = d ? { day: 'numeric', month: 'long', year: 'numeric' } : { month: 'long', year: 'numeric' }
  return date.toLocaleDateString(lang.value === 'it' ? 'it-IT' : 'en-GB', { ...opts, timeZone: 'UTC' })
}

const records = computed(() =>
  raw.value
    .map((d) => {
      const lat = Number(d.decimalLatitude)
      const lon = Number(d.decimalLongitude)
      const hasCoords = Number.isFinite(lat) && Number.isFinite(lon) && (lat || lon)
      const elev = [d.minimumElevationInMeters, d.maximumElevationInMeters].map(Number).filter((v) => Number.isFinite(v) && v > 0)
      const lo = elev.length ? Math.round(Math.min(...elev)) : null
      const hi = elev.length ? Math.round(Math.max(...elev)) : null
      const uuid = UUID.test(d.occurrenceID || '') ? d.occurrenceID.toLowerCase() : null
      return {
        id: d.id,
        iso: d.eventDate || '',
        date: fmtDate(d.eventDate),
        place: [d.verbatimLocality || d.locality || labelPlace(d.verbatimLabel), d.county, d.stateProvince, d.country !== 'Italy' ? d.country : '']
          .filter(Boolean)
          .filter((v, i, a) => a.indexOf(v) === i)
          .join(', '),
        region: d.stateProvince || '',
        sex: d.sex ? t(d.sex) : '',
        stage: d.lifeStage && d.lifeStage !== 'Adult' ? t(d.lifeStage) : '',
        count: Number(d.individualCount) || 1,
        elevation: lo == null ? '' : lo === hi ? `${lo} m` : `${lo}–${hi} m`,
        observer: d.recordedBy || '',
        identifiedBy: d.identifiedBy || '',
        identifiedYear: String(d.dateIdentified || '').slice(0, 4),
        coords: hasCoords ? `${lat.toFixed(4)}, ${lon.toFixed(4)}` : '',
        tiles: hasCoords ? miniMap(lat, lon) : null,
        mapUrl: hasCoords ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=13/${lat}/${lon}` : '',
        images: d.images || [],
        inat: uuid ? inat.value[uuid] || null : null
      }
    })
    .sort((a, b) => String(b.iso).localeCompare(String(a.iso)))
)

// The verbatim label as a place name, unless it is a web address
const labelPlace = (label) => {
  const s = String(label || '').trim()
  return !s || /^https?:\/\//i.test(s) ? '' : s
}

// A small map around the point: 2×2 OpenStreetMap tiles (zoom 10) placed so the point is in the middle
const MAP_SIZE = 120
const MAP_ZOOM = 10
function miniMap(lat, lon) {
  const n = 2 ** MAP_ZOOM
  const rad = (lat * Math.PI) / 180
  const px = ((lon + 180) / 360) * n * 256
  const py = ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n * 256
  const tx = Math.floor(px / 256 - 0.5)
  const ty = Math.floor(py / 256 - 0.5)
  const tiles = []
  for (let dx = 0; dx < 2; dx++) {
    for (let dy = 0; dy < 2; dy++) {
      const x = tx + dx
      const y = ty + dy
      tiles.push({
        src: `https://tile.openstreetmap.org/${MAP_ZOOM}/${x}/${y}.png`,
        left: Math.round(x * 256 - px + MAP_SIZE / 2),
        top: Math.round(y * 256 - py + MAP_SIZE / 2)
      })
    }
  }
  return tiles
}

const shown = computed(() => (showAll.value ? records.value : records.value.slice(0, MAX)))

const summary = computed(() => {
  const n = records.value.length
  const years = records.value.map((r) => parseInt(r.iso, 10)).filter(Boolean)
  const regions = new Set(records.value.map((r) => r.region).filter(Boolean)).size
  const parts = [n === 1 ? t('obs1') : t('obsN', { n })]
  if (years.length) {
    const a = Math.min(...years)
    const b = Math.max(...years)
    parts.push(a === b ? String(a) : `${a}–${b}`)
  }
  if (regions) parts.push(regions === 1 ? t('region1') : t('regions', { n: regions }))
  return parts.join(' · ')
})

async function loadImages(item) {
  const links = String(item.associatedMedia || '').split('|').map((s) => s.trim()).filter(Boolean)
  const res = await Promise.allSettled(
    links.map((link) => makeAPIRequest.get(link, { params: { extend: ['attribution', 'depictions', 'source'] } }))
  )
  return res.filter((r) => r.status === 'fulfilled').map((r) => r.value.data)
}

async function loadInat(uuids) {
  if (!uuids.length || import.meta.env.SSR) return
  const out = {}
  for (let i = 0; i < uuids.length; i += 100) {
    const batch = uuids.slice(i, i + 100)
    try {
      const r = await fetch(`https://api.inaturalist.org/v1/observations?uuid=${batch.join(',')}&per_page=100`)
      if (!r.ok) continue
      const { results = [] } = await r.json()
      results.forEach((o) => {
        const p = o.photos?.[0]
        out[o.uuid] = {
          url: o.uri || `https://www.inaturalist.org/observations/${o.id}`,
          photo: p?.url ? p.url.replace('/square.', '/medium.') : '',
          attribution: p?.attribution
            ? /\(c\)|©/i.test(p.attribution)
              ? p.attribution
              : `${o.user?.name || o.user?.login || ''}, ${p.attribution}`.replace(/^, /, '')
            : '',
          grade: o.quality_grade || ''
        }
      })
    } catch {
      // iNaturalist unreachable: the cards still show the SoI data
    }
  }
  // a UUID iNaturalist doesn't know is TaxonWorks' own occurrenceID: no iNat link for it
  inat.value = out
}

async function load() {
  isLoading.value = true
  try {
    const { data } = await makeAPIRequest.get(`/otus/${props.otuId}/inventory/dwc.json`)
    const list = (Array.isArray(data) ? data : []).filter((d) => d.dwc_occurrence_object_type === 'FieldOccurrence')
    name.value = list[0]?.scientificName || ''
    for (const item of list) {
      if (item.associatedMedia) item.images = await loadImages(item)
    }
    raw.value = list
    await loadInat([...new Set(list.map((d) => d.occurrenceID).filter((id) => UUID.test(id || '')).map((s) => s.toLowerCase()))])
  } finally {
    isLoading.value = false
  }
}

function openViewer(images, index) {
  currentImages.value = images
  currentIndex.value = index
  isViewerVisible.value = true
}

onMounted(load)
</script>

<style scoped>
.soi-fo-count {
  margin-left: 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.05rem 0.5rem;
  border-radius: 999px;
  background: var(--soi-paper-2);
  color: var(--soi-ink-soft);
  vertical-align: middle;
}
.soi-fo-lead {
  font-size: 0.875rem;
  color: var(--soi-ink-soft);
  margin: 0 0 1rem;
}
.soi-fo-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 20rem), 1fr));
}
.soi-fo-card {
  display: grid;
  grid-template-columns: 7.5rem 1fr;
  gap: 0.9rem;
  padding: 0.75rem;
  border: 1px solid var(--soi-rule);
  border-radius: 6px;
  background: var(--soi-card);
}
.soi-fo-photo {
  display: block;
  width: 7.5rem;
  height: 7.5rem;
  border-radius: 4px;
  overflow: hidden;
  background: var(--soi-paper-2);
  padding: 0;
  border: 0;
  cursor: pointer;
}
.soi-fo-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.25s ease;
}
.soi-fo-photo:hover img {
  transform: scale(1.04);
}
.soi-fo-map {
  position: relative;
  width: 120px;
  height: 120px;
}
.soi-fo-tile {
  position: absolute;
  width: 256px !important;
  height: 256px !important;
  max-width: none;
  transition: none;
}
.soi-fo-photo.soi-fo-map:hover img {
  transform: none;
}
.soi-fo-pin {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 14px;
  height: 14px;
  margin: -7px 0 0 -7px;
  border-radius: 50%;
  background: var(--soi-yellow);
  border: 2px solid #22281c;
  box-shadow: 0 0 0 3px rgba(240, 184, 31, 0.35);
}
.soi-fo-mapcredit {
  position: absolute;
  right: 0;
  bottom: 0;
  font-size: 8px;
  line-height: 1;
  padding: 2px 3px;
  background: rgba(255, 255, 255, 0.75);
  color: #333;
}
.soi-fo-nophoto {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: default;
  font-size: 0.75rem;
  color: var(--soi-ink-soft);
  border: 1px dashed var(--soi-rule);
}
.soi-fo-body {
  min-width: 0;
  font-size: 0.85rem;
}
.soi-fo-date {
  font-weight: 700;
  font-size: 0.95rem;
  margin: 0;
}
.soi-fo-place {
  margin: 0.1rem 0 0.4rem;
  color: var(--soi-ink-soft);
}
.soi-fo-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  margin: 0 0 0.5rem;
}
.soi-fo-tag {
  font-size: 0.72rem;
  padding: 0.05rem 0.45rem;
  border-radius: 999px;
  border: 1px solid var(--soi-rule);
  background: var(--soi-paper);
}
.soi-fo-grade {
  border-color: var(--soi-olive);
  color: var(--soi-olive);
}
.soi-fo-facts {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.1rem 0.6rem;
  margin: 0 0 0.5rem;
}
.soi-fo-facts dt {
  color: var(--soi-ink-soft);
}
.soi-fo-facts dd {
  margin: 0;
  overflow-wrap: anywhere;
}
.soi-fo-facts a,
.soi-fo-inat,
.soi-fo-more {
  color: var(--soi-yellow-deep);
  font-weight: 600;
}
.soi-fo-links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.8rem;
  margin: 0;
}
.soi-fo-more {
  background: none;
  border: 0;
  padding: 0;
  cursor: pointer;
}
.soi-fo-credit {
  margin: 0.4rem 0 0;
  font-size: 0.68rem;
  color: var(--soi-ink-soft);
}
.soi-fo-showall {
  margin-top: 1rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--soi-yellow-deep);
  background: none;
  border: 0;
  cursor: pointer;
}
@media (max-width: 420px) {
  .soi-fo-card {
    grid-template-columns: auto 1fr;
  }
  .soi-fo-photo {
    width: 5.5rem;
    height: 5.5rem;
  }
  .soi-fo-photo.soi-fo-map {
    width: 120px;
    height: 120px;
  }
}
</style>
