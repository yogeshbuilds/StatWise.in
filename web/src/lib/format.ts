const dateFormat = new Intl.DateTimeFormat('en-IN', {day: 'numeric', month: 'long', year: 'numeric'})

export const formatDate = (iso: string) => dateFormat.format(new Date(iso))

export const articleUrl = (slug: string) => `/stories/${slug}/`
export const categoryUrl = (slug: string) => `/category/${slug}/`

// Rough reading time for portable text bodies.
export function readingMinutes(body: any[] = []) {
  const words = body
    .filter((b) => b._type === 'block')
    .flatMap((b) => b.children?.map((c: any) => c.text) ?? [])
    .join(' ')
    .split(/\s+/)
    .filter(Boolean).length
  return Math.max(1, Math.round(words / 220))
}
