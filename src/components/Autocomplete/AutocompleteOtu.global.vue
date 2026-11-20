<template>
  <Autocomplete
    url="/otus/autocomplete"
    query-param="term"
    label="label_html"
    :autofocus="autofocus"
    :params="{ having_taxon_name_only: true }"
    @select="loadOtu"
  />
</template>

<script setup>
import { useRouter } from 'vue-router'
import Autocomplete from '@/components/Autocomplete/Autocomplete.global.vue'

const router = useRouter()

const props = defineProps({
  autofocus: {
    type: Boolean,
    default: false
  }
})

const loadOtu = ({ id, otu_valid_id }) => {
  router.push({
    name: 'otus-id-overview',
    params: {
      // an invalid name opens its own page (which links to the valid name);
      // an old combination already points at the valid species' page
      id: id || otu_valid_id
    }
  })
}
</script>
