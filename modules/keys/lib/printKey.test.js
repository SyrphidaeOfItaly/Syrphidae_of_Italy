// node modules/keys/lib/printKey.test.js
import assert from 'node:assert/strict'
import { keyCitation, cssString, pageCss } from './printKey.js'

assert.equal(
  keyCitation({ authors: 'Sommaggio D, Dal Pos D (2026).', site: 'https://syrphidaeitaly.com', title: '<i>Dasysyrphus</i>', url: 'https://syrphidaeitaly.com/#/key/1', date: '2026-10-19' }),
  'Sommaggio D, Dal Pos D (2026). Syrphidae of Italy (SoI). Available at https://syrphidaeitaly.com (accessed 2026-10-19). Key used: Dasysyrphus (https://syrphidaeitaly.com/#/key/1).'
)
assert.equal(
  keyCitation({ authors: 'Sommaggio D, Dal Pos D (2026).', paper: 'Sommaggio D, Dal Pos D (2027). Syrphidae of Italy. Journal 1: 1-20. https://doi.org/10.x/y', site: 'https://syrphidaeitaly.com', title: 'Dasysyrphus', url: 'https://syrphidaeitaly.com/#/key/1', date: '2027-01-02', lang: 'it' }),
  'Sommaggio D, Dal Pos D (2027). Syrphidae of Italy. Journal 1: 1-20. https://doi.org/10.x/y. Database: Sommaggio D, Dal Pos D (2026). Syrphidae of Italy (SoI). Disponibile su https://syrphidaeitaly.com (consultato il 2027-01-02). Chiave usata: Dasysyrphus (https://syrphidaeitaly.com/#/key/1).'
)
assert.equal(cssString('a "b" \\ c'), '"a \\"b\\" \\\\ c"')
assert.ok(pageCss({ footerLeft: 'Key', footerRight: 'p.' }).includes('counter(pages)'))
console.log('printKey: all tests passed')
