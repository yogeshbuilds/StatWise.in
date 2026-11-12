/**
 * StatWise.in story bot — Google Apps Script + Telegram.
 *
 * From your phone (Telegram):
 *   <PIB link>            draft a story from that release (saved as a Sanity DRAFT, never published)
 *   /today                list today's PIB releases that contain numbers; reply /draft 3 to draft one
 *   /drafts               list drafts waiting for review
 *   /publish <slug>       publish a draft (the site rebuilds automatically)
 *   /discard <slug>       delete a draft
 *   photo + caption "<slug> | <alt text>"   replace a draft's featured image with your own
 *   pasted text           draft from release text you paste (first line may be the source link)
 *   /ping                 check PIB, Gemini, Sanity and the chart service
 *
 * Secrets live in Project Settings → Script properties (never in this file):
 *   TELEGRAM_TOKEN, GEMINI_API_KEY, SANITY_TOKEN, OWNER_CHAT_ID
 * Optional: GEMINI_MODEL, SANITY_PROJECT_ID, SANITY_DATASET
 * Run setupPolling once; the bot then checks Telegram every minute (no web app deployment needed).
 *
 * Setup steps: automation/telegram-bot/README.md
 */

// ---------- config ----------

const CONFIG = {
  sanityApiVersion: '2025-02-19',
  site: 'https://statwise.in',
  studio: 'https://statwise.sanity.studio',
  rss: 'https://www.pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3&reg=3',
  red: '#E3121B',
  grey: '#BDBDBD',
}

function prop(name, fallback) {
  const value = PropertiesService.getScriptProperties().getProperty(name)
  if (value) return value
  if (fallback !== undefined) return fallback
  throw new Error(`Script property ${name} is not set`)
}

const sanityProject = () => prop('SANITY_PROJECT_ID', 'mpsmehrh')
const sanityDataset = () => prop('SANITY_DATASET', 'production')
const geminiModel = () => prop('GEMINI_MODEL', 'gemini-2.5-flash')

// ---------- Telegram: check for new messages every minute ----------

// Runs every minute (installed by setupPolling). Fetches new Telegram messages and handles them in order.
// Polling avoids Apps Script web apps, whose redirect responses make Telegram webhooks unreliable.
function poll() {
  const lock = LockService.getScriptLock()
  if (!lock.tryLock(1000)) return // the previous run is still drafting; pick up new messages next minute
  try {
    const props = PropertiesService.getScriptProperties()
    const offset = Number(props.getProperty('LAST_UPDATE_ID') || 0) + 1
    const res = telegram('getUpdates', {offset, timeout: 0, allowed_updates: ['message']})
    if (!res.ok) return note(`Telegram getUpdates failed: ${res.description}`)
    for (const update of res.result) {
      // Mark it done first, so a failure never makes the bot repeat the same message forever.
      props.setProperty('LAST_UPDATE_ID', String(update.update_id))
      processUpdate(update)
    }
  } finally {
    lock.releaseLock()
  }
}

function processUpdate(update) {
  const msg = update.message
  if (!msg || !msg.chat) return
  const chatId = String(msg.chat.id)
  const owner = PropertiesService.getScriptProperties().getProperty('OWNER_CHAT_ID')
  if (!owner) {
    note(`No OWNER_CHAT_ID yet; told chat ${chatId} its ID.`)
    send(chatId, `Your chat ID is <code>${chatId}</code>. Add it as the script property OWNER_CHAT_ID, then send /help.`)
    return
  }
  if (chatId !== owner) return note(`Ignored: message from chat ${chatId}, but OWNER_CHAT_ID is ${owner}.`)
  try {
    note(`Handling: ${(msg.text || 'photo').slice(0, 40)}`)
    handle(msg)
  } catch (err) {
    note(`Error: ${err.message}`)
    send(chatId, `⚠️ ${escapeHtml(err.message || String(err))}`)
  }
}

// Remembers the last thing the bot did, for diagnose().
function note(text) {
  console.log(text)
  PropertiesService.getScriptProperties().setProperty('LAST_EVENT', `${new Date().toISOString()} ${text}`)
}

function handle(msg) {
  const chatId = String(msg.chat.id)
  if (msg.photo) return handlePhoto(chatId, msg)
  const text = (msg.text || '').trim()
  const [command, ...rest] = text.split(/\s+/)
  const arg = rest.join(' ').trim()

  switch (command.toLowerCase().replace(/@.*$/, '')) {
    case '/start':
    case '/help':
      return send(chatId, HELP)
    case '/ping':
      return send(chatId, ping())
    case '/today':
      return send(chatId, todayList())
    case '/drafts':
      return send(chatId, listDrafts())
    case '/draft': {
      const picked = CacheService.getScriptCache().get(`today-${arg}`)
      if (!picked) return send(chatId, 'Send /today first, then /draft followed by a number from the list.')
      return draftFromUrl(chatId, picked)
    }
    case '/publish':
      return send(chatId, publish(arg))
    case '/discard':
      return send(chatId, discard(arg))
    case '/go':
      return draftFromPasted(chatId)
    case '/clear':
      clearPasted()
      return send(chatId, 'Cleared the pasted text.')
  }
  const url = (text.match(/https?:\/\/\S+/) || [])[0]
  if (url && text.length < 200) return draftFromUrl(chatId, url)
  if (text.length >= 200) return addPasted(chatId, text, url)
  return send(chatId, HELP)
}

const HELP = [
  '<b>StatWise story bot</b>',
  '• Send a PIB release link to draft a story',
  '• /today: releases with numbers, then /draft 3',
  '• /drafts: drafts waiting for review',
  '• /publish slug: put a draft live',
  '• /discard slug: delete a draft',
  '• Photo with caption <code>slug | alt text</code>: use your own image',
  '• Can’t read a link? Copy the release text, paste it here (several messages are fine), then /go. /clear starts over',
  '• /ping: check the connections',
].join('\n')

// ---------- drafting ----------

function draftFromUrl(chatId, url) {
  send(chatId, `Reading ${escapeHtml(url)} …`)
  const res = UrlFetchApp.fetch(url, {muteHttpExceptions: true, followRedirects: true})
  if (res.getResponseCode() !== 200) {
    // PIB blocks Google's servers, so fall back to text the owner copies from the page.
    clearPasted()
    CacheService.getScriptCache().put('pasted-url', url.replace('PressReleaseIframePage', 'PressReleasePage'), 21600)
    return send(chatId, [
      `The site won’t let the bot read that page (${res.getResponseCode()}). I’ve kept the link as the source.`,
      '',
      '1. Open the link on your phone',
      '2. Long-press the text → <b>Select all</b> → <b>Copy</b>',
      '3. Paste it here (long text may arrive as several messages, that’s fine)',
      '4. Send /go',
    ].join('\n'))
  }
  return draftFromSource(chatId, parseRelease(res.getContentText('UTF-8'), url))
}

// Pasted release text is collected across messages (Telegram splits long pastes) until /go.
function addPasted(chatId, text, url) {
  const cache = CacheService.getScriptCache()
  if (url && !cache.get('pasted-url')) cache.put('pasted-url', url.replace('PressReleaseIframePage', 'PressReleasePage'), 21600)
  const body = url ? text.replace(url, '').trim() : text
  const all = [cache.get('pasted-text') || '', body].filter(Boolean).join('\n\n').slice(0, 90000)
  cache.put('pasted-text', all, 21600)
  const link = cache.get('pasted-url')
  return send(chatId, `📥 Got ${all.length.toLocaleString('en-IN')} characters${link ? '' : ' (no source link yet: send the link too)'}. Paste more, or send /go to write the draft.`)
}

function clearPasted() {
  CacheService.getScriptCache().removeAll(['pasted-text', 'pasted-url'])
}

function draftFromPasted(chatId) {
  const cache = CacheService.getScriptCache()
  const text = cache.get('pasted-text')
  if (!text) return send(chatId, 'Nothing pasted yet. Paste the release text first, then /go.')
  const source = parsePasted(text, cache.get('pasted-url') || '')
  clearPasted()
  return draftFromSource(chatId, source)
}

// Text copied from a PIB page starts with the ministry, then the title, then "Posted On: …".
function parsePasted(text, url) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const head = lines.slice(0, 8)
  const pubIndex = head.findIndex((l) => /^(Ministry|Department|Cabinet|Prime Minister|President|Vice[- ]President|NITI|PIB|Office of|Election Commission)/i.test(l) && l.length < 90)
  const publisher = pubIndex >= 0 ? head[pubIndex] : ''
  const title = pubIndex >= 0 && head[pubIndex + 1] && !/^Posted On/i.test(head[pubIndex + 1]) ? head[pubIndex + 1] : ''
  const postedLine = lines.find((l) => /^Posted On/i.test(l)) || ''
  const cut = text.search(/\(Release ID:|\bVisitor Counter\b/i)
  return {
    url,
    publisher,
    title,
    posted: postedLine.replace(/^Posted On:?\s*/i, ''),
    text: (cut > 0 ? text.slice(0, cut) : text).slice(0, 30000),
  }
}

function draftFromSource(chatId, source) {
  if (source.text.length < 300) throw new Error('The release text is too short to write a story from.')
  send(chatId, `Writing a draft from “${escapeHtml(source.title || 'pasted text')}” …`)

  const categories = sanityQuery('*[_type == "category" && !(_id in path("drafts.**"))] | order(name asc){_id, name}')
  const story = writeStory(source, categories.map((c) => c.name))
  const warnings = (story.warnings || []).slice()

  // The source link always comes from what we fetched, never from the model.
  const sources = []
  if (source.url) {
    sources.push({
      _type: 'sourceLink',
      _key: key(),
      title: source.title || story.sourceTitle || 'Official release',
      publisher: [source.publisher, 'PIB'].filter(Boolean).join(' (') + (source.publisher ? ')' : ''),
      url: source.url,
    })
  } else {
    warnings.push('No source link: add one in Studio before publishing.')
  }

  const category = categories.find((c) => c.name === story.category)
  if (!category) warnings.push(`Category “${story.category}” not found; pick one in Studio.`)

  const unverified = verifyNumbers(story, source.text)
  unverified.forEach((u) => warnings.push(`Check ${u}`))

  let slug = slugify(story.slug || story.title)
  const id = `story-${slug}`
  const clash = sanityQuery('*[_type == "article" && slug.current == $slug && !(_id in [$id, "drafts." + $id])][0]._id', {slug, id})
  if (clash) {
    slug = `${slug}-${Utilities.formatDate(new Date(), 'Asia/Kolkata', 'MMdd')}`
    warnings.push(`Slug was taken; using ${slug}.`)
  }

  let featuredImage
  try {
    const png = renderChart(story.chart)
    const asset = uploadImage(png, `${slug}-featured.png`)
    featuredImage = {
      _type: 'figure',
      asset: {_type: 'reference', _ref: asset},
      alt: story.chart.alt,
      caption: story.chart.caption,
      credit: `Source: ${source.publisher || story.sourceTitle || 'official release'}. Chart: StatWise.in`,
    }
  } catch (err) {
    warnings.push(`No chart (${err.message}). Send a photo with caption “${slug} | alt text”.`)
  }

  const doc = {
    _id: `drafts.story-${slug}`,
    _type: 'article',
    title: story.title,
    slug: {_type: 'slug', current: slug},
    summary: story.summary,
    ...(category ? {category: {_type: 'reference', _ref: category._id}} : {}),
    ...(featuredImage ? {featuredImage} : {}),
    body: markdownToBlocks(story.body),
    sources,
    methodology: story.methodology,
    tags: story.tags || [],
    featured: true,
    ...(story.seoTitle && story.title.length > 60 ? {seo: {_type: 'seo', title: story.seoTitle}} : {}),
  }
  sanityMutate([{createOrReplace: doc}])
  CacheService.getScriptCache().put(`warnings-${slug}`, JSON.stringify(warnings), 21600)

  const words = story.body.split(/\s+/).length
  const lines = [
    `📝 <b>${escapeHtml(story.title)}</b>`,
    `${escapeHtml(story.summary)}`,
    `${words} words · ${escapeHtml(story.category)}`,
    '',
    warnings.length ? `⚠️ <b>${warnings.length} to check</b>\n` + warnings.map((w) => `• ${escapeHtml(w)}`).join('\n') : '✅ Every number matched the source.',
    '',
    `Preview: ${CONFIG.studio}/intent/edit/id=story-${slug};type=article`,
    `Publish: <code>/publish ${slug}</code>`,
  ]
  send(chatId, lines.join('\n'))
}

// ---------- sources ----------

function fetchRelease(url) {
  const res = UrlFetchApp.fetch(url, {muteHttpExceptions: true, followRedirects: true})
  if (res.getResponseCode() !== 200) {
    throw new Error(`The site answered ${res.getResponseCode()}. Paste the release text instead (first line: the link).`)
  }
  const html = res.getContentText('UTF-8')
  return parseRelease(html, url)
}

// Pulls the ministry, title, date and main text out of a PIB release page.
function parseRelease(html, url) {
  const byId = (id) => {
    const m = html.match(new RegExp(`id=["']${id}["'][^>]*>([\\s\\S]*?)</(?:div|h1|h2|span)>`, 'i'))
    return m ? htmlToText(m[1]).replace(/\s+/g, ' ').trim() : ''
  }
  let main = html
  const start = html.search(/id=["']PrDateTime["']/i)
  const end = html.search(/id=["']ReleaseId["']/i)
  if (start > 0 && end > start) main = html.slice(start, end)
  return {
    url: url.replace('PressReleaseIframePage', 'PressReleasePage'),
    publisher: byId('MinistryName'),
    title: byId('Titleh2'),
    posted: byId('PrDateTime').replace(/^Posted On:\s*/i, ''),
    text: [byId('Titleh2'), byId('Subtitleh3'), htmlToText(main)].filter(Boolean).join('\n\n').slice(0, 30000),
  }
}

function htmlToText(html) {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li|h\d)>/gi, '\n')
    .replace(/<\/t[dh]>/gi, ' | ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;|&lsquo;/g, '’')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim()
}

function todayList() {
  const res = UrlFetchApp.fetch(CONFIG.rss, {muteHttpExceptions: true, followRedirects: true})
  if (res.getResponseCode() !== 200) return `PIB won’t let the bot read its feed (${res.getResponseCode()}). Open pib.gov.in → All Releases on your phone instead, then send me a link.`
  const items = [...res.getContentText('UTF-8').matchAll(/<item><title>([\s\S]*?)<\/title><link>([\s\S]*?)<\/link>/g)].map((m) => ({
    title: htmlToText(m[1]),
    url: m[2].trim(),
  }))
  // Releases whose headline carries a figure are the likeliest data stories.
  const dataLike = items.filter((i) => /\d/.test(i.title) && /(crore|lakh|%|per cent|tonne|million|billion|GW|MW|index|growth|record|rise|fall)/i.test(i.title))
  const list = (dataLike.length ? dataLike : items).slice(0, 12)
  const cache = CacheService.getScriptCache()
  list.forEach((i, n) => cache.put(`today-${n + 1}`, i.url, 21600))
  if (!list.length) return 'No releases in the feed right now.'
  return [`<b>${dataLike.length ? 'Releases with numbers' : 'Latest releases'}</b>`, ...list.map((i, n) => `${n + 1}. ${escapeHtml(i.title)}`), '', 'Reply <code>/draft 3</code> to draft one.'].join('\n')
}

// ---------- writing (Gemini) ----------

const STYLE = `You write for StatWise.in, a minimalist Indian news site that explains official public data.
Rules:
- Use ONLY facts and numbers that appear in the SOURCE TEXT. Never add outside facts, figures, quotes, causes or forecasts.
- You may calculate differences, percentage changes and shares from source numbers. List EVERY calculated number in "calculations" as plain arithmetic on numbers copied from the source (or on earlier calculation results), and explain them briefly in "methodology". A number that is neither in the source nor in "calculations" will be rejected.
- Indian conventions: ₹ with lakh/crore and Indian digit grouping (₹2,31,290 crore). Never convert to US dollars. British/Indian spelling (modernise, programme).
- Plain, neutral English. Short sentences. No hype words (record-breaking, massive, robust, landmark) unless quoting the source's own claim, and then attribute it ("the ministry said").
- Attribute claims and intentions to the source ("the ministry said", "the government expects").
- Body: 350–600 words of Markdown using only: paragraphs, "## " headings, "- " bullets, "1. " numbered lists, **bold**.
- Body structure: 2 opening paragraphs (what happened with the key number in bold; why it matters), "## What the <main keyword> data shows" with a short list of the key figures, one more "## " section with context from the source, "## What the numbers don’t tell us" (gaps and limits of the release, no speculation), "## The bottom line" (2–3 sentences).
- Title: under 65 characters, contains the key number. Summary: 120–200 characters.
- Category: exactly one name from the CATEGORIES list.
- Chart: one simple bar chart (2–10 bars) of the release's most important comparable numbers, exact values from the source. highlightIndex = the bar to show in red (usually the latest/largest). Alt text 80–220 characters describing the values.
- "warnings": list anything the reader could misread or that the release leaves unclear. Do not write [NEED DATA] anywhere.`

const STORY_SCHEMA = {
  type: 'OBJECT',
  properties: {
    title: {type: 'STRING'},
    seoTitle: {type: 'STRING', description: 'Under 60 characters'},
    slug: {type: 'STRING', description: 'lowercase-words-with-hyphens, under 70 characters'},
    summary: {type: 'STRING'},
    category: {type: 'STRING'},
    body: {type: 'STRING'},
    methodology: {type: 'STRING', description: 'Max 80 words. Which release, and each calculation with its arithmetic.'},
    tags: {type: 'ARRAY', items: {type: 'STRING'}},
    sourceTitle: {type: 'STRING', description: 'Title of the release as written in the source'},
    chart: {
      type: 'OBJECT',
      properties: {
        title: {type: 'STRING'},
        subtitle: {type: 'STRING', description: 'Measure, unit and period'},
        labels: {type: 'ARRAY', items: {type: 'STRING'}},
        values: {type: 'ARRAY', items: {type: 'NUMBER'}},
        unit: {type: 'STRING', description: 'e.g. "₹ crore", "%", "million tonnes"'},
        highlightIndex: {type: 'INTEGER'},
        horizontal: {type: 'BOOLEAN', description: 'true for long labels or more than 5 bars'},
        alt: {type: 'STRING'},
        caption: {type: 'STRING'},
      },
      required: ['title', 'subtitle', 'labels', 'values', 'unit', 'highlightIndex', 'alt', 'caption'],
    },
    calculations: {
      type: 'ARRAY',
      description: 'Every number you calculated rather than copied, as plain arithmetic on source numbers.',
      items: {
        type: 'OBJECT',
        properties: {
          expression: {type: 'STRING', description: 'Only digits, decimal points, + - * / and brackets, e.g. "(145.07 / 133.93 - 1) * 100"'},
          result: {type: 'NUMBER', description: 'The result as written in the story, e.g. 8.32'},
          meaning: {type: 'STRING'},
        },
        required: ['expression', 'result'],
      },
    },
    warnings: {type: 'ARRAY', items: {type: 'STRING'}},
  },
  required: ['title', 'slug', 'summary', 'category', 'body', 'methodology', 'tags', 'chart', 'calculations', 'warnings'],
}

function writeStory(source, categoryNames) {
  const prompt = [
    STYLE,
    `CATEGORIES: ${categoryNames.join('; ')}`,
    `SOURCE (${source.publisher || 'unknown publisher'}, ${source.posted || 'date unknown'}):`,
    source.text,
  ].join('\n\n')
  const res = UrlFetchApp.fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel()}:generateContent`, {
    method: 'post',
    contentType: 'application/json',
    headers: {'x-goog-api-key': prop('GEMINI_API_KEY')},
    muteHttpExceptions: true,
    payload: JSON.stringify({
      contents: [{role: 'user', parts: [{text: prompt}]}],
      generationConfig: {temperature: 0.3, responseMimeType: 'application/json', responseSchema: STORY_SCHEMA},
    }),
  })
  if (res.getResponseCode() !== 200) throw new Error(`Gemini answered ${res.getResponseCode()}: ${res.getContentText().slice(0, 200)}`)
  const data = JSON.parse(res.getContentText())
  const text = data.candidates && data.candidates[0] && data.candidates[0].content.parts.map((p) => p.text).join('')
  if (!text) throw new Error('Gemini returned no draft.')
  return JSON.parse(text)
}

// ---------- number check ----------

// Every number in the story must be in the source (allowing lakh/crore-style rescaling) or be the result of a
// calculation the model declared in `calculations`, which is re-computed here from source numbers.
// Returns a list of problems to show before publishing.
function verifyNumbers(story, sourceText) {
  const problems = []
  const known = numbersIn(sourceText).map((n) => n.value)
  const isIn = (n, list) => list.some((s) => [1, 10, 100, 1e3, 1e5, 1e7].some((k) => close(n, s / k) || close(n, s * k)))

  for (const c of story.calculations || []) {
    const expr = String(c.expression || '').replace(/,/g, '').replace(/[×x]/g, '*').replace(/÷/g, '/').replace(/−/g, '-')
    if (!/^[\d.\s+\-*/()]+$/.test(expr)) {
      problems.push(`calculation “${c.expression}” could not be checked`)
      continue
    }
    const operands = numbersIn(expr).filter((n) => !(Number.isInteger(n.value) && n.value <= 100 && /[*/]\s*100\b|\b1\s*-|-\s*1\b/.test(expr)))
    const unknown = operands.filter((n) => !isIn({value: n.value, decimals: n.decimals}, known))
    let value
    try {
      value = Function(`"use strict"; return (${expr})`)()
    } catch (err) {
      value = NaN
    }
    if (unknown.length) {
      problems.push(`calculation “${c.expression}” uses ${unknown.map((n) => n.raw).join(', ')}, not in the source`)
    } else if (!isFinite(value) || !close({value: Number(c.result), decimals: decimalsOf(c.result)}, value)) {
      problems.push(`calculation “${c.expression}” gives ${round(value, 4)}, not ${c.result}`)
    } else {
      known.push(value) // later calculations and the text may use this result
    }
  }

  const fields = [story.title, story.summary, story.body, story.methodology, story.chart && story.chart.alt, story.chart && story.chart.caption]
  for (const field of fields.filter(Boolean)) {
    for (const n of numbersIn(field)) {
      if (Number.isInteger(n.value) && n.value <= 12) continue // counts, months, list numbers
      if (!isIn(n, known)) problems.push(`“${n.raw}” in: …${field.slice(Math.max(0, n.index - 40), n.index + 30).replace(/\s+/g, ' ')}…`)
    }
  }
  if (story.chart) {
    story.chart.values.forEach((v, i) => {
      if (!isIn({value: v, decimals: decimalsOf(v)}, known)) problems.push(`chart value ${v} (${story.chart.labels[i]})`)
    })
  }
  return uniq(problems).slice(0, 15)
}

// True when `exact` rounds to n at n's number of decimals (so 42% matches 42.2, 8.32% matches 8.3178).
function close(n, exact) {
  return Math.abs(exact - n.value) <= 0.5 * Math.pow(10, -n.decimals) + 1e-9
}

function round(v, d) {
  return Math.round(v * Math.pow(10, d)) / Math.pow(10, d)
}

function numbersIn(text) {
  const out = []
  const re = /\d[\d,]*(?:\.\d+)?/g
  let m
  while ((m = re.exec(text))) {
    const raw = m[0].replace(/,$/, '')
    const clean = raw.replace(/,/g, '')
    const value = parseFloat(clean)
    if (!isNaN(value)) out.push({raw, value, decimals: (clean.split('.')[1] || '').length, index: m.index})
  }
  return out
}

function decimalsOf(v) {
  return (String(v).split('.')[1] || '').length
}

// ---------- chart (QuickChart renders Chart.js to PNG) ----------

function renderChart(chart) {
  if (!chart || !chart.values || !chart.values.length) throw new Error('no chart data')
  const colors = chart.values.map((_, i) => (i === chart.highlightIndex ? CONFIG.red : CONFIG.grey))
  const config = {
    type: chart.horizontal ? 'horizontalBar' : 'bar',
    data: {labels: chart.labels, datasets: [{data: chart.values, backgroundColor: colors, barPercentage: 0.7}]},
    options: {
      legend: {display: false},
      layout: {padding: {left: 40, right: 70, top: 20, bottom: 30}},
      title: {display: true, text: [chart.title, `${chart.subtitle}`], fontSize: 30, fontColor: '#151515', fontStyle: 'bold', padding: 30},
      scales: {
        xAxes: [{gridLines: {display: !!chart.horizontal, color: '#eeeeee'}, ticks: {fontSize: 22, fontColor: '#333333', beginAtZero: true}}],
        yAxes: [{gridLines: {display: !chart.horizontal, color: '#eeeeee'}, ticks: {fontSize: 22, fontColor: '#333333', beginAtZero: true}}],
      },
      plugins: {
        datalabels: {
          anchor: 'end',
          align: chart.horizontal ? 'right' : 'top',
          color: '#151515',
          font: {size: 22, weight: 'bold'},
          formatter: `(v) => v.toLocaleString('en-IN')`,
        },
      },
    },
  }
  const res = UrlFetchApp.fetch('https://quickchart.io/chart', {
    method: 'post',
    contentType: 'application/json',
    muteHttpExceptions: true,
    payload: JSON.stringify({chart: JSON.stringify(config).replace(/"(\(v\) => [^"]+)"/, '$1'), width: 1600, height: 900, format: 'png', backgroundColor: 'white'}),
  })
  if (res.getResponseCode() !== 200) throw new Error(`chart service answered ${res.getResponseCode()}`)
  return res.getBlob().setName('chart.png')
}

// ---------- Sanity ----------

function sanityUrl(path) {
  return `https://${sanityProject()}.api.sanity.io/v${CONFIG.sanityApiVersion}/${path}`
}

function sanityQuery(query, params) {
  let url = sanityUrl(`data/query/${sanityDataset()}?query=${encodeURIComponent(query)}&perspective=raw`)
  Object.keys(params || {}).forEach((k) => (url += `&${encodeURIComponent('$' + k)}=${encodeURIComponent(JSON.stringify(params[k]))}`))
  const res = UrlFetchApp.fetch(url, {headers: {Authorization: `Bearer ${prop('SANITY_TOKEN')}`}, muteHttpExceptions: true})
  if (res.getResponseCode() !== 200) throw new Error(`Sanity query failed (${res.getResponseCode()}): ${res.getContentText().slice(0, 200)}`)
  return JSON.parse(res.getContentText()).result
}

function sanityMutate(mutations) {
  const res = UrlFetchApp.fetch(sanityUrl(`data/mutate/${sanityDataset()}?visibility=sync`), {
    method: 'post',
    contentType: 'application/json',
    headers: {Authorization: `Bearer ${prop('SANITY_TOKEN')}`},
    payload: JSON.stringify({mutations}),
    muteHttpExceptions: true,
  })
  if (res.getResponseCode() !== 200) throw new Error(`Sanity save failed (${res.getResponseCode()}): ${res.getContentText().slice(0, 300)}`)
  return JSON.parse(res.getContentText())
}

function uploadImage(blob, filename) {
  const res = UrlFetchApp.fetch(sanityUrl(`assets/images/${sanityDataset()}?filename=${encodeURIComponent(filename)}`), {
    method: 'post',
    contentType: blob.getContentType() || 'image/png',
    headers: {Authorization: `Bearer ${prop('SANITY_TOKEN')}`},
    payload: blob.getBytes(),
    muteHttpExceptions: true,
  })
  if (res.getResponseCode() !== 200) throw new Error(`image upload failed (${res.getResponseCode()})`)
  return JSON.parse(res.getContentText()).document._id
}

function listDrafts() {
  const drafts = sanityQuery('*[_type == "article" && _id in path("drafts.**")] | order(_updatedAt desc){title, "slug": slug.current, "img": defined(featuredImage.asset)}')
  if (!drafts.length) return 'No drafts waiting.'
  return ['<b>Drafts</b>', ...drafts.map((d) => `• ${escapeHtml(d.title)}${d.img ? '' : ' (no image)'}\n  <code>/publish ${d.slug}</code>`)].join('\n')
}

function publish(arg) {
  const [slug, force] = arg.split(/\s+/)
  if (!slug) return 'Usage: /publish slug'
  const draft = sanityQuery('*[_type == "article" && _id in path("drafts.**") && slug.current == $slug][0]', {slug})
  if (!draft) return `No draft with slug ${escapeHtml(slug)}. Send /drafts to see them.`
  const missing = ['title', 'summary', 'category', 'body', 'featuredImage'].filter((f) => !draft[f])
  if (missing.length) return `Can’t publish yet: missing ${missing.join(', ')}. Fix it in Studio.`
  const warnings = JSON.parse(CacheService.getScriptCache().get(`warnings-${slug}`) || '[]')
  if (warnings.length && force !== 'checked') {
    return `This draft had ${warnings.length} item(s) to check. If you have checked them, send <code>/publish ${escapeHtml(slug)} checked</code>.`
  }
  const publishedId = draft._id.replace(/^drafts\./, '')
  const existing = sanityQuery('*[_id == $id][0]{publishedAt}', {id: publishedId})
  const doc = Object.assign({}, draft, {_id: publishedId, publishedAt: (existing && existing.publishedAt) || new Date().toISOString()})
  ;['_rev', '_createdAt', '_updatedAt'].forEach((f) => delete doc[f])
  sanityMutate([{createOrReplace: doc}, {delete: {id: draft._id}}])
  CacheService.getScriptCache().remove(`warnings-${slug}`)
  return `✅ Published. Live in about a minute:\n${CONFIG.site}/stories/${slug}/`
}

function discard(slug) {
  if (!slug) return 'Usage: /discard slug'
  const draft = sanityQuery('*[_type == "article" && _id in path("drafts.**") && slug.current == $slug][0]._id', {slug})
  if (!draft) return `No draft with slug ${escapeHtml(slug)}.`
  sanityMutate([{delete: {id: draft}}])
  return `🗑️ Draft ${escapeHtml(slug)} deleted.`
}

function handlePhoto(chatId, msg) {
  const [slug, alt] = (msg.caption || '').split('|').map((s) => s.trim())
  if (!slug) return send(chatId, 'Add a caption: <code>slug | alt text describing the image</code>')
  const draft = sanityQuery('*[_type == "article" && _id in path("drafts.**") && slug.current == $slug][0]{_id, featuredImage}', {slug})
  if (!draft) return send(chatId, `No draft with slug ${escapeHtml(slug)}.`)
  if (!alt && !(draft.featuredImage && draft.featuredImage.alt)) return send(chatId, 'Add alt text after the slug: <code>slug | what the image shows</code>')
  const photo = msg.photo[msg.photo.length - 1] // largest size
  const file = telegram('getFile', {file_id: photo.file_id}).result
  const blob = UrlFetchApp.fetch(`https://api.telegram.org/file/bot${prop('TELEGRAM_TOKEN')}/${file.file_path}`).getBlob()
  const asset = uploadImage(blob, `${slug}-featured.jpg`)
  const figure = Object.assign({_type: 'figure'}, draft.featuredImage || {}, {asset: {_type: 'reference', _ref: asset}}, alt ? {alt} : {})
  sanityMutate([{patch: {id: draft._id, set: {featuredImage: figure}}}])
  send(chatId, `🖼️ Image updated for ${escapeHtml(slug)}.`)
}

// ---------- Portable Text ----------

// Markdown subset → Portable Text: paragraphs, ##/###, - bullets, 1. numbers, > quotes, **bold**, *italic*.
function markdownToBlocks(md) {
  const blocks = []
  let para = []
  const flush = () => {
    if (para.length) blocks.push(block(para.join(' ')))
    para = []
  }
  String(md || '')
    .split('\n')
    .forEach((raw) => {
      const line = raw.trim()
      if (!line) return flush()
      let m
      if ((m = line.match(/^(#{2,3})\s+(.*)$/))) {
        flush()
        blocks.push(block(m[2], m[1].length === 2 ? 'h2' : 'h3'))
      } else if ((m = line.match(/^>\s?(.*)$/))) {
        flush()
        blocks.push(block(m[1], 'blockquote'))
      } else if ((m = line.match(/^[-*•]\s+(.*)$/))) {
        flush()
        blocks.push(block(m[1], 'normal', 'bullet'))
      } else if ((m = line.match(/^\d+[.)]\s+(.*)$/))) {
        flush()
        blocks.push(block(m[1], 'normal', 'number'))
      } else if (/^#\s/.test(line)) {
        flush() // a top-level heading would duplicate the title
      } else {
        para.push(line)
      }
    })
  flush()
  return blocks
}

function block(text, style, listItem) {
  const b = {_type: 'block', _key: key(), style: style || 'normal', markDefs: [], children: spans(text)}
  if (listItem) {
    b.listItem = listItem
    b.level = 1
  }
  return b
}

function spans(text) {
  return text
    .split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g)
    .filter(Boolean)
    .map((part) => {
      if (/^\*\*.+\*\*$/.test(part)) return {_type: 'span', _key: key(), text: part.slice(2, -2), marks: ['strong']}
      if (/^\*.+\*$/.test(part)) return {_type: 'span', _key: key(), text: part.slice(1, -1), marks: ['em']}
      return {_type: 'span', _key: key(), text: part, marks: []}
    })
}

// ---------- helpers ----------

function telegram(method, payload) {
  const res = UrlFetchApp.fetch(`https://api.telegram.org/bot${prop('TELEGRAM_TOKEN')}/${method}`, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  })
  return JSON.parse(res.getContentText())
}

function send(chatId, html) {
  // Telegram messages are capped at 4,096 characters.
  const result = telegram('sendMessage', {chat_id: chatId, text: html.slice(0, 4000), parse_mode: 'HTML', disable_web_page_preview: true})
  if (!result.ok) note(`Telegram did not send the message: ${JSON.stringify(result)}`)
  return result
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/₹/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70)
    .replace(/-+$/g, '')
}

function key() {
  return Utilities.getUuid().replace(/-/g, '').slice(0, 12)
}

function uniq(list) {
  return [...new Set(list)]
}

function ping() {
  const check = (name, fn) => {
    try {
      return `✅ ${name}: ${fn()}`
    } catch (err) {
      return `❌ ${name}: ${escapeHtml(err.message)}`
    }
  }
  return [
    check('PIB', () => {
      const code = UrlFetchApp.fetch(CONFIG.rss, {muteHttpExceptions: true}).getResponseCode()
      if (code !== 200) throw new Error(`answered ${code}: PIB blocks the bot’s server. Links still work as the source; paste the text and send /go`)
      return 'readable'
    }),
    check('Sanity', () => `${sanityQuery('count(*[_type == "article"])')} articles`),
    check('Gemini', () => {
      const r = UrlFetchApp.fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel()}`, {headers: {'x-goog-api-key': prop('GEMINI_API_KEY')}, muteHttpExceptions: true})
      if (r.getResponseCode() !== 200) throw new Error(`answered ${r.getResponseCode()}`)
      return geminiModel()
    }),
    check('Chart service', () => `${renderChart({title: 't', subtitle: 's', labels: ['a', 'b'], values: [1, 2], highlightIndex: 1}).getBytes().length} bytes`),
  ].join('\n')
}

// ---------- one-time setup (run from the Apps Script editor) ----------

/** Run once: switches Telegram to polling and checks for messages every minute. Safe to run again. */
function setupPolling() {
  Logger.log(JSON.stringify(telegram('deleteWebhook', {drop_pending_updates: true})))
  ScriptApp.getProjectTriggers().filter((t) => t.getHandlerFunction() === 'poll').forEach((t) => ScriptApp.deleteTrigger(t))
  ScriptApp.newTrigger('poll').timeBased().everyMinutes(1).create()
  Logger.log('Done. The bot now checks Telegram every minute. Send it /start.')
}

/** Troubleshooting: run from the editor and read the log. Secrets are not printed. */
function diagnose() {
  const p = PropertiesService.getScriptProperties().getProperties()
  const lines = []
  ;['TELEGRAM_TOKEN', 'GEMINI_API_KEY', 'SANITY_TOKEN', 'OWNER_CHAT_ID'].forEach((k) =>
    lines.push(`${k}: ${p[k] ? (k === 'OWNER_CHAT_ID' ? p[k] : `set (${p[k].length} chars)`) : 'MISSING'}`),
  )
  const known = /^(TELEGRAM_TOKEN|GEMINI_API_KEY|SANITY_TOKEN|OWNER_CHAT_ID|GEMINI_MODEL|SANITY_PROJECT_ID|SANITY_DATASET|LAST_EVENT|LAST_UPDATE_ID|WEB_APP_URL|WEBHOOK_SECRET)$/
  const unknown = Object.keys(p).filter((k) => !known.test(k))
  if (unknown.length) lines.push(`Unexpected property names (typo?): ${unknown.join(', ')}`)
  const triggers = ScriptApp.getProjectTriggers().filter((t) => t.getHandlerFunction() === 'poll').length
  lines.push(`Every-minute trigger installed: ${triggers > 0 ? 'yes' : 'NO, run setupPolling'}`)
  if (p.TELEGRAM_TOKEN) {
    const me = telegram('getMe', {})
    lines.push(`Bot: ${me.ok ? '@' + me.result.username : 'token rejected: ' + me.description}`)
    const hook = telegram('getWebhookInfo', {}).result || {}
    lines.push(`Old webhook still set: ${hook.url ? 'YES, run setupPolling' : 'no'}`)
  }
  lines.push(`Last thing the bot did: ${p.LAST_EVENT || 'nothing yet'}`)
  Logger.log('\n' + lines.join('\n'))
}

/** Troubleshooting: sends a test message to OWNER_CHAT_ID. If it arrives, the token and chat ID are right. */
function testMessage() {
  Logger.log(JSON.stringify(send(prop('OWNER_CHAT_ID'), '✅ Test message from the StatWise bot.')))
}

/** Optional: run once to get the /today list on Telegram every morning at about 8 am. */
function installMorningDigest() {
  ScriptApp.getProjectTriggers().filter((t) => t.getHandlerFunction() === 'morningDigest').forEach((t) => ScriptApp.deleteTrigger(t))
  ScriptApp.newTrigger('morningDigest').timeBased().atHour(8).everyDays(1).inTimezone('Asia/Kolkata').create()
}

function morningDigest() {
  send(prop('OWNER_CHAT_ID'), todayList())
}
