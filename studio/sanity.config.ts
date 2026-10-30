import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'
import {structure, defaultDocumentNode} from './structure'

export default defineConfig({
  name: 'default',
  title: 'StatWise',

  projectId: 'mpsmehrh',
  dataset: 'production',

  plugins: [structureTool({structure, defaultDocumentNode}), visionTool()],

  schema: {
    types: schemaTypes,
    // Only articles and categories can be created from the "+" menu.
    templates: (templates) => templates.filter((t) => ['article', 'category'].includes(t.schemaType)),
  },
})
