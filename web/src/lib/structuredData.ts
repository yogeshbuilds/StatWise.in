import {SITE} from '../config/site'
import type {Article} from './queries'
import {imageUrl} from './sanity'
import {articleUrl, categoryUrl} from './format'

// JSON-LD that matches what is visible on the page. Articles carry no personal byline,
// so the publication itself is credited as author.
const abs = (path: string) => new URL(path, SITE.url).href

export const organization = {
  '@type': 'Organization',
  '@id': abs('/#organization'),
  name: SITE.name,
  url: SITE.url,
  logo: {'@type': 'ImageObject', url: abs('/logo.png'), width: 600, height: 120},
}

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      organization,
      {
        '@type': 'WebSite',
        '@id': abs('/#website'),
        url: SITE.url,
        name: SITE.name,
        description: SITE.description,
        inLanguage: 'en-IN',
        publisher: {'@id': organization['@id']},
      },
    ],
  }
}

export function articleSchema(article: Article, canonical: string) {
  const crumbs = [
    {name: 'Home', url: abs('/')},
    ...(article.category ? [{name: article.category.name, url: abs(categoryUrl(article.category.slug))}] : []),
    {name: article.title, url: abs(articleUrl(article.slug))},
  ]
  const images = article.featuredImage?.asset
    ? [
        imageUrl(article.featuredImage, 1200, 675),
        imageUrl(article.featuredImage, 1200, 900),
        imageUrl(article.featuredImage, 1200, 1200),
      ]
    : undefined

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'NewsArticle',
        '@id': `${canonical}#article`,
        mainEntityOfPage: canonical,
        headline: article.title.slice(0, 110),
        description: article.seo?.description || article.summary,
        ...(images && {image: images}),
        datePublished: article.publishedAt,
        dateModified: article.updatedAt || article.publishedAt,
        articleSection: article.category?.name,
        ...(article.tags?.length && {keywords: article.tags.join(', ')}),
        inLanguage: 'en-IN',
        isAccessibleForFree: true,
        author: {'@id': organization['@id']},
        publisher: {'@id': organization['@id']},
        ...(article.sources?.length && {
          citation: article.sources.filter((s) => s.title).map((s) => ({
            '@type': 'CreativeWork',
            name: s.title,
            ...(s.publisher && {publisher: s.publisher}),
            ...(s.url && {url: s.url}),
          })),
        }),
      },
      organization,
      {
        '@type': 'BreadcrumbList',
        itemListElement: crumbs.map((c, i) => ({'@type': 'ListItem', position: i + 1, name: c.name, item: c.url})),
      },
    ],
  }
}

// Safe for embedding inside <script type="application/ld+json">.
export const jsonLd = (data: unknown) => JSON.stringify(data).replace(/</g, '\\u003c')
