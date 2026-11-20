<template>
  <!-- Copies a reference as plain text (ready for a manuscript), with clear feedback -->
  <button
    type="button"
    :class="['soi-copy', { done: copied }]"
    :title="copied ? t('copiedTip') : t('tip')"
    :aria-label="copied ? t('copiedTip') : t('tip')"
    @click.stop="copy"
  >
    <svg
      v-if="!copied"
      viewBox="0 0 16 16"
      aria-hidden="true"
    ><rect
      x="5"
      y="5"
      width="8.5"
      height="8.5"
      rx="1.5"
      fill="none"
      stroke="currentColor"
      stroke-width="1.4"
    /><path
      d="M3 10.5V3.5A1 1 0 0 1 4 2.5h6.5"
      fill="none"
      stroke="currentColor"
      stroke-width="1.4"
      stroke-linecap="round"
    /></svg>
    <svg
      v-else
      viewBox="0 0 16 16"
      aria-hidden="true"
    ><path
      d="M3 8.5 6.5 12 13 4.5"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
    /></svg>
    <span>{{ copied ? t('copied') : t('copy') }}</span>
  </button>
</template>

<script setup>
import { ref } from 'vue'
import { useT } from '@/utils/soiLang.js'

const props = defineProps({
  // the reference, as HTML or text
  reference: { type: String, required: true }
})

const t = useT({
  en: { copy: 'Copy', copied: 'Copied', tip: 'Copy this reference as text', copiedTip: 'Copied to the clipboard' },
  it: { copy: 'Copia', copied: 'Copiato', tip: 'Copia questo riferimento come testo', copiedTip: 'Copiato negli appunti' }
})

const copied = ref(false)
let timer = null

async function copy() {
  // plain text: no HTML, no "[in English]" note, single spaces
  const el = document.createElement('div')
  el.innerHTML = props.reference
  const text = (el.textContent || '')
    .replace(/\s*\[in [^\]]+\]/i, '')
    .replace(/\s*Available at\s+/i, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    ta.remove()
  }
  copied.value = true
  clearTimeout(timer)
  timer = setTimeout(() => (copied.value = false), 1800)
}
</script>

<style scoped>
.soi-copy {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.15rem 0.6rem 0.15rem 0.5rem;
  border: 1px solid var(--soi-rule);
  border-radius: 999px;
  background: var(--soi-card);
  color: var(--soi-ink-soft);
  font-size: 0.72rem;
  font-weight: 600;
  line-height: 1.4;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}
.soi-copy svg {
  width: 0.8rem;
  height: 0.8rem;
}
.soi-copy:hover,
.soi-copy:focus-visible {
  border-color: var(--soi-yellow);
  background: color-mix(in srgb, var(--soi-yellow) 18%, var(--soi-card));
  color: var(--soi-ink);
}
.soi-copy.done {
  border-color: color-mix(in srgb, var(--soi-olive) 60%, transparent);
  background: color-mix(in srgb, var(--soi-olive) 14%, var(--soi-card));
  color: var(--soi-olive);
}
</style>
