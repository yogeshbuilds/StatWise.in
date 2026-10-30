import {createClient, type QueryParams} from '@sanity/client'
import {createImageUrlBuilder} from '@sanity/image-url'

// Read-only client used at build time only. Readers never call Sanity directly.
// The project ID and dataset are public identifiers, not secrets.
const projectId = import.meta.env.PUBLIC_SANITY_PROJECT_ID || 'mpsmehrh'
const dataset = import.meta.env.PUBLIC_SANITY_DATASET || 'production'
const apiVersion = import.meta.env.PUBLIC_SANITY_API_VERSION || '2025-02-19'

// Local-only draft preview: `SANITY_PREVIEW_TOKEN=... npm run build`.
// It must never be set in Cloudflare; the production build reads published content only.
const previewToken = process.env.SANITY_PREVIEW_TOKEN
if (previewToken && (process.env.CI || process.env.WORKERS_CI)) {
  throw new Error('SANITY_PREVIEW_TOKEN must not be set in CI/production builds.')
}

export const isDraftPreview = Boolean(previewToken)

export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
  perspective: previewToken ? 'drafts' : 'published',
  token: previewToken,
})

export const fetchQuery = <T>(query: string, params: QueryParams = {}) => client.fetch<T>(query, params)

const builder = createImageUrlBuilder({projectId, dataset})

export type SanityImage = {
  asset?: {_ref?: string; _id?: string}
  alt?: string
  caption?: string
  credit?: string
  hotspot?: unknown
  crop?: unknown
}

// Original pixel size from the asset id: image-<hash>-<w>x<h>-<ext>
export function imageDimensions(image?: SanityImage): {width: number; height: number} | null {
  const ref = image?.asset?._ref || image?.asset?._id
  const match = ref?.match(/-(\d+)x(\d+)-[a-z]+$/)
  return match ? {width: Number(match[1]), height: Number(match[2])} : null
}

export function imageUrl(image: SanityImage, width: number, height?: number) {
  let b = builder.image(image).width(width).auto('format').fit(height ? 'crop' : 'max').quality(80)
  if (height) b = b.height(height)
  return b.url()
}

// srcset for responsive images, never upscaling past the original width.
export function imageSrcSet(image: SanityImage, widths: number[], aspect?: number) {
  const max = imageDimensions(image)?.width ?? Infinity
  return widths
    .filter((w) => w <= max)
    .map((w) => `${imageUrl(image, w, aspect ? Math.round(w / aspect) : undefined)} ${w}w`)
    .join(', ')
}
