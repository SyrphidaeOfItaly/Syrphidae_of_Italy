<template>
  <div class="soi min-h-screen">
    <SoiMasthead
      :eyebrow="t('eyebrow')"
      :title="t('title')"
      :lede="t('lede')"
    />

    <section class="container mx-auto box-border px-4 py-10 sm:py-14">
      <div class="grid lg:grid-cols-12 gap-10">
        <!-- the releases, newest first -->
        <div class="lg:col-span-8">
          <p
            v-if="state === 'loading'"
            class="soi-muted"
          >
            {{ t('loading') }}
          </p>
          <div
            v-else-if="!releases.length"
            class="soi-card p-6"
          >
            <p class="soi-serif text-xl font-semibold">{{ t('noneTitle') }}</p>
            <p class="mt-2 soi-muted text-sm">{{ t('noneText') }}</p>
          </div>

          <ol
            v-else
            class="rel-list"
          >
            <li
              v-for="(r, i) in releases"
              :key="r.version"
              class="rel"
            >
              <span
                class="rel-dot"
                :class="{ first: i === 0 }"
                aria-hidden="true"
              />
              <article class="soi-card p-5 sm:p-6">
                <header class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h2 class="soi-serif text-2xl font-semibold">{{ r.version }}</h2>
                  <span
                    v-if="i === 0"
                    class="rel-pill latest"
                    >{{ t('latest') }}</span
                  >
                  <span class="text-sm soi-muted">{{ fmtDate(r.date) }}</span>
                  <span class="flex-1" />
                  <a
                    v-if="r.doi"
                    :href="`https://doi.org/${r.doi}`"
                    target="_blank"
                    rel="noopener"
                    class="rel-pill doi"
                    >DOI {{ r.doi }}</a
                  >
                </header>

                <!-- the counts, with the difference from the release before -->
                <dl class="rel-counts">
                  <div
                    v-for="c in COUNTS"
                    :key="c"
                  >
                    <dt>{{ t(c) }}</dt>
                    <dd>
                      {{ fmt(r.counts?.[c]) }}
                      <small v-if="delta(i, c)">{{ delta(i, c) }}</small>
                    </dd>
                  </div>
                </dl>

                <!-- what changed -->
                <p
                  v-if="!r.changes"
                  class="mt-4 text-sm soi-muted"
                >
                  {{ i === releases.length - 1 ? t('first') : '' }}
                </p>
                <template v-else>
                  <p
                    v-if="!changeKinds(r).length"
                    class="mt-4 text-sm soi-muted"
                  >
                    {{ t('noNameChanges') }}
                  </p>
                  <details
                    v-for="k in changeKinds(r)"
                    :key="k"
                    class="rel-change"
                  >
                    <summary>
                      <span :class="['rel-pill', k]">{{ r.changes[k] }}</span>
                      {{ t(k, { n: r.changes[k] }) }}
                    </summary>
                    <ul>
                      <li
                        v-for="n in r.lists?.[k] || []"
                        :key="n.id + n.name"
                      >
                        <a
                          href="#"
                          class="rel-name"
                          @click.prevent="openName(n)"
                          ><template v-if="k === 'combination'"
                            ><i>{{ n.from }}</i> → </template
                          ><i>{{ n.name }}</i></a
                        >
                        {{ n.authorship }}
                        <span
                          v-if="k === 'status'"
                          class="soi-muted"
                          >· {{ t('st_' + n.from) }} → {{ t('st_' + n.to)
                          }}<template v-if="n.valid_name">
                            ({{ t('validIs') }} <i>{{ n.valid_name }}</i>)</template
                          ></span
                        >
                      </li>
                      <li
                        v-if="(r.lists?.[k] || []).length < r.changes[k]"
                        class="soi-muted"
                      >
                        {{ t('moreInFiles', { n: r.changes[k] - (r.lists?.[k] || []).length }) }}
                      </li>
                    </ul>
                  </details>
                </template>

                <footer class="mt-4 flex flex-wrap gap-2">
                  <a
                    :href="`${REPO}/releases/tag/v${r.version}`"
                    target="_blank"
                    rel="noopener"
                    class="soi-btn soi-btn-line !py-1.5 !px-3.5 text-sm"
                    >{{ t('download') }} ↗</a
                  >
                  <a
                    v-if="r.doi"
                    :href="`https://doi.org/${r.doi}`"
                    target="_blank"
                    rel="noopener"
                    class="soi-btn soi-btn-line !py-1.5 !px-3.5 text-sm"
                    >Zenodo ↗</a
                  >
                </footer>
              </article>
            </li>
          </ol>
        </div>

        <!-- how releases work and how to cite them -->
        <aside class="lg:col-span-4 space-y-6">
          <div class="soi-card p-5">
            <p class="soi-eyebrow">{{ t('whatTitle') }}</p>
            <p class="mt-2 text-sm leading-relaxed">{{ t('whatText') }}</p>
            <ul class="mt-3 text-sm space-y-1 rel-files">
              <li><b>names.csv</b> · {{ t('fNames') }}</li>
              <li><b>associations.csv</b> · {{ t('fAssoc') }}</li>
              <li><b>references.csv</b> · {{ t('fRefs') }}</li>
              <li><b>occurrences (DwC-A)</b> · {{ t('fOcc') }}</li>
            </ul>
          </div>
          <div
            v-if="releases.length"
            class="soi-card p-5"
          >
            <p class="soi-eyebrow">{{ t('citeTitle') }}</p>
            <p class="mt-2 text-sm leading-relaxed">{{ citation }}</p>
            <p class="mt-2 text-xs soi-muted">{{ t('citeHint') }}</p>
          </div>
          <p class="text-xs soi-muted leading-relaxed">{{ t('licence') }}</p>
        </aside>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useHead } from '@unhead/vue'
import { makeAPIRequest } from '@/utils/request'
import { useT, isIt } from '@/utils/soiLang.js'

// where the releases live (the soi-releases repository on GitHub)
const REPO = 'https://github.com/SyrphidaeOfItaly/soi-releases'
const RELEASES_URL = 'https://raw.githubusercontent.com/SyrphidaeOfItaly/soi-releases/main/releases.json'
const COUNTS = ['species', 'genera', 'invalid_names', 'associations', 'references', 'occurrences']

const t = useT({
  en: {
    eyebrow: 'Data releases',
    title: 'Releases',
    lede: 'Frozen, citable versions of the catalogue. Each release is archived on Zenodo with its own DOI and lists what changed since the one before.',
    loading: 'Loading the releases…',
    noneTitle: 'No release yet',
    noneText: 'The first release will appear here, with its DOI.',
    latest: 'latest',
    species: 'Valid species',
    genera: 'Valid genera',
    invalid_names: 'Invalid names',
    references: 'References',
    associations: 'Associations',
    occurrences: 'Records',
    first: 'First release.',
    noNameChanges: 'No changes to the names.',
    added: 'names added',
    status: 'changes of status',
    combination: 'moved to another genus or combination',
    removed: 'names removed',
    st_valid: 'valid',
    st_invalid: 'invalid',
    st_unavailable: 'unavailable',
    validIs: 'valid name',
    moreInFiles: '… and {n} more (see names.csv in the release)',
    download: 'Files of this release',
    whatTitle: 'What a release is',
    whatText: 'A snapshot of the whole catalogue on one day, fixed forever: the website keeps changing, a release does not. Use it when you need to cite exactly the data you used.',
    fNames: 'every name, with its status and valid name',
    fRefs: 'every reference',
    fAssoc: 'the biological associations, with the plants, prey, hosts and parasitoids involved',
    fOcc: 'the specimen and observation records, as on GBIF',
    citeTitle: 'How to cite',
    citeHint: 'Cite the version you used. Releases are made twice a year, and whenever the catalogue changes a lot.',
    licence: 'Data released under CC0 1.0 (public domain). Citation is appreciated.'
  },
  it: {
    eyebrow: 'Versioni dei dati',
    title: 'Versioni',
    lede: 'Versioni fisse e citabili del catalogo. Ogni versione è archiviata su Zenodo con il proprio DOI e riporta cosa è cambiato rispetto alla precedente.',
    loading: 'Caricamento delle versioni…',
    noneTitle: 'Ancora nessuna versione',
    noneText: 'La prima versione comparirà qui, con il suo DOI.',
    latest: 'ultima',
    species: 'Specie valide',
    genera: 'Generi validi',
    invalid_names: 'Nomi non validi',
    references: 'Riferimenti',
    associations: 'Associazioni',
    occurrences: 'Record',
    first: 'Prima versione.',
    noNameChanges: 'Nessuna modifica ai nomi.',
    added: 'nomi aggiunti',
    status: 'cambi di stato',
    combination: 'spostati in un altro genere o combinazione',
    removed: 'nomi rimossi',
    st_valid: 'valido',
    st_invalid: 'non valido',
    st_unavailable: 'non disponibile',
    validIs: 'nome valido',
    moreInFiles: '… e altri {n} (vedi names.csv nella versione)',
    download: 'File di questa versione',
    whatTitle: 'Che cos’è una versione',
    whatText: 'Una fotografia dell’intero catalogo in un giorno, fissata per sempre: il sito continua a cambiare, una versione no. Usala quando devi citare esattamente i dati che hai usato.',
    fNames: 'tutti i nomi, con stato e nome valido',
    fRefs: 'tutti i riferimenti',
    fAssoc: 'le associazioni biologiche, con piante, prede, ospiti e parassitoidi coinvolti',
    fOcc: 'i record di esemplari e osservazioni, come su GBIF',
    citeTitle: 'Come citare',
    citeHint: 'Cita la versione che hai usato. Le versioni escono due volte l’anno e ogni volta che il catalogo cambia molto.',
    licence: 'Dati rilasciati con licenza CC0 1.0 (pubblico dominio). La citazione è gradita.'
  }
})

const router = useRouter()
const releases = ref([])
const state = ref('loading')

const fmt = (n) => (n == null ? '—' : Number(n).toLocaleString(isIt.value ? 'it-IT' : 'en-US'))
const fmtDate = (d) =>
  d ? new Date(d + 'T12:00:00').toLocaleDateString(isIt.value ? 'it-IT' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : ''
function delta(i, c) {
  const older = releases.value[i + 1]
  if (!older) return ''
  const d = (releases.value[i].counts?.[c] || 0) - (older.counts?.[c] || 0)
  return d ? (d > 0 ? '+' : '−') + fmt(Math.abs(d)) : ''
}
const changeKinds = (r) => ['added', 'status', 'combination', 'removed'].filter((k) => r.changes?.[k])

const citation = computed(() => {
  const r = releases.value[0]
  if (!r) return ''
  const y = (r.date || '').slice(0, 4)
  return `Sommaggio D, Dal Pos D (${y}). Syrphidae of Italy (SoI), version ${r.version}. Zenodo.${r.doi ? ` https://doi.org/${r.doi}` : ''}`
})

// a name in the lists opens its page (found through its taxon name)
async function openName(n) {
  try {
    const { data } = await makeAPIRequest.get('/otus', { params: { 'taxon_name_id[]': [n.id] } })
    const otu = (Array.isArray(data) ? data : [])[0]
    if (otu) router.push({ name: 'otus-id-overview', params: { id: otu.id } })
  } catch {
    // nothing to open
  }
}

onMounted(async () => {
  try {
    let data = null
    if (import.meta.env.DEV) {
      try {
        data = JSON.parse(localStorage.getItem('soi-releases-test') || 'null')
      } catch {
        data = null
      }
    }
    if (!data) data = await fetch(RELEASES_URL, { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : []))
    releases.value = Array.isArray(data) ? data : []
  } catch {
    releases.value = []
  }
  state.value = 'done'
})

useHead({
  title: () => `${t('title')} — Syrphidae of Italy`,
  meta: [{ name: 'description', content: () => t('lede') }]
})
</script>

<style scoped>
.rel-list {
  margin: 0;
  padding: 0;
  list-style: none;
  position: relative;
}
.rel {
  position: relative;
  padding-left: 1.6rem;
}
.rel + .rel {
  margin-top: 1.4rem;
}
/* the line joining the releases */
.rel::before {
  content: '';
  position: absolute;
  left: 0.36rem;
  top: 1.4rem;
  bottom: -1.4rem;
  width: 2px;
  background: var(--soi-rule);
}
.rel:last-child::before {
  display: none;
}
.rel-dot {
  position: absolute;
  left: 0;
  top: 1.15rem;
  width: 0.85rem;
  height: 0.85rem;
  border-radius: 999px;
  background: var(--soi-paper);
  border: 2px solid var(--soi-ink-soft);
}
.rel-dot.first {
  background: var(--soi-yellow);
  border-color: var(--soi-yellow-deep);
}
.rel-pill {
  display: inline-block;
  padding: 0.02rem 0.55rem;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 700;
  line-height: 1.5;
  white-space: nowrap;
  --pill: var(--soi-olive);
  color: var(--pill);
  background: color-mix(in srgb, var(--pill) 13%, transparent);
  border: 1px solid color-mix(in srgb, var(--pill) 30%, transparent);
}
.rel-pill.latest {
  --pill: var(--soi-yellow-deep);
}
.rel-pill.doi {
  --pill: var(--soi-sea);
}
.rel-pill.doi:hover {
  text-decoration: underline;
}
.rel-pill.status {
  --pill: var(--soi-yellow-deep);
}
.rel-pill.removed {
  --pill: var(--soi-terra);
}
.rel-pill.combination {
  --pill: var(--soi-sea);
}
.rel-counts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(7.5rem, 1fr));
  gap: 0.8rem 1rem;
  margin: 1rem 0 0;
  padding: 0.8rem 0;
  border-top: 1px solid var(--soi-rule);
  border-bottom: 1px solid var(--soi-rule);
}
.rel-counts dt {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--soi-ink-soft);
}
.rel-counts dd {
  margin: 0.15rem 0 0;
  font-family: 'Fraunces', Georgia, serif;
  font-size: 1.35rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--soi-ink);
}
.rel-counts small {
  margin-left: 0.25rem;
  font-family: 'Source Sans 3', system-ui, sans-serif;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--soi-olive);
}
.rel-change {
  margin-top: 0.7rem;
  font-size: 0.9rem;
}
.rel-change summary {
  cursor: pointer;
  color: var(--soi-ink);
}
.rel-change summary .rel-pill {
  margin-right: 0.3rem;
}
.rel-change ul {
  margin: 0.4rem 0 0 1.2rem;
  padding: 0;
  list-style: none;
  font-size: 0.85rem;
  line-height: 1.6;
  color: var(--soi-ink-soft);
}
.rel-name {
  color: var(--soi-ink);
  text-decoration: underline;
  text-decoration-color: var(--soi-yellow);
  text-decoration-thickness: 2px;
  text-underline-offset: 3px;
}
.rel-files b {
  font-weight: 600;
  color: var(--soi-ink);
}
</style>
