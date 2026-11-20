# PanelNomenclature (`panel:nomenclature`)

Overview tab. The nomenclatural history of the taxon, from the TaxonWorks catalogue
(`/taxon_names/:id/inventory/catalog`, loaded by the OTU store).

## What it shows

- **Summary line**: who described it and when, how many synonyms (and their year span), and
  since when it is in its current genus.
- **Names**: the valid name and every synonym, as links; clicking one shows only that name's
  entries. "+N more names" opens the full list.
- **Timeline (ruler)** (`NomenRuler.vue`): one stacked bar per year, coloured by kind of act
  (original description, synonymy, combination/placement, homonymy/unavailable, cited).
  Hover for a card, arrow keys to move, Enter or click to **filter by that year**.
- **Year and publication filter**: after picking a year, the publications of that year appear as
  chips; pick one to see only its entries. Any reference card also has
  **"Only this publication"**, which filters by that work across all years
  (`provide('soiPickSource')`).
- **Two views**, remembered in the browser (`localStorage` key `soi-nom-view`):
  - **By name** (`SynonymyList.vue`): one block per original name (valid first, then by year),
    with pills for "original description" and "invalid", and a coloured dash in front of each
    later use (green new combination, amber synonym, terracotta homonym/unavailable; hover for
    the label). First 3 names, then "Show the other N names".
  - **By date** (`ChronoList.vue`): grouped by decade; entries of the same year, work and act are
    folded into one line ("9 names made synonyms"); the act is shown as a pill.
- **Reference cards**: clicking a citation opens the full reference with a **Copy** button
  (`@/components/Copy/CopyRefButton.vue`).

## Invalid names

An invalid name opens its own page (see `TaxaInfo.vue` and `AutocompleteOtu`). There the panel
shows only that name's own history, with a note and a link to the full history of the valid
name (`setOwnHistory` / `showingOwn` in the OTU store).

## Files

| File | What it does |
|---|---|
| `PanelNomenclature.vue` | header, summary, names, filters, view switch |
| `NomenRuler.vue` | the timeline |
| `SynonymyList.vue` | the "By name" view, reference links and cards |
| `ChronoList.vue` | the "By date" view |
| `nomenEntry.js` | reads one catalogue entry: name, reference, topics, kind of act |
| `PanelCitationRow.vue` | old ledger row, no longer used |

Texts in English and Italian through `useT` (`@/utils/soiLang.js`).
