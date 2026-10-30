import {toHTML, escapeHTML, uriLooksSafe} from '@portabletext/to-html'
import {imageDimensions, imageSrcSet, imageUrl, type SanityImage} from './sanity'

const SITE_HOST = 'statwise.in'

// Renders the article body (text + images only) to static HTML at build time.
export function renderBody(blocks: any[] = []) {
  return toHTML(blocks, {
    components: {
      types: {
        figure: ({value}: {value: SanityImage}) => figureHTML(value, {widths: [480, 760, 1040, 1400]}),
      },
      marks: {
        link: ({children, value}) => {
          const href: string = value?.href || ''
          if (!uriLooksSafe(href)) return children
          const external = /^https?:\/\//.test(href) && !href.includes(SITE_HOST)
          const attrs = external ? ' rel="noopener" target="_blank"' : ''
          return `<a href="${escapeHTML(href)}"${attrs}>${children}</a>`
        },
      },
    },
    onMissingComponent: false,
  })
}

export function figureHTML(
  image: SanityImage,
  {widths, sizes = '(min-width: 760px) 720px, 100vw', eager = false}: {widths: number[]; sizes?: string; eager?: boolean},
) {
  if (!image?.asset) return ''
  const dims = imageDimensions(image)
  const width = Math.min(dims?.width ?? 1200, 1400)
  const height = dims ? Math.round((width * dims.height) / dims.width) : undefined
  const caption = [image.caption && escapeHTML(image.caption), image.credit && `<span class="credit">${escapeHTML(image.credit)}</span>`]
    .filter(Boolean)
    .join(' ')
  return `<figure class="figure">
    <img src="${imageUrl(image, Math.min(width, 1040))}" srcset="${imageSrcSet(image, widths)}" sizes="${sizes}"
      alt="${escapeHTML(image.alt || '')}" width="${width}"${height ? ` height="${height}"` : ''}
      loading="${eager ? 'eager' : 'lazy'}" decoding="async"${eager ? ' fetchpriority="high"' : ''} />
    ${caption ? `<figcaption>${caption}</figcaption>` : ''}
  </figure>`
}
