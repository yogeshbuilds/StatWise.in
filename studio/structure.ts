import type {DefaultDocumentNodeResolver, StructureResolver} from 'sanity/structure'
import {DocumentTextIcon} from '@sanity/icons/DocumentText'
import {EditIcon} from '@sanity/icons/Edit'
import {TagIcon} from '@sanity/icons/Tag'
import {CheckmarkCircleIcon} from '@sanity/icons/CheckmarkCircle'
import {ArticlePreview} from './components/ArticlePreview'

export const structure: StructureResolver = (S) =>
  S.list()
    .title('StatWise')
    .items([
      S.listItem()
        .title('All articles')
        .icon(DocumentTextIcon)
        .child(
          S.documentTypeList('article')
            .title('All articles')
            .defaultOrdering([{field: 'publishedAt', direction: 'desc'}]),
        ),
      S.listItem()
        .title('Drafts (not live)')
        .icon(EditIcon)
        .child(
          S.documentList()
            .title('Drafts and unpublished changes')
            .schemaType('article')
            .filter('_type == "article" && _id in path("drafts.**")')
            .apiVersion('2025-02-19'),
        ),
      S.listItem()
        .title('Published')
        .icon(CheckmarkCircleIcon)
        .child(
          S.documentList()
            .title('Published articles')
            .schemaType('article')
            .filter('_type == "article" && !(_id in path("drafts.**"))')
            .apiVersion('2025-02-19')
            .defaultOrdering([{field: 'publishedAt', direction: 'desc'}]),
        ),
      S.divider(),
      S.listItem()
        .title('Categories')
        .icon(TagIcon)
        .child(
          S.documentTypeList('category')
            .title('Categories')
            .defaultOrdering([{field: 'order', direction: 'asc'}]),
        ),
    ])

export const defaultDocumentNode: DefaultDocumentNodeResolver = (S, {schemaType}) => {
  if (schemaType === 'article') {
    return S.document().views([
      S.view.form(),
      S.view.component(ArticlePreview).title('Preview'),
    ])
  }
  return S.document()
}
