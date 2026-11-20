<template>
  <div>
    <p class="soi-eyebrow capitalize">
      {{ store.taxon.rank || 'Combination' }}
      <span
        class="soi-status"
        :class="store.taxon.is_valid ? 'soi-status-ok' : 'soi-status-no'"
        :title="store.taxon.short_status"
        >{{ store.taxon.is_valid ? t('valid') : store.taxon.cached_is_available === false ? t('unavailable') : t('invalid') }}</span
      >
    </p>
    <h1 class="soi-taxon-title soi-serif mt-2 text-4xl sm:text-5xl leading-tight font-semibold">
      <span>
        <span
          :title="store.taxon.short_status"
          v-html="store.taxon.full_name_tag"
        />
        <span
          v-if="!store.taxon.is_valid"
          class="ml-1 text-red-600 text-2xl"
          title="Invalid"
        >
          &#10005;
        </span>
        <span
          v-if="store.taxon.descorator_status.length"
          class="text-base-soft text-base"
        >
          ({{ store.taxon.descorator_status.join('; ') }})
        </span>
      </span>
    </h1>
    <span class="block mt-1 text-lg soi-muted">
      <CommonNames />
    </span>

    <!-- An invalid name: a margin note pointing to the valid one -->
    <p
      v-if="validName"
      class="soi-valid-note"
    >
      <span class="soi-valid-note-label">{{ t('validName') }}</span>
      <RouterLink
        v-if="validName.otuId"
        :to="{ name: 'otus-id-overview', params: { id: validName.otuId } }"
        class="soi-valid-note-link"
        ><span v-html="validName.html"
      /></RouterLink>
      <span
        v-else
        v-html="validName.html"
      />
    </p>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { makeAPIRequest } from '@/utils/request'
import { useOtuStore } from '../store/store'
import CommonNames from './CommonNames.vue'
import { useT } from '@/utils/soiLang.js'

const t = useT({
  en: { valid: 'valid', invalid: 'invalid', unavailable: 'unavailable', validName: 'Valid name' },
  it: { valid: 'valido', invalid: 'non valido', unavailable: 'non disponibile', validName: 'Nome valido' }
})

const store = useOtuStore()

// For an invalid name: the valid name and its page
const validName = ref(null)
watch(
  () => [store.taxon?.id, store.taxon?.cached_valid_taxon_name_id, store.taxon?.is_valid],
  async ([id, validId, isValid]) => {
    validName.value = null
    if (!id || !validId || isValid || validId === id) return
    try {
      const [{ data: tn }, { data: otus }] = await Promise.all([
        makeAPIRequest.get(`/taxon_names/${validId}`),
        makeAPIRequest.get('/otus', { params: { 'taxon_name_id[]': validId } })
      ])
      if (store.taxon?.id !== id) return
      validName.value = {
        html: `${tn.cached_html || tn.cached}${tn.cached_author_year ? ' ' + tn.cached_author_year : ''}`,
        otuId: otus?.[0]?.id || null
      }
    } catch {
      validName.value = null
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.soi-taxon-title {
  font-weight: 400;
  color: var(--soi-ink-soft);
}
.soi-taxon-title :deep(i) {
  font-style: italic;
  font-weight: 600;
  color: var(--soi-ink);
}
.soi-status {
  display: inline-block;
  margin-left: 0.6rem;
  padding: 0.05rem 0.5rem;
  border-radius: 999px;
  font-size: 0.65rem;
  letter-spacing: 0.1em;
  vertical-align: 1px;
}
.soi-status-ok {
  background: color-mix(in srgb, var(--soi-olive) 16%, transparent);
  color: var(--soi-olive);
}
.soi-valid-note {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.2rem 0.6rem;
  margin-top: 0.9rem;
  padding-left: 0.8rem;
  border-left: 3px solid var(--soi-terra);
  font-size: 1rem;
}
.soi-valid-note-label {
  font-size: 0.7rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--soi-terra);
}
.soi-valid-note-link {
  font-family: 'Fraunces', Georgia, serif;
  color: var(--soi-ink);
  text-decoration: underline;
  text-decoration-color: var(--soi-yellow);
  text-decoration-thickness: 2px;
  text-underline-offset: 3px;
}
.soi-valid-note-link :deep(i) {
  font-style: italic;
}
.soi-status-no {
  background: color-mix(in srgb, var(--soi-terra) 16%, transparent);
  color: var(--soi-terra);
}
</style>
