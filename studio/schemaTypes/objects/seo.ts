import {defineField, defineType} from 'sanity'

export const seo = defineType({
  name: 'seo',
  title: 'SEO',
  type: 'object',
  options: {collapsible: true, collapsed: true},
  fields: [
    defineField({
      name: 'title',
      title: 'SEO title',
      type: 'string',
      description: 'Optional. Falls back to the article title. Aim for under 60 characters.',
      validation: (rule) => rule.max(70).warning('Search engines usually cut titles after ~60 characters.'),
    }),
    defineField({
      name: 'description',
      title: 'SEO description',
      type: 'text',
      rows: 2,
      description: 'Optional. Falls back to the summary. Aim for 120–160 characters.',
      validation: (rule) => rule.max(170).warning('Search engines usually cut descriptions after ~160 characters.'),
    }),
    defineField({
      name: 'canonicalUrl',
      title: 'Canonical URL',
      type: 'url',
      description: 'Optional. Leave empty to use this article’s own statwise.in address.',
    }),
    defineField({
      name: 'noindex',
      title: 'Hide from search engines',
      type: 'boolean',
      initialValue: false,
    }),
  ],
})
