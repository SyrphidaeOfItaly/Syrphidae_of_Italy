# PanelNomenclatureReferences (`panel:nomenclature-references`)

Overview tab. The references cited in the nomenclature of the taxon, from the OTU store
(`catalog.sources`), first few then "Show all".

Each row (`PanelReferenceRow.vue`) shows the full reference, with every URL and DOI made a link
(done in the store), and a **Copy** button (`@/components/Copy/CopyRefButton.vue`) that copies the
reference as plain text, without "[in Latin]" and "Available at".
