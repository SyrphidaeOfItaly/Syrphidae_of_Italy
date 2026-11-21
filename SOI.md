# Syrphidae of Italy — what is specific to this site

`README.md` documents TaxonPages in general. This file lists what Syrphidae of Italy (SoI) adds
or changes, and where each part is documented.

## Languages

English and Italian. The choice is remembered in the browser (`src/utils/soiLang.js`):
components use `useT({ en: {...}, it: {...} })`; menu labels are translated in `MENU_IT`.

## Species and genus pages (`config/taxa_page.yml`)

| Panel | Where | Documentation |
|---|---|---|
| Nomenclature (names, timeline, year/publication filter, By name / By date) | `src/modules/otus/components/Panel/PanelNomenclature/` | its `readme.md` |
| Nomenclature references (with Copy) | `src/modules/otus/components/Panel/PanelNomenclatureReferences/` | its `readme.md` |
| Type specimens | `src/modules/otus/components/Panel/PanelTypeSpecimen/` | its `readme.md` |
| Distribution map | `panels/PanelMapV2/` | its `readme.md` |
| Identification keys | `panels/PanelKeys/` | its `readme.md` |
| Name: gender, form and etymology | `panels/PanelEtymology/` | its `readme.md` |
| GBIF | `panels/PanelGbif*`, `panels/_gbifShared/` | their `readme.md` |
| Catalogue of Life | `panels/PanelCatalogueOfLife/` | its `readme.md` |
| Biological associations tab | `panels/PanelBiologicalAssociations*` | their `readme.md` |

**Invalid names have their own page**: search results and links open the invalid name's OTU
instead of jumping to the valid one (`AutocompleteOtu.global.vue`, `views/Index.vue`). The header
(`TaxaInfo.vue`) shows a valid / invalid / unavailable pill and a "Valid name" note linking the
valid species; Nomenclature and Type specimens then show only that name.

## Pages (`pages/`)

Home, Genera (`taxa/`), Atlas, Interactions, Keys, Bibliography, Data, Names and References
added, News, About, Help wanted, and **Releases** (`releases.vue`).

## Releases (versioned data on Zenodo)

Data releases are made in a separate repository, **SyrphidaeOfItaly/soi-releases**: each one is
a frozen snapshot (names, references, biological associations, occurrence archive) with a DOI on
Zenodo. See that repository's `README.md`. Its `releases.json` is read once per visit
(`src/utils/soiReleases.js`, where its address is) by the **Releases page** and by the
**version badge** next to the logo (`src/components/Layout/ReleaseBadge.vue`, e.g. "v2026.1",
linking to the Releases page; hidden until the first release exists).

## Reusable bits

- `src/components/Copy/CopyRefButton.vue`: copy a reference as plain text (`readme.md` there).
- `panels/_shared/`: helpers shared by several panels (`readme.md` there).
