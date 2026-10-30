import {defineField, defineType} from 'sanity'
import {LinkIcon} from '@sanity/icons/Link'

export const sourceLink = defineType({
  name: 'sourceLink',
  title: 'Source',
  type: 'object',
  icon: LinkIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Dataset / report name',
      type: 'string',
      description: 'e.g. "Periodic Labour Force Survey (PLFS) Annual Report 2023-24"',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'publisher',
      title: 'Publisher',
      type: 'string',
      description: 'e.g. "MoSPI", "RBI", "Census of India"',
    }),
    defineField({
      name: 'url',
      title: 'Link',
      type: 'url',
      validation: (rule) => rule.uri({scheme: ['http', 'https']}),
    }),
  ],
  preview: {
    select: {title: 'title', subtitle: 'publisher'},
  },
})
