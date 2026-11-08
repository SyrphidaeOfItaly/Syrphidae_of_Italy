<template>
  <section class="hr">
    <h3 class="bio-h">{{ t('title') }}</h3>
    <div class="hr-body">
      <svg
        :viewBox="`0 0 ${W} ${H}`"
        class="hr-svg"
        role="img"
        :aria-label="ariaLabel"
      >
        <!-- rings and axes -->
        <polygon
          v-for="f in [1 / 3, 2 / 3, 1]"
          :key="f"
          :points="ring(f)"
          class="hr-ring"
        />
        <g
          v-for="(tp, i) in MAIN_TYPES"
          :key="tp"
        >
          <line
            :x1="CX"
            :y1="CY"
            :x2="pt(i, R)[0]"
            :y2="pt(i, R)[1]"
            class="hr-ring"
          />
          <text
            :x="pt(i, R + 16)[0]"
            :y="pt(i, R + 16)[1] + 4"
            :text-anchor="anchor(i)"
            class="hr-label"
          >
            {{ t('type_' + tp) }}
          </text>
        </g>
        <!-- compared species first, this species on top -->
        <polygon
          v-for="s in shownOthers"
          :key="s.id"
          :points="shape(s.profile)"
          :fill="s.color"
          fill-opacity="0.12"
          :stroke="s.color"
          stroke-width="2"
          stroke-dasharray="5 3"
        />
        <polygon
          :points="shape(ownProfile)"
          class="hr-own"
        />
      </svg>

      <div class="hr-side">
        <p class="hr-legend">
          <i class="hr-sw own" /><span v-html="ownName || t('this')" />
        </p>
        <p
          v-for="s in shownOthers"
          :key="s.id"
          class="hr-legend"
        >
          <i
            class="hr-sw"
            :style="{ borderColor: s.color }"
          /><RouterLink
            :to="{ name: 'otus-id-biology', params: { id: s.id } }"
            v-html="s.html"
          />
        </p>

        <p class="hr-sub">{{ t('similar') }}</p>
        <p
          v-if="loading"
          class="bio-muted text-sm"
        >
          {{ t('loading') }}
        </p>
        <p
          v-else-if="!similar.length"
          class="bio-muted text-sm"
        >
          {{ t('none') }}
        </p>
        <ul
          v-else
          class="hr-sim"
        >
          <li
            v-for="s in similar"
            :key="s.id"
          >
            <button
              type="button"
              class="hr-pick"
              :class="{ on: picked.includes(s.id) }"
              :aria-pressed="picked.includes(s.id)"
              :disabled="!picked.includes(s.id) && picked.length >= 2"
              :title="picked.includes(s.id) ? t('remove') : t('add')"
              @click="toggle(s.id)"
            >
              <span
                class="hr-name"
                v-html="s.html"
              />
              <span class="hr-pct">{{ Math.round(s.overlap * 100) }}%</span>
            </button>
          </li>
        </ul>
      </div>
    </div>
    <p class="bio-legend">{{ t('legend') }}</p>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useT } from '@/utils/soiLang.js'
import { MAIN_TYPES, loadAllHabitats, loadOtuNames, mostSimilar, profileOf } from '../habitatData.js'

const props = defineProps({
  otuId: { type: Number, required: true },
  // habitat names of this species (traits.habitat)
  items: { type: Array, default: () => [] }
})

const t = useT({
  en: {
    title: 'Habitat profile',
    this: 'This species',
    similar: 'Most similar species (shared habitats)',
    loading: 'Looking for similar species…',
    none: 'No other hoverfly in SoI shares these habitats yet.',
    add: 'Compare on the chart',
    remove: 'Remove from the chart',
    legend: 'The shape shows how many habitats the literature gives for each habitat type. Click up to two similar species to compare them (dashed).',
    aria: 'Habitat profile: {p}',
    type_woodland: 'Woodland',
    type_scrub: 'Scrub',
    type_grassland: 'Grassland',
    type_wetland: 'Wetland & coast',
    type_farmland: 'Farmland & urban'
  },
  it: {
    title: 'Profilo degli habitat',
    this: 'Questa specie',
    similar: 'Specie più simili (habitat in comune)',
    loading: 'Cerco specie simili…',
    none: 'Nessun altro sirfide in SoI condivide ancora questi habitat.',
    add: 'Confronta sul grafico',
    remove: 'Togli dal grafico',
    legend: 'La forma mostra quanti habitat la letteratura indica per ogni tipo di ambiente. Clicca fino a due specie simili per confrontarle (tratteggio).',
    aria: 'Profilo degli habitat: {p}',
    type_woodland: 'Boschi',
    type_scrub: 'Macchia',
    type_grassland: 'Praterie',
    type_wetland: 'Zone umide e costa',
    type_farmland: 'Coltivi e aree urbane'
  }
})

// ---------- geometry ----------
const W = 360
const H = 290
const CX = 180
const CY = 148
const R = 92
const angle = (i) => -Math.PI / 2 + (i * 2 * Math.PI) / MAIN_TYPES.length
const pt = (i, r) => [CX + r * Math.cos(angle(i)), CY + r * Math.sin(angle(i))]
const ring = (f) => MAIN_TYPES.map((_, i) => pt(i, R * f).join(',')).join(' ')
const anchor = (i) => {
  const x = Math.cos(angle(i))
  return Math.abs(x) < 0.2 ? 'middle' : x > 0 ? 'start' : 'end'
}

// ---------- data ----------
const COLORS = ['#c2603a', '#3f86b2']
const ownProfile = computed(() => profileOf(props.items))
const ownName = ref('')
const similar = ref([])
const picked = ref([])
const others = ref(new Map()) // id → habitat names
const loading = ref(true)

watch(
  () => props.otuId,
  async (id) => {
    loading.value = true
    picked.value = []
    const [all, top] = await Promise.all([loadAllHabitats(), mostSimilar(id, props.items, 5)])
    others.value = all
    const names = await loadOtuNames([id, ...top.map((s) => s.id)])
    ownName.value = names.get(id) || ''
    similar.value = top.filter((s) => names.has(s.id)).map((s) => ({ ...s, html: names.get(s.id) }))
    if (similar.value.length) picked.value = [similar.value[0].id]
    loading.value = false
  },
  { immediate: true }
)

function toggle(id) {
  picked.value = picked.value.includes(id) ? picked.value.filter((x) => x !== id) : [...picked.value, id].slice(-2)
}

const shownOthers = computed(() =>
  picked.value.map((id, k) => ({
    id,
    html: similar.value.find((s) => s.id === id)?.html || '',
    profile: profileOf(others.value.get(id) || []),
    color: COLORS[k]
  }))
)

// all shapes on the same scale: the largest count shown reaches the outer ring
const maxCount = computed(() =>
  Math.max(1, ...[ownProfile.value, ...shownOthers.value.map((s) => s.profile)].flatMap((p) => MAIN_TYPES.map((tp) => p[tp])))
)
const shape = (p) => MAIN_TYPES.map((tp, i) => pt(i, Math.max(3, (R * p[tp]) / maxCount.value)).join(',')).join(' ')

const ariaLabel = computed(() =>
  t('aria', { p: MAIN_TYPES.map((tp) => `${t('type_' + tp)} ${ownProfile.value[tp]}`).join(', ') })
)
</script>

<style scoped>
.bio-h {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--bio-muted);
  margin-bottom: 0.4rem;
}
.bio-muted {
  color: var(--bio-muted);
}
.bio-legend {
  margin-top: 0.6rem;
  font-size: 0.75rem;
  color: var(--bio-muted);
}
.hr-body {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem 1.5rem;
  align-items: flex-start;
}
.hr-svg {
  width: 100%;
  max-width: 360px;
  flex: 1 1 260px;
  overflow: visible;
}
.hr-ring {
  fill: none;
  stroke: var(--bio-rule);
}
.hr-label {
  font-size: 11px;
  fill: var(--bio-muted);
}
.hr-own {
  fill: var(--bio-bar);
  fill-opacity: 0.25;
  stroke: var(--bio-bar);
  stroke-width: 2.5;
}
.hr-side {
  flex: 1 1 220px;
  min-width: 0;
}
.hr-legend {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  margin-bottom: 0.25rem;
}
.hr-sw {
  width: 1.2rem;
  height: 0;
  border-top: 2px dashed;
}
.hr-sw.own {
  border-top: 3px solid var(--bio-bar);
}
.hr-sub {
  margin: 0.9rem 0 0.3rem;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--bio-muted);
}
.hr-sim {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.hr-pick {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--bio-rule);
  border-radius: 6px;
  text-align: left;
  font-size: 0.88rem;
}
.hr-pick:hover:not(:disabled) {
  border-color: var(--bio-ink);
}
.hr-pick.on {
  background: var(--bio-ink);
  color: var(--soi-paper, #faf7ef);
  border-color: var(--bio-ink);
}
.hr-pick:disabled {
  opacity: 0.45;
  cursor: default;
}
.hr-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.hr-pct {
  font-weight: 700;
  font-size: 0.8rem;
}
</style>
