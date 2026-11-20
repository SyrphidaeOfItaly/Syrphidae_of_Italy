<template>
  <!-- the current data release, next to the logo: opens the Releases page -->
  <RouterLink
    v-if="latest"
    to="/releases"
    class="soi-rel-badge"
    :title="title"
    :aria-label="title"
  >
    <span class="soi-rel-dot" />v{{ latest.version }}
  </RouterLink>
</template>

<script setup>
import { computed } from 'vue'
import { useReleases } from '@/utils/soiReleases.js'
import { useT } from '@/utils/soiLang.js'

const t = useT({
  en: { title: 'Data release {v}{doi} — all releases and what changed' },
  it: { title: 'Versione dei dati {v}{doi} — tutte le versioni e cosa è cambiato' }
})

const { releases } = useReleases()
const latest = computed(() => releases.value[0] || null)
const title = computed(() =>
  latest.value ? t('title', { v: latest.value.version, doi: latest.value.doi ? `, DOI ${latest.value.doi}` : '' }) : ''
)
</script>

<style scoped>
.soi-rel-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin-left: 0.6rem;
  padding: 0.1rem 0.55rem;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, currentColor 28%, transparent);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  line-height: 1.5;
  white-space: nowrap;
  color: inherit;
  opacity: 0.9;
}
.soi-rel-badge:hover {
  opacity: 1;
  border-color: var(--soi-yellow, #f2c230);
}
.soi-rel-dot {
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 999px;
  background: var(--soi-yellow, #f2c230);
}
</style>
