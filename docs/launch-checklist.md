# Launch checklist (T041) — 2026-10-30

The live site https://statwise.in was crawled: every URL in the sitemap, every internal link, every image and every outbound link.

## Result: ✅ no launch blockers

| Check | Result |
|---|---|
| HTTPS | ✅ Certificate for statwise.in (Google Trust Services), auto-renewed by Cloudflare |
| `http://` → `https://` | ✅ 301 |
| `www` → root | ✅ 301, path kept |
| Sitemap | ✅ 12 URLs, all return 200, none marked noindex; submitted to Search Console |
| robots.txt | ✅ Allows search engines; links the sitemap; AI-training crawlers blocked (owner choice) |
| Unknown URL | ✅ Custom 404 page with a real 404 status |
| Temporary workers.dev copy | ✅ `X-Robots-Tag: noindex` |
| Page titles / descriptions | ✅ Present and unique on all 12 pages. Descriptions are now trimmed to ≤160 characters |
| Canonical URLs | ✅ Each page points at its own statwise.in URL |
| One H1 per page | ✅ 12/12 |
| Structured data | ✅ Valid JSON. Home: Organization + WebSite. Articles: NewsArticle + BreadcrumbList |
| Open Graph share image | ✅ Every page (article chart or default card) |
| Internal links | ✅ 12 unique, 0 broken |
| Images | ✅ 7 load; all have alt text plus width and height |
| Accessibility (axe, WCAG 2 AA) | ✅ 0 violations on all page types (Phase 4) |
| Mobile layout | ✅ No sideways scrolling at 375 px (Phase 3/4) |
| Policies linked in footer | ✅ About, Contact, Editorial policy, Privacy policy |
| Publish → live | ✅ About 33 s (Phase 5 test) |

## To improve (not blockers)

1. ✅ *Done by owner 2026-10-30.* **SEO title for the unemployment article.** The headline is 87 characters, and Google shows about 60. In Studio, open the article → *Dates, tags & SEO* → *SEO title*, and set something like
   *"India's unemployment rate has almost halved: what PLFS data shows"* (63 characters).
2. **Source links.**
   - `rchiips.org/nfhs/` currently has an **expired HTTPS certificate**, so readers see a browser warning.
   - `censusindia.gov.in` timed out from our test location.
   - Both are government sites outside our control. Consider linking to the specific report PDF, or to an alternative official mirror, and re-check before AdSense review.
3. **Charts on phones.** Text inside the 1600×900 charts is small on mobile. For new charts use larger fonts or a 1200×1200 layout.
4. ✅ *Passed 2026-10-30 (owner): Articles + Breadcrumbs eligible.* **Rich Results Test.** Run https://search.google.com/test/rich-results on one article URL to see Google's own view of the structured data.
5. **Core Web Vitals.** Field data appears in Search Console only once there is real traffic. The site is static HTML with no JavaScript, so it should pass easily.
