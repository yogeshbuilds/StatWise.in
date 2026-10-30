// Writes dist/_redirects after the build so old article URLs (from the "Old URLs" field
// in Sanity) send readers and search engines to the current URL with a 301.
import {createClient} from '@sanity/client'
import {writeFile} from 'node:fs/promises'

export default function sanityRedirects() {
  return {
    name: 'statwise-redirects',
    hooks: {
      'astro:build:done': async ({dir, logger}) => {
        const client = createClient({
          projectId: process.env.PUBLIC_SANITY_PROJECT_ID || 'mpsmehrh',
          dataset: process.env.PUBLIC_SANITY_DATASET || 'production',
          apiVersion: '2025-02-19',
          useCdn: false,
          perspective: 'published',
        })
        const rows = await client.fetch(
          `*[_type == "article" && defined(slug.current) && count(oldSlugs) > 0]{"to": slug.current, "from": oldSlugs}`,
        )
        const lines = rows.flatMap(({to, from}) =>
          from
            .filter((old) => old && old !== to && /^[a-z0-9-]+$/.test(old))
            .map((old) => `/stories/${old}/ /stories/${to}/ 301\n/stories/${old} /stories/${to}/ 301`),
        )
        await writeFile(new URL('_redirects', dir), `# Generated at build time from Sanity "Old URLs".\n${lines.join('\n')}\n`)
        logger.info(`_redirects: ${lines.length} old article URL(s)`)
      },
    },
  }
}
