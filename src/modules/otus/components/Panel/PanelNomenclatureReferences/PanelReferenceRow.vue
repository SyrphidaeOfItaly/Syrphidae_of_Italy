<template>
  <li class="soi-ref border-b border-base-muted p-3 px-5">
    <span
      class="[&>a]:break-all block"
      :title="stripHTML(reference)"
      v-html="reference"
    />
    <div class="soi-ref-actions">
      <CopyRefButton :reference="reference" />
    </div>
  </li>
</template>

<script setup>
import { stripHTML } from '../../../utils'
import CopyRefButton from '@/components/Copy/CopyRefButton.vue'

defineProps({
  reference: { type: String, required: true }
})
</script>

<style scoped>
.soi-ref :deep(a) {
  color: var(--soi-yellow-deep);
}
.soi-ref-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem;
  margin-top: 0.35rem;
}
</style>
