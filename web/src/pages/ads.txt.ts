import type {APIRoute} from 'astro'
import {ADS} from '../config/site'

// Lists Google as the only seller allowed to sell ads on this site. Empty until ADS.client is set.
export const GET: APIRoute = () => {
  const pub = ADS.client.replace(/^ca-/, '')
  const body = pub
    ? `google.com, ${pub}, DIRECT, f08c47fec0942fa0\n`
    : '# No advertising on this site yet.\n'
  return new Response(body, {headers: {'Content-Type': 'text/plain; charset=utf-8'}})
}
