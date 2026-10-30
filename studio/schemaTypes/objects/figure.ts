import {defineField, defineType} from 'sanity'
import {ImageIcon} from '@sanity/icons/Image'

// An image with required alt text and an optional caption/credit.
// Charts, maps and infographics are uploaded as figures. There is no chart block.
export const figure = defineType({
  name: 'figure',
  title: 'Image',
  type: 'image',
  icon: ImageIcon,
  options: {hotspot: true},
  fields: [
    defineField({
      name: 'alt',
      title: 'Alt text',
      type: 'string',
      description:
        'Describe what the image shows for people who cannot see it. For a chart, state the main takeaway (e.g. "Bar chart: Kerala has the highest literacy rate at 94%").',
      validation: (rule) => [
        rule.required().min(5),
        rule.max(250).warning('Long alt text is hard to listen to. Try to keep it under 250 characters.'),
      ],
    }),
    defineField({
      name: 'caption',
      title: 'Caption',
      type: 'string',
      description: 'Optional. Shown under the image.',
    }),
    defineField({
      name: 'credit',
      title: 'Source / credit',
      type: 'string',
      description: 'Optional. e.g. "Source: MoSPI, PLFS 2023-24. Chart: StatWise.in"',
    }),
  ],
  preview: {
    select: {media: 'asset', title: 'caption', subtitle: 'alt'},
    prepare: ({media, title, subtitle}) => ({media, title: title || subtitle || 'Image'}),
  },
})
