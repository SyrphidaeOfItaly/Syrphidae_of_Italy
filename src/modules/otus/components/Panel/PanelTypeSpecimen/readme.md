# PanelTypeSpecimen (`panel:type-specimen`)

Overview tab. The type material of the taxon and of its synonyms
(`/otus/:id/inventory/type_material.json`).

- Grouped by the **name each type was designated for**, valid name first; invalid names have an
  "invalid" pill.
- One line per type: **status** (holotype, syntypes…; primary types in terracotta), sex, then
  catalogue number, repository and notes, read from the TaxonWorks label by `parseTypeLabel.js`.
- On an invalid name's page, only that name's types are shown.
- When TaxonWorks sends no name for a type (it happens), the name is taken from the nomenclature
  entries of the page; failing that, "Name not given".
