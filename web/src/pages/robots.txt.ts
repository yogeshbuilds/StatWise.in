import type {APIRoute} from 'astro'
import {SITE} from '../config/site'

export const GET: APIRoute = () =>
  new Response(
    `User-agent: *
Allow: /

Sitemap: ${new URL('/sitemap.xml', SITE.url).href}
`,
    {headers: {'Content-Type': 'text/plain; charset=utf-8'}},
  )
