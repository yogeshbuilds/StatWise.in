import {defineArrayMember, defineField, defineType} from 'sanity'
import {DocumentTextIcon} from '@sanity/icons/DocumentText'

const API_VERSION = '2025-02-19'

export const article = defineType({
  name: 'article',
  title: 'Article',
  type: 'document',
  icon: DocumentTextIcon,
  groups: [
    {name: 'content', title: 'Content', default: true},
    {name: 'sources', title: 'Sources & method'},
    {name: 'meta', title: 'Dates, tags & SEO'},
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'content',
      validation: (rule) => rule.required().min(10).max(120),
    }),
    defineField({
      name: 'slug',
      title: 'URL slug',
      type: 'slug',
      group: 'content',
      description: 'The article address: statwise.in/stories/<slug>/. Avoid changing it after publishing.',
      options: {source: 'title', maxLength: 80},
      validation: (rule) => [
        rule.required(),
        rule
          .custom((value) => {
            const current = value?.current
            if (!current) return true
            return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(current)
              ? true
              : 'Use only lowercase letters, numbers and single hyphens.'
          }),
        // Warn when editing the slug of an article that is already live.
        rule
          .custom(async (value, context) => {
            const id = context.document?._id?.replace(/^drafts\./, '')
            if (!id || !value?.current) return true
            const published = await context
              .getClient({apiVersion: API_VERSION})
              .fetch<string | null>('*[_id == $id][0].slug.current', {id})
            if (published && published !== value.current) {
              return `This article is live at /stories/${published}/. Changing the slug changes its URL — add the old slug under "Old URLs" so it redirects.`
            }
            return true
          })
          .warning(),
      ],
    }),
    defineField({
      name: 'summary',
      title: 'Summary',
      type: 'text',
      rows: 3,
      group: 'content',
      description: 'One or two sentences. Shown on cards and used as the search description.',
      validation: (rule) => [
        rule.required().min(30),
        rule.max(220).warning('Keep summaries short — under ~200 characters.'),
      ],
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'reference',
      to: [{type: 'category'}],
      group: 'content',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'featuredImage',
      title: 'Featured image',
      type: 'figure',
      group: 'content',
      description: 'Shown on cards and social shares. Use at least 1200 px wide.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'body',
      group: 'content',
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: 'sources',
      title: 'Data sources',
      type: 'array',
      group: 'sources',
      of: [defineArrayMember({type: 'sourceLink'})],
      description: 'Link to the original datasets and reports used in this story.',
      validation: (rule) =>
        rule.min(1).warning('Data-driven stories should cite at least one source.'),
    }),
    defineField({
      name: 'methodology',
      title: 'Methodology note',
      type: 'text',
      rows: 5,
      group: 'sources',
      description:
        'Optional but recommended. Explain calculations, definitions, time periods and limitations.',
    }),
    defineField({
      name: 'corrections',
      title: 'Corrections',
      type: 'array',
      group: 'sources',
      description: 'If you fix a factual error after publishing, add a note here. It is shown at the end of the story.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'correction',
          fields: [
            defineField({name: 'date', title: 'Date', type: 'date', validation: (rule) => rule.required()}),
            defineField({
              name: 'note',
              title: 'What changed',
              type: 'text',
              rows: 2,
              validation: (rule) => rule.required(),
            }),
          ],
          preview: {select: {title: 'note', subtitle: 'date'}},
        }),
      ],
    }),
    defineField({
      name: 'publishedAt',
      title: 'Publication date',
      type: 'datetime',
      group: 'meta',
      description: 'Set automatically for new articles. Controls ordering on the site.',
      initialValue: () => new Date().toISOString(),
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'updatedAt',
      title: 'Last meaningful update',
      type: 'datetime',
      group: 'meta',
      description:
        'Set this when you make a meaningful change (new data, corrected figure). Leave empty for typo fixes.',
    }),
    defineField({
      name: 'featured',
      title: 'Feature on homepage',
      type: 'boolean',
      group: 'meta',
      description: 'The newest featured article appears as the homepage lead story.',
      initialValue: false,
    }),
    defineField({
      name: 'tags',
      title: 'Tags',
      type: 'array',
      group: 'meta',
      of: [defineArrayMember({type: 'string'})],
      options: {layout: 'tags'},
      description: 'Optional, use sparingly. Tags do not get their own pages.',
    }),
    defineField({
      name: 'oldSlugs',
      title: 'Old URLs (redirects)',
      type: 'array',
      group: 'meta',
      of: [defineArrayMember({type: 'string'})],
      options: {layout: 'tags'},
      description: 'If you changed the slug of a published article, add the old slug here so it redirects.',
    }),
    defineField({
      name: 'seo',
      title: 'SEO',
      type: 'seo',
      group: 'meta',
    }),
  ],
  orderings: [
    {title: 'Newest first', name: 'publishedDesc', by: [{field: 'publishedAt', direction: 'desc'}]},
    {title: 'Title A–Z', name: 'titleAsc', by: [{field: 'title', direction: 'asc'}]},
  ],
  preview: {
    select: {title: 'title', category: 'category.name', date: 'publishedAt', media: 'featuredImage'},
    prepare: ({title, category, date, media}) => ({
      title,
      subtitle: [category, date && new Date(date).toLocaleDateString('en-IN')].filter(Boolean).join(' · '),
      media,
    }),
  },
})
