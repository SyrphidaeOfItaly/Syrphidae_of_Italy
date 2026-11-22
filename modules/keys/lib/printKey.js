// Printing a key (Print / PDF button): the citation, the @page rules with running
// footer and page numbers, and waiting for the figures. Pure helpers + two DOM ones.

// The citation printed with the key. Keys are meant to be USED; what we ask people to CITE is
// the database (and, once published, the paper describing it — `project_paper` in config/project.yml).
// The key itself is named only as "Key used", with its URL, so citations are not split per key.
//   no paper:  "Sommaggio D, Dal Pos D (2026). Syrphidae of Italy (SoI). Available at https://syrphidaeitaly.com (accessed …). Key used: <title> (<url>)."
//   paper set: "<paper> Database: Sommaggio D, Dal Pos D (2026). Syrphidae of Italy (SoI). Available at …. Key used: …"
export function keyCitation({ authors = '', project = 'Syrphidae of Italy (SoI)', paper = '', site = '', title = '', url = '', date = '', lang = 'en' }) {
  const clean = (x) => String(x || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
  const who = clean(authors).replace(/\.$/, '')
  const p = clean(paper)
  const db = `${who}. ${clean(project)}.${site ? ` Available at ${site}` : ''}${date ? ` (accessed ${date})` : ''}.`
  const t = clean(title)
  const used = t || url ? ` ${lang === 'it' ? 'Chiave usata' : 'Key used'}: ${t}${url ? ` (${url})` : ''}.` : ''
  const lead = p ? `${p.replace(/\.?$/, '.')} ${lang === 'it' ? 'Database' : 'Database'}: ` : ''
  return `${lead}${db}${used}`.replace(/\s+\./g, '.').replace(/\.\.+/g, '.').replace(/\s{2,}/g, ' ')
}

// a CSS string literal for `content:` in a margin box
export const cssString = (s) => `"${String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ')}"`

// @page with running footer (short title + site, page x of y) and the version top right — margin boxes are honoured by
// Chromium browsers (Chrome, Edge); elsewhere the citation block printed in the page still shows
export function pageCss({ footerLeft = '', footerRight = '', headerRight = '' } = {}) {
  return `@media print {
  @page {
    size: A4;
    margin: 16mm 15mm 18mm 15mm;
    @top-right { content: ${cssString(headerRight)}; font: 8pt Georgia, serif; color: #777; }
    @bottom-left { content: ${cssString(footerLeft)}; font: 8pt Georgia, serif; color: #555; }
    @bottom-right { content: ${cssString(footerRight)} " " counter(page) " / " counter(pages); font: 8pt Georgia, serif; color: #555; }
  }
  /* the front page has no running header / footer */
  @page :first {
    @top-right { content: none; }
    @bottom-left { content: none; }
    @bottom-right { content: none; }
  }
}`
}

// wait (max `ms`) until every image inside `root` has loaded or failed
export function imagesReady(root, ms = 8000) {
  const imgs = [...(root?.querySelectorAll('img') || [])].filter((i) => !i.complete)
  if (!imgs.length) return Promise.resolve()
  return Promise.race([
    Promise.all(imgs.map((i) => new Promise((res) => { i.addEventListener('load', res, { once: true }); i.addEventListener('error', res, { once: true }) }))),
    new Promise((res) => setTimeout(res, ms))
  ])
}
