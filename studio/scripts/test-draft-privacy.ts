// T016: proves a draft is invisible to the public API, then cleans up.
// Run: npx sanity exec scripts/test-draft-privacy.ts --with-user-token
import {getCliClient} from 'sanity/cli'

const apiVersion = '2025-02-19'
const authed = getCliClient({apiVersion})
const {projectId, dataset} = authed.config()
const id = `drafts.privacy-test-${Date.now()}`

await authed.create({_id: id, _type: 'article', title: 'PRIVATE draft privacy test'})

const publicQuery = async (perspective: string) => {
  const q = encodeURIComponent('*[title match "PRIVATE draft privacy test"]{_id}')
  const url = `https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}?query=${q}&perspective=${perspective}`
  const res = await fetch(url) // no token = what any visitor or the public site can see
  return {status: res.status, body: await res.json()}
}

const results = {
  authedCanSeeDraft: Boolean(await authed.getDocument(id)),
  publicPublished: await publicQuery('published'),
  publicDrafts: await publicQuery('drafts'),
  publicRaw: await publicQuery('raw'),
}
await authed.delete(id)

console.log(JSON.stringify(results, null, 2))
const leaked = [results.publicPublished, results.publicDrafts, results.publicRaw].some(
  (r) => Array.isArray(r.body?.result) && r.body.result.length > 0,
)
console.log(leaked ? '❌ DRAFT LEAKED to unauthenticated requests' : '✅ Draft not visible without login')
