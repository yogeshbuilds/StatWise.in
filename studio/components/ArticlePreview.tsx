import {useEffect, useMemo, useState} from 'react'
import {PortableText, type PortableTextComponents} from '@portabletext/react'
import {createImageUrlBuilder} from '@sanity/image-url'
import {useClient} from 'sanity'

// Private preview shown inside Studio (behind Sanity login). It renders the
// document currently being edited, so drafts never need a public preview route.

type Props = {document: {displayed: Record<string, any>}}

const WIDTHS = {Desktop: 760, Mobile: 375} as const

export function ArticlePreview({document}: Props) {
  const doc = document.displayed
  const client = useClient({apiVersion: '2025-02-19'})
  const builder = useMemo(() => createImageUrlBuilder(client), [client])
  const [width, setWidth] = useState<keyof typeof WIDTHS>('Desktop')
  const [categoryName, setCategoryName] = useState<string | null>(null)

  const categoryRef = doc?.category?._ref
  useEffect(() => {
    if (!categoryRef) return setCategoryName(null)
    client
      .fetch<string | null>('*[_id in [$id, "drafts." + $id]][0].name', {id: categoryRef})
      .then(setCategoryName)
  }, [client, categoryRef])

  const imageUrl = (img: any, w: number) =>
    img?.asset ? builder.image(img).width(w).fit('max').auto('format').url() : null

  const components: PortableTextComponents = {
    types: {
      figure: ({value}) => <Figure value={value} src={imageUrl(value, 1200)} />,
    },
    marks: {
      link: ({value, children}) => (
        <a href={value?.href} target="_blank" rel="noreferrer" style={styles.link}>
          {children}
        </a>
      ),
    },
    block: {
      h2: ({children}) => <h2 style={styles.h2}>{children}</h2>,
      h3: ({children}) => <h3 style={styles.h3}>{children}</h3>,
      blockquote: ({children}) => <blockquote style={styles.quote}>{children}</blockquote>,
      normal: ({children}) => <p style={styles.p}>{children}</p>,
    },
  }

  if (!doc) return <div style={{padding: 24}}>Nothing to preview yet.</div>

  const date = doc.publishedAt ? new Date(doc.publishedAt).toLocaleDateString('en-IN', {dateStyle: 'long'}) : null
  const updated = doc.updatedAt ? new Date(doc.updatedAt).toLocaleDateString('en-IN', {dateStyle: 'long'}) : null

  return (
    <div style={styles.shell}>
      <div style={styles.toolbar}>
        {(Object.keys(WIDTHS) as (keyof typeof WIDTHS)[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setWidth(key)}
            style={{...styles.toggle, ...(width === key ? styles.toggleOn : {})}}
          >
            {key}
          </button>
        ))}
        <span style={styles.note}>Private preview — only visible inside Studio</span>
      </div>

      <article style={{...styles.page, maxWidth: WIDTHS[width]}}>
        <div style={styles.brand}>
          <span style={{color: '#e3121b'}}>StatWise</span>.in
        </div>
        {categoryName && <div style={styles.kicker}>{categoryName}</div>}
        <h1 style={styles.h1}>{doc.title || 'Untitled article'}</h1>
        {doc.summary && <p style={styles.summary}>{doc.summary}</p>}
        <div style={styles.meta}>
          {date && <span>Published {date}</span>}
          {updated && <span> · Updated {updated}</span>}
        </div>

        {doc.featuredImage && (
          <Figure value={doc.featuredImage} src={imageUrl(doc.featuredImage, 1400)} />
        )}

        {Array.isArray(doc.body) && <PortableText value={doc.body} components={components} />}

        {(doc.sources?.length || doc.methodology) && (
          <section style={styles.sources}>
            {doc.sources?.length > 0 && (
              <>
                <h2 style={styles.h3}>Sources</h2>
                <ul>
                  {doc.sources.map((s: any) => (
                    <li key={s._key}>
                      {s.url ? (
                        <a href={s.url} target="_blank" rel="noreferrer" style={styles.link}>
                          {s.title}
                        </a>
                      ) : (
                        s.title
                      )}
                      {s.publisher && <span style={{color: '#6b6b6b'}}> — {s.publisher}</span>}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {doc.methodology && (
              <>
                <h2 style={styles.h3}>Methodology</h2>
                <p style={{...styles.p, whiteSpace: 'pre-line'}}>{doc.methodology}</p>
              </>
            )}
          </section>
        )}
      </article>
    </div>
  )
}

function Figure({value, src}: {value: any; src: string | null}) {
  if (!src) return null
  return (
    <figure style={styles.figure}>
      <img src={src} alt={value?.alt || ''} style={{width: '100%', height: 'auto', display: 'block'}} />
      {!value?.alt && <div style={styles.warn}>⚠ Missing alt text</div>}
      {(value?.caption || value?.credit) && (
        <figcaption style={styles.caption}>
          {value.caption}
          {value.credit && <span style={{display: 'block', color: '#6b6b6b'}}>{value.credit}</span>}
        </figcaption>
      )}
    </figure>
  )
}

const serif = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif"
const sans = "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif"

const styles: Record<string, React.CSSProperties> = {
  shell: {background: '#f3f3f1', minHeight: '100%', padding: 16, fontFamily: sans},
  toolbar: {display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap'},
  toggle: {border: '1px solid #ccc', background: '#fff', padding: '4px 12px', borderRadius: 4, cursor: 'pointer'},
  toggleOn: {background: '#141414', color: '#fff', borderColor: '#141414'},
  note: {fontSize: 12, color: '#6b6b6b', marginLeft: 'auto'},
  page: {background: '#fff', color: '#141414', margin: '0 auto', padding: '24px 20px 48px', lineHeight: 1.6, fontSize: 17, boxShadow: '0 1px 4px rgba(0,0,0,.08)'},
  brand: {fontWeight: 800, fontSize: 22, letterSpacing: '-0.03em', borderBottom: '3px solid #141414', paddingBottom: 10, marginBottom: 24},
  kicker: {color: '#e3121b', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8},
  h1: {fontFamily: serif, fontSize: 34, lineHeight: 1.15, margin: '0 0 12px'},
  summary: {fontFamily: serif, fontSize: 20, color: '#4a4a4a', margin: '0 0 12px'},
  meta: {fontSize: 14, color: '#6b6b6b', marginBottom: 24},
  h2: {fontFamily: serif, fontSize: 26, margin: '32px 0 12px'},
  h3: {fontFamily: serif, fontSize: 20, margin: '24px 0 8px'},
  p: {margin: '0 0 18px'},
  quote: {borderLeft: '4px solid #e3121b', margin: '24px 0', padding: '4px 0 4px 16px', fontFamily: serif, fontSize: 20, color: '#4a4a4a'},
  link: {color: 'inherit', textUnderlineOffset: 3},
  figure: {margin: '24px 0'},
  caption: {fontSize: 14, color: '#4a4a4a', marginTop: 8},
  warn: {background: '#fff3cd', color: '#7a5c00', fontSize: 13, padding: '4px 8px'},
  sources: {borderTop: '1px solid #e4e4e4', marginTop: 40, paddingTop: 8, fontSize: 15},
}
