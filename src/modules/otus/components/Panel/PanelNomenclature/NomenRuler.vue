<template>
  <!-- The name's history as a ruler: one small stacked bar per year,
       coloured by kind of act. Click a year to list only its entries. -->
  <div
    v-if="years.length > 1"
    ref="box"
    class="soi-ruler px-5 pt-3 pb-2"
  >
    <div class="soi-ruler-plot">
      <svg
        :width="width"
        :height="H"
        class="soi-ruler-svg"
        role="listbox"
        :aria-label="t('aria', { a: minYear, b: maxYear })"
        tabindex="0"
        @keydown="onKey"
        @blur="kbd = -1"
        @mouseleave="hover = null"
      >
        <!-- ruler: minor ticks, longer labelled ones -->
        <line
          :x1="PAD"
          :x2="width - PAD"
          :y1="BASE"
          :y2="BASE"
          class="soi-ruler-base"
        />
        <line
          v-for="m in minorTicks"
          :key="`m${m}`"
          :x1="x(m)"
          :x2="x(m)"
          :y1="BASE"
          :y2="BASE + 3"
          class="soi-ruler-tick"
        />
        <g
          v-for="tk in labelTicks"
          :key="`l${tk}`"
        >
          <line
            :x1="x(tk)"
            :x2="x(tk)"
            :y1="BASE"
            :y2="BASE + 7"
            class="soi-ruler-tick"
          />
          <text
            :x="x(tk)"
            :y="BASE + 19"
            text-anchor="middle"
            class="soi-ruler-label"
          >{{ tk }}</text>
        </g>

        <!-- one bar per year, stacked by kind -->
        <g
          v-for="(y, i) in years"
          :key="y.year"
          :class="['soi-ruler-year', { picked: y.year === selectedYear, dim: dimmed(y) }]"
          role="option"
          :aria-selected="y.year === selectedYear"
          @mouseenter="hover = y.year"
          @click="$emit('select', y.year)"
        >
          <rect
            :x="x(y.year) - HIT / 2"
            :y="BASE - MAXH - 6"
            :width="HIT"
            :height="MAXH + 6"
            class="soi-ruler-hit"
          />
          <rect
            v-for="seg in y.segments"
            :key="seg.tone"
            :x="x(y.year) - BAR / 2"
            :y="seg.y"
            :width="BAR"
            :height="seg.h"
            :class="`soi-tone-${seg.tone}`"
          />
          <rect
            v-if="y.year === selectedYear || (kbd === i && hover === null)"
            :x="x(y.year) - BAR / 2 - 2.5"
            :y="BASE - y.height - 2.5"
            :width="BAR + 5"
            :height="y.height + 2.5"
            rx="2"
            class="soi-ruler-ring"
          />
        </g>
      </svg>

      <!-- what the pointer is on -->
      <div
        v-if="current"
        class="soi-ruler-note"
        :style="noteStyle"
      >
        <strong class="soi-serif">{{ current.year }}</strong>
        <span> · {{ current.count === 1 ? t('entry1') : t('entryN', { n: current.count }) }}</span>
        <ul>
          <li
            v-for="seg in current.segments"
            :key="seg.tone"
          >
            <span :class="['soi-ruler-sw', `soi-tone-${seg.tone}`]" />
            {{ t(KIND_LABEL[seg.tone]) }} <span class="opacity-60">{{ seg.n }}</span>
          </li>
        </ul>
        <em>{{ current.year === selectedYear ? t('clickAll') : t('clickYear') }}</em>
      </div>
    </div>

    <p class="soi-ruler-key">
      <span
        v-for="k in key"
        :key="k.tone"
      >
        <span :class="['soi-ruler-sw', `soi-tone-${k.tone}`]" />
        {{ t(KIND_LABEL[k.tone]) }}
      </span>
    </p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { entryKind } from './nomenEntry'
import { useT } from '@/utils/soiLang.js'

const props = defineProps({
  entries: { type: Array, required: true },
  timeline: { type: Array, default: () => [] },
  selectedYear: { type: Number, default: null }
})
const emit = defineEmits(['select'])

const t = useT({
  en: {
    aria: 'History of the name, {a}–{b}. Arrow keys move, Enter picks a year.',
    entry1: '1 entry',
    entryN: '{n} entries',
    clickYear: 'Click to list only this year',
    clickAll: 'Click again to list all years',
    orig: 'Original description',
    comb: 'Combination / placement',
    syn: 'Synonymy',
    warn: 'Homonymy, unavailable',
    type: 'Type designation',
    muted: 'Cited'
  },
  it: {
    aria: 'Storia del nome, {a}–{b}. Frecce per spostarsi, Invio per scegliere un anno.',
    entry1: '1 voce',
    entryN: '{n} voci',
    clickYear: 'Clicca per elencare solo questo anno',
    clickAll: 'Clicca di nuovo per elencare tutti gli anni',
    orig: 'Descrizione originale',
    comb: 'Combinazione / collocazione',
    syn: 'Sinonimia',
    warn: 'Omonimia, non disponibile',
    type: 'Designazione del tipo',
    muted: 'Citazione'
  }
})
const KIND_LABEL = { orig: 'orig', comb: 'comb', syn: 'syn', warn: 'warn', type: 'type', muted: 'muted', info: 'muted' }
const ORDER = ['orig', 'type', 'syn', 'warn', 'comb', 'muted']

const H = 74
const PAD = 14
const BASE = 50
const MAXH = 40
const BAR = 7
const HIT = 14

const box = ref(null)
const width = ref(500)
let ro = null
onMounted(() => {
  ro = new ResizeObserver(([e]) => (width.value = Math.max(240, Math.round(e.contentRect.width))))
  if (box.value) ro.observe(box.value)
})
onBeforeUnmount(() => ro?.disconnect())

const years = computed(() => {
  const m = new Map()
  for (const e of props.entries) {
    const y = Number(e.year)
    if (!(y > 1700 && y < 2200)) continue
    let tone = entryKind(e, props.timeline).tone
    if (tone === 'info') tone = 'muted'
    if (!m.has(y)) m.set(y, { year: y, count: 0, tones: {} })
    const g = m.get(y)
    g.count++
    g.tones[tone] = (g.tones[tone] || 0) + 1
  }
  const list = [...m.values()].sort((a, b) => a.year - b.year)
  const most = Math.max(1, ...list.map((g) => g.count))
  return list.map((g) => {
    // bar height grows with the square root, so one busy year does not flatten the rest
    const total = Math.max(8, MAXH * Math.sqrt(g.count / most))
    let top = BASE
    const segments = ORDER.filter((tn) => g.tones[tn]).map((tn) => {
      const h = Math.max(3, (total * g.tones[tn]) / g.count)
      top -= h
      return { tone: tn, n: g.tones[tn], y: top, h: h - 0.6 }
    })
    return { ...g, segments, height: BASE - top }
  })
})

const minYear = computed(() => years.value[0]?.year || 0)
const maxYear = computed(() => years.value.at(-1)?.year || 0)
const x = (y) => {
  const span = Math.max(maxYear.value - minYear.value, 1)
  return PAD + ((y - minYear.value) / span) * (width.value - 2 * PAD)
}

// ruler ticks
const span = computed(() => maxYear.value - minYear.value)
const labelStep = computed(() => {
  const room = Math.max(2, Math.floor(width.value / 70))
  return [5, 10, 20, 25, 50, 100].find((s) => span.value / s <= room) || 100
})
const minorStep = computed(() => (labelStep.value >= 50 ? 10 : labelStep.value >= 20 ? 5 : 1))
const labelTicks = computed(() => {
  const out = []
  for (let v = Math.ceil(minYear.value / labelStep.value) * labelStep.value; v <= maxYear.value; v += labelStep.value) out.push(v)
  return out
})
const minorTicks = computed(() => {
  const out = []
  if (width.value / Math.max(1, span.value / minorStep.value) < 4) return out
  for (let v = Math.ceil(minYear.value / minorStep.value) * minorStep.value; v <= maxYear.value; v += minorStep.value) out.push(v)
  return out
})

// pointer and keyboard
const hover = ref(null)
const kbd = ref(-1)
const current = computed(() => {
  const y = hover.value ?? years.value[kbd.value]?.year
  return years.value.find((g) => g.year === y) || null
})
const dimmed = (g) => (props.selectedYear ? g.year !== props.selectedYear : hover.value !== null && g.year !== hover.value)
const noteStyle = computed(() => {
  const g = current.value
  const w = Math.min(230, width.value - 16)
  const left = Math.min(Math.max(x(g.year) - w / 2, 4), width.value - w - 4)
  return { left: `${left}px`, bottom: `${H - (BASE - g.height) + 10}px`, width: `${w}px` }
})
function onKey(e) {
  const n = years.value.length
  if (e.key === 'ArrowRight') kbd.value = Math.min(n - 1, kbd.value + 1)
  else if (e.key === 'ArrowLeft') kbd.value = Math.max(0, kbd.value - 1)
  else if (e.key === 'Enter' && years.value[kbd.value]) emit('select', years.value[kbd.value].year)
  else return
  hover.value = null
  e.preventDefault()
}

const key = computed(() => {
  const seen = new Set(years.value.flatMap((g) => g.segments.map((s) => s.tone)))
  return ORDER.filter((tn) => seen.has(tn)).map((tone) => ({ tone }))
})
</script>

<style scoped>
.soi-ruler {
  border-bottom: 1px dashed var(--soi-rule);
}
.soi-ruler-plot {
  position: relative;
}
.soi-ruler-svg {
  display: block;
  overflow: visible;
  outline: none;
}
.soi-ruler-svg:focus-visible {
  outline: 2px solid var(--soi-yellow);
  outline-offset: 3px;
}
.soi-ruler-base {
  stroke: var(--soi-ink-soft);
  stroke-width: 1.2;
}
.soi-ruler-tick {
  stroke: var(--soi-ink-soft);
  stroke-width: 1;
  opacity: 0.7;
}
.soi-ruler-label {
  font-family: 'Fraunces', Georgia, serif;
  font-size: 11px;
  fill: var(--soi-ink-soft);
}
.soi-ruler-year {
  cursor: pointer;
  transition: opacity 0.12s;
}
.soi-ruler-year.dim {
  opacity: 0.3;
}
.soi-ruler-hit {
  fill: transparent;
}
.soi-ruler-ring {
  fill: none;
  stroke: var(--soi-yellow);
  stroke-width: 2;
}
.soi-ruler-note {
  position: absolute;
  z-index: 5;
  padding: 0.45rem 0.6rem;
  background: var(--soi-card);
  border: 1px solid var(--soi-rule);
  box-shadow: 2px 2px 0 var(--soi-rule);
  font-size: 0.76rem;
  line-height: 1.4;
  color: var(--soi-ink);
  pointer-events: none;
}
.soi-ruler-note ul {
  margin: 0.2rem 0;
}
.soi-ruler-note em {
  color: var(--soi-ink-soft);
  font-size: 0.7rem;
}
.soi-ruler-key {
  display: flex;
  flex-wrap: wrap;
  gap: 0.2rem 0.9rem;
  margin: 0.2rem 0 0;
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--soi-ink-soft);
}
.soi-ruler-sw {
  display: inline-block;
  width: 0.6rem;
  height: 0.6rem;
  margin-right: 0.25rem;
  vertical-align: -1px;
}
span.soi-ruler-sw.soi-tone-orig { background: var(--soi-sea); }
span.soi-ruler-sw.soi-tone-comb { background: var(--soi-olive); }
span.soi-ruler-sw.soi-tone-syn { background: var(--soi-yellow-deep); }
span.soi-ruler-sw.soi-tone-warn { background: var(--soi-terra); }
span.soi-ruler-sw.soi-tone-type { background: var(--soi-ink); }
span.soi-ruler-sw.soi-tone-muted { background: var(--soi-rule); }
rect.soi-tone-orig { fill: var(--soi-sea); }
rect.soi-tone-comb { fill: var(--soi-olive); }
rect.soi-tone-syn { fill: var(--soi-yellow-deep); }
rect.soi-tone-warn { fill: var(--soi-terra); }
rect.soi-tone-type { fill: var(--soi-ink); }
rect.soi-tone-muted { fill: var(--soi-rule); stroke: var(--soi-ink-soft); stroke-width: 0.5; }
</style>
