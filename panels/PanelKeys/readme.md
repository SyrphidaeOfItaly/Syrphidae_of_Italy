# PanelKeys (`panel:keys`)

Overview tab. The identification keys that concern the taxon, in two groups:

- **Keys to this group**: keys starting from this taxon (e.g. the key to the species of a genus);
- **Keys that lead here**: keys in which this taxon is one of the outcomes.

Each key is **one row**: an icon and label for its kind (dichotomous, interactive, image key), its
name, and **language pills** when the same key exists in several languages: "Eupeodes (EN)" and
"Eupeodes (IT)" become one row *Eupeodes* with EN and IT pills (the page language first).

Dichotomous keys open in the SoI key viewer (`/key/:id`), interactive keys in
`/interactive-key/:id`, image matrices in the image-matrix viewer.

## Data

`/otus/:id/inventory/keys`. TaxonWorks lists a key once for every end point that reaches the
taxon, so duplicates are removed. It also only finds keys ending at *this exact* OTU: keys ending
at another OTU of the same name ("coordinate" OTU) would be missed, so the panel also looks up the
other OTUs of the taxon name (`/otus?taxon_name_id[]=`) and merges their keys.

A copy of this file lives in `src/modules/otus/components/Panel/PanelKeys/`: keep them identical.
