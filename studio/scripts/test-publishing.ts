// T034/T035: end-to-end publishing test against the LIVE site.
// Publishes a temporary test article (hidden from search), then updates, changes its slug,
// saves a draft, unpublishes and deletes it — checking the live site after each step.
// Run: SITE=https://statwise.personalyogesh352.workers.dev npx sanity exec scripts/test-publishing.ts --with-user-token
import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-02-19'})
const SITE = process.env.SITE || 'https://statwise.in'
const ID = 'pipeline-test-article'
const SLUG = 'zz-pipeline-test'
const SLUG2 = 'zz-pipeline-test-renamed'
const TIMEOUT = 6 * 60_000

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const get = async (path: string) => {
  const res = await fetch(`${SITE}${path}${path.includes('?') ? '&' : '?'}t=${Date.now()}`, {redirect: 'manual'})
  return {status: res.status, location: res.headers.get('location'), text: res.status === 200 ? await res.text() : ''}
}
async function waitFor(label: string, check: () => Promise<boolean>) {
  const start = Date.now()
  while (Date.now() - start < TIMEOUT) {
    if (await check()) {
      const secs = Math.round((Date.now() - start) / 1000)
      console.log(`✅ ${label} — live after ${secs}s`)
      return secs
    }
    await sleep(10_000)
  }
  console.log(`❌ ${label} — not seen within ${TIMEOUT / 60_000} min`)
  return null
}

const asset = await client.fetch<any>('*[_type == "article" && defined(featuredImage.asset)][0].featuredImage.asset')
const base = {
  _id: ID,
  _type: 'article',
  title: 'Pipeline test article (temporary)',
  slug: {_type: 'slug', current: SLUG},
  summary: 'Temporary article used to test automatic publishing. It will be deleted in a few minutes.',
  category: {_type: 'reference', _ref: 'category-economy'},
  featuredImage: {_type: 'figure', asset, alt: 'Test image'},
  body: [{_type: 'block', _key: 'b1', style: 'normal', markDefs: [], children: [{_type: 'span', _key: 's1', text: 'Test body.', marks: []}]}],
  publishedAt: new Date().toISOString(),
  seo: {noindex: true},
}
const results: Record<string, unknown> = {}

// 1. Publish
await client.createOrReplace(base)
results.publish = await waitFor('Publish: article page live', async () => (await get(`/stories/${SLUG}/`)).status === 200)
results.categoryPage = (await get('/category/economy/')).status
results.inListing = (await get('/stories/')).text.includes(SLUG)
results.inSitemapWhileNoindex = (await get('/sitemap.xml')).text.includes(SLUG)

// 2. Update title
await client.patch(ID).set({title: 'Pipeline test article UPDATED'}).commit()
results.update = await waitFor('Update: new title live', async () => (await get(`/stories/${SLUG}/`)).text.includes('Pipeline test article UPDATED'))

// 3. Change slug with redirect from the old one
await client.patch(ID).set({slug: {_type: 'slug', current: SLUG2}, oldSlugs: [SLUG]}).commit()
results.slugChange = await waitFor('Slug change: new URL live', async () => (await get(`/stories/${SLUG2}/`)).status === 200)
const old = await get(`/stories/${SLUG}/`)
results.oldUrlRedirect = `${old.status} -> ${old.location}`

// 4. Draft save must NOT change the live site
await client.createOrReplace({...base, _id: `drafts.${ID}`, slug: {_type: 'slug', current: SLUG2}, title: 'DRAFT ONLY title'})
await sleep(150_000)
results.draftLeaked = (await get(`/stories/${SLUG2}/`)).text.includes('DRAFT ONLY title')

// 5. Unpublish (Studio: delete published version, keep the draft)
await client.delete(ID)
results.unpublish = await waitFor('Unpublish: page returns 404', async () => (await get(`/stories/${SLUG2}/`)).status === 404)
results.goneFromListing = !(await get('/stories/')).text.includes(SLUG2)
results.economyPageGone = (await get('/category/economy/')).status
results.goneFromSitemap = !(await get('/sitemap.xml')).text.includes(SLUG2)

// 6. Delete the remaining draft; the shared image must survive
await client.delete(`drafts.${ID}`)
results.sharedImageKept = Boolean(await client.getDocument(asset._ref))

console.log(JSON.stringify(results, null, 2))
