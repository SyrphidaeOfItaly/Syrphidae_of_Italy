<template>
  <div
    v-if="rows.length >= 2"
    class="gh mt-10"
  >
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h3 class="gh-h">{{ t('title') }}</h3>
        <p class="gh-lead">{{ t('lead', { n: rows.length }) }}</p>
      </div>
      <div
        class="gh-switch"
        role="group"
        :aria-label="t('view')"
      >
        <button
          type="button"
          :class="{ on: view === 'mix' }"
          :aria-pressed="view === 'mix'"
          @click="view = 'mix'"
        >
          {{ t('mix') }}
        </button>
        <button
          type="button"
          :class="{ on: view === 'dots' }"
          :aria-pressed="view === 'dots'"
          @click="view = 'dots'"
        >
          {{ t('dots') }}
        </button>
      </div>
    </div>

    <!-- Habitat mix: one 100% bar per species -->
    <div
      v-if="view === 'mix'"
      class="gh-mix"
    >
      <template
        v-for="r in rows"
        :key="r.id"
      >
        <RouterLink
          :to="{ name: 'otus-id-biology', params: { id: r.id } }"
          class="gh-name"
          v-html="r.html"
        />
        <div
          class="gh-bar"
          role="img"
          :aria-label="describe(r)"
        >
          <span
            v-for="tp in MAIN_TYPES.filter((x) => r.profile[x])"
            :key="tp"
            :style="{ flex: r.profile[tp], background: TYPE_COLOR[tp] }"
            :title="`${t('type_' + tp)}: ${r.profile[tp]}`"
          />
        </div>
        <span class="gh-n">{{ r.total }}</span>
      </template>
    </div>

    <!-- Dot matrix: dot size = number of habitats of that type -->
    <div
      v-else
      class="gh-dots"
    >
      <span />
      <span
        v-for="tp in MAIN_TYPES"
        :key="tp"
        class="gh-col"
        >{{ t('type_' + tp) }}</span
      >
      <template
        v-for="r in rows"
        :key="r.id"
      >
        <RouterLink
          :to="{ name: 'otus-id-biology', params: { id: r.id } }"
          class="gh-name"
          v-html="r.html"
        />
        <span
          v-for="tp in MAIN_TYPES"
          :key="tp"
          class="gh-dot"
          :title="`${t('type_' + tp)}: ${r.profile[tp]}`"
          :style="dotStyle(r.profile[tp], tp)"
        />
      </template>
    </div>

    <p class="gh-key">
      <span
        v-for="tp in MAIN_TYPES"
        :key="tp"
        ><i :style="{ background: TYPE_COLOR[tp] }" />{{ t('type_' + tp) }}</span
      >
    </p>
    <p class="gh-note">{{ t('note') }}</p>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useT } from '@/utils/soiLang.js'
import { MAIN_TYPES, TYPE_COLOR, loadAllHabitats, profileOf } from '~/panels/PanelBiology/habitatData.js'

const props = defineProps({
  // species of the genus: [{ id, html, otuId }]
  species: { type: Array, default: () => [] }
})

const t = useT({
  en: {
    title: 'Habitats of the species',
    lead: 'The habitat mix of {n} species, from the literature in SoI. Click a species for its Biology tab.',
    view: 'View',
    mix: 'Habitat mix',
    dots: 'Dot matrix',
    note: 'Each bar shows how the habitats given for the species split among the five habitat types; the number is the total of habitats. In the dot matrix, the dot size is the number of habitats of that type.',
    type_woodland: 'Woodland',
    type_scrub: 'Scrub & Mediterranean shrubland',
    type_grassland: 'Grassland',
    type_wetland: 'Wetland & coast',
    type_farmland: 'Farmland & urban'
  },
  it: {
    title: 'Habitat delle specie',
    lead: 'Gli habitat di {n} specie, dalla letteratura in SoI. Clicca una specie per la sua scheda Biologia.',
    view: 'Vista',
    mix: 'Composizione',
    dots: 'Matrice a punti',
    note: 'Ogni barra mostra come gli habitat indicati per la specie si dividono fra i cinque tipi di ambiente; il numero è il totale degli habitat. Nella matrice, la dimensione del punto è il numero di habitat di quel tipo.',
    type_woodland: 'Boschi',
    type_scrub: 'Macchia e arbusteti',
    type_grassland: 'Praterie',
    type_wetland: 'Zone umide e costa',
    type_farmland: 'Coltivi e aree urbane'
  }
})

const view = ref('mix')
const habitats = ref(new Map())

watch(
  () => props.species.some((s) => s.otuId),
  async (ready) => {
    if (ready) habitats.value = await loadAllHabitats()
  },
  { immediate: true }
)

const rows = computed(() =>
  props.species
    .filter((s) => s.otuId && habitats.value.has(s.otuId))
    .map((s) => {
      const profile = profileOf(habitats.value.get(s.otuId))
      const total = MAIN_TYPES.reduce((a, tp) => a + profile[tp], 0)
      const main = MAIN_TYPES.reduce((a, tp) => (profile[tp] > profile[a] ? tp : a), MAIN_TYPES[0])
      return { id: s.otuId, html: s.html, profile, total, main, share: total ? profile[main] / total : 0 }
    })
    .filter((r) => r.total)
    // grouped by main habitat type, specialists first within each group
    .sort((a, b) => MAIN_TYPES.indexOf(a.main) - MAIN_TYPES.indexOf(b.main) || b.share - a.share || b.total - a.total)
)

const maxCount = computed(() => Math.max(1, ...rows.value.flatMap((r) => MAIN_TYPES.map((tp) => r.profile[tp]))))

function dotStyle(n, tp) {
  const d = n ? 8 + (20 * n) / maxCount.value : 5
  return { width: d + 'px', height: d + 'px', background: n ? TYPE_COLOR[tp] : 'var(--soi-rule, #ddd4bf)' }
}

function describe(r) {
  return MAIN_TYPES.filter((tp) => r.profile[tp])
    .map((tp) => `${t('type_' + tp)} ${r.profile[tp]}`)
    .join(', ')
}
</script>

<style scoped>
.gh-h {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--soi-ink-soft, #5b5e4c);
}
.gh-lead,
.gh-note {
  font-size: 0.85rem;
  color: var(--soi-ink-soft, #5b5e4c);
  margin-top: 0.2rem;
}
.gh-note {
  margin-top: 0.4rem;
  font-size: 0.75rem;
}
.gh-switch {
  display: inline-flex;
  border: 1px solid var(--soi-rule, #ddd4bf);
  border-radius: 999px;
  overflow: hidden;
  font-size: 0.8rem;
}
.gh-switch button {
  padding: 0.25rem 0.8rem;
}
.gh-switch button.on {
  background: var(--soi-ink, #22281c);
  color: var(--soi-paper, #faf7ef);
}
.gh-mix {
  display: grid;
  grid-template-columns: minmax(9rem, 14rem) 1fr 2.2rem;
  gap: 0.45rem 0.8rem;
  align-items: center;
  margin-top: 1rem;
}
.gh-name {
  color: var(--soi-ink, #22281c) !important;
  font-size: 0.92rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.gh-name:hover {
  text-decoration: underline;
  text-underline-offset: 2px;
}
.gh-bar {
  display: flex;
  gap: 2px;
  height: 1rem;
  border-radius: 4px;
  overflow: hidden;
}
.gh-n {
  font-size: 0.8rem;
  color: var(--soi-ink-soft, #5b5e4c);
  text-align: right;
}
.gh-dots {
  display: grid;
  grid-template-columns: minmax(9rem, 14rem) repeat(5, 1fr);
  gap: 0.45rem 0.4rem;
  align-items: center;
  justify-items: center;
  margin-top: 1rem;
}
.gh-dots .gh-name {
  justify-self: start;
}
.gh-col {
  font-size: 0.7rem;
  line-height: 1.2;
  text-align: center;
  color: var(--soi-ink-soft, #5b5e4c);
  align-self: end;
}
.gh-dot {
  display: block;
  border-radius: 50%;
}
.gh-key {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem 1rem;
  margin-top: 0.9rem;
  font-size: 0.75rem;
  color: var(--soi-ink-soft, #5b5e4c);
}
.gh-key i {
  display: inline-block;
  width: 0.7rem;
  height: 0.7rem;
  border-radius: 2px;
  margin-right: 0.3rem;
  vertical-align: -1px;
}
@media (max-width: 640px) {
  .gh-mix,
  .gh-dots {
    grid-template-columns: 8rem 1fr 2rem;
  }
  .gh-dots {
    grid-template-columns: 7rem repeat(5, 1fr);
  }
  .gh-col {
    font-size: 0.6rem;
  }
}
</style>
