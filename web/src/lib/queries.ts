import {fetchQuery, type SanityImage} from './sanity'

export type Category = {
  _id: string
  name: string
  slug: string
  description?: string
  order?: number
  count?: number
}

export type ArticleCardData = {
  _id: string
  title: string
  slug: string
  summary: string
  publishedAt: string
  updatedAt?: string
  featured?: boolean
  featuredImage?: SanityImage
  category?: {name: string; slug: string}
}

export type Article = ArticleCardData & {
  body: any[]
  sources?: {_key: string; title: string; publisher?: string; url?: string}[]
  methodology?: string
  corrections?: {_key: string; date: string; note: string}[]
  tags?: string[]
  oldSlugs?: string[]
  seo?: {title?: string; description?: string; canonicalUrl?: string; noindex?: boolean}
}

// Only complete articles are eligible for the public site.
const ELIGIBLE = `_type == "article" && defined(slug.current) && defined(publishedAt) && defined(category->slug.current)`

const CARD = `
  _id, title, "slug": slug.current, summary, publishedAt, updatedAt, featured,
  featuredImage,
  "category": category->{name, "slug": slug.current}
`

// Each query runs once per build and is shared by every page that needs it.
const memo = new Map<string, Promise<unknown>>()
const once = <T>(key: string, run: () => Promise<T>) => {
  if (!memo.has(key)) memo.set(key, run())
  return memo.get(key) as Promise<T>
}

export function getArticlesFull() {
  return once('articles', () => fetchQuery<Article[]>(
    `*[${ELIGIBLE}] | order(publishedAt desc) {
      ${CARD}, body, sources, methodology, corrections, tags, oldSlugs, seo
    }`,
  ))
}

// Categories that have at least one eligible article (no empty archive pages).
export function getActiveCategories() {
  return once('categories', () => fetchQuery<Category[]>(
    `*[_type == "category" && defined(slug.current)] {
      _id, name, "slug": slug.current, description, order,
      "count": count(*[${ELIGIBLE} && references(^._id)])
    }[count > 0] | order(order asc, name asc)`,
  ))
}
