// The data releases of Syrphidae of Italy (repository SyrphidaeOfItaly/soi-releases).
// Read once per visit and shared by the header badge and the Releases page.
import { ref } from 'vue'

export const RELEASES_REPO = 'https://github.com/SyrphidaeOfItaly/soi-releases'
export const RELEASES_URL = 'https://raw.githubusercontent.com/SyrphidaeOfItaly/soi-releases/main/releases.json'

const releases = ref([])
const loaded = ref(false)
let pending = null

export function useReleases() {
  if (!pending && !import.meta.env.SSR) {
    pending = (async () => {
      let data = null
      if (import.meta.env.DEV) {
        // to try the page before the first release: localStorage['soi-releases-test'] = JSON
        try {
          data = JSON.parse(localStorage.getItem('soi-releases-test') || 'null')
        } catch {
          data = null
        }
      }
      try {
        if (!data) data = await fetch(RELEASES_URL, { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : []))
      } catch {
        data = []
      }
      releases.value = Array.isArray(data) ? data : []
      loaded.value = true
    })()
  }
  return { releases, loaded }
}
