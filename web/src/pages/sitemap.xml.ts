import type {APIRoute} from 'astro'
import {SITE} from '../config/site'
import {getActiveCategories, getArticlesFull} from '../lib/queries'
import {articleUrl, categoryUrl} from '../lib/format'

// Lists only public, indexable pages: published articles, non-empty categories and static pages.
export const GET: APIRoute = async () => {
  const [articles, categories] = await Promise.all([getArticlesFull(), getActiveCategories()])
  const indexable = articles.filter((a) => !a.seo?.noindex && !a.seo?.canonicalUrl)
  const latest = indexable[0]?.updatedAt || indexable[0]?.publishedAt

  const entries: {loc: string; lastmod?: string}[] = [
    {loc: '/', lastmod: latest},
    {loc: '/stories/', lastmod: latest},
    ...categories.map((c) => {
      const newest = indexable.find((a) => a.category?.slug === c.slug)
      return {loc: categoryUrl(c.slug), lastmod: newest?.updatedAt || newest?.publishedAt}
    }),
    ...indexable.map((a) => ({loc: articleUrl(a.slug), lastmod: a.updatedAt || a.publishedAt})),
    {loc: '/about/'},
    {loc: '/contact/'},
    {loc: '/editorial-policy/'},
    {loc: '/privacy-policy/'},
  ]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    (e) =>
      `  <url><loc>${new URL(e.loc, SITE.url).href}</loc>${e.lastmod ? `<lastmod>${e.lastmod.slice(0, 10)}</lastmod>` : ''}</url>`,
  )
  .join('\n')}
</urlset>
`
  return new Response(xml, {headers: {'Content-Type': 'application/xml; charset=utf-8'}})
}
