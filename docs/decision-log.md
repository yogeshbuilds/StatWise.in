# StatWise.in — Decision Log

Record every decision that changes scope, adds recurring cost, or adds maintenance.
Provider limits were checked on 2026-10-30; re-check before relying on them.

---

## D001 — Content scope (T001) — 2026-10-30 — Accepted

- Every article is **text + images only**.
- Charts, graphs, maps and infographics are made outside the site and uploaded as images (with alt text and an optional caption).
- No chart block, chart builder, map builder or visualization library is in the MVP.
- Not in the MVP: public accounts, comments, subscriptions, multi-author workflow, data scraping, AI auto-publishing.

## D002 — CMS: Sanity Free plan (T002) — 2026-10-30 — Accepted, preview approach to be proven in T016

Sanity Free plan limits (sanity.io/pricing):

| Item | Free limit | Our expected use |
|---|---|---|
| Price | $0 | — |
| Seats | 20 (Administrator + Viewer roles) | 1 |
| Datasets | 2, **public only** (private datasets need paid Growth, $15/seat/month) | 1 (`production`) |
| Documents | 10,000 | Hundreds in year one |
| API requests | 250k / month | Low: queried only at build time |
| API CDN requests | 1M / month | Low |
| Bandwidth | 100 GB / month | Images served from Sanity CDN; monitor |
| Asset storage | 100 GB | Fine for compressed PNG/WebP charts |
| Webhooks | 2 GROQ webhooks | 1 (publish → deploy) |

Draft privacy (Sanity docs, "Drafts"):
- A "public" dataset means **published** documents can be read without a token. That's acceptable because they are public on the website anyway.
- **Drafts and versions are not served to unauthenticated requests.** So drafts stay private even on a public dataset. ✅
- ⚠️ Caveat: an **image file** uploaded to a draft gets a public CDN URL straight away, and anyone who knows the exact URL can open it. The URL is random and not listed anywhere, but do not upload truly confidential images.

Preview decision:
- Preview happens **inside Sanity Studio**, which is protected by your Sanity login. The plan is a Studio preview pane that renders the article like the site does, at desktop and mobile widths.
- No read token is placed in the public site, and no public `/preview` route exists. This meets PRD §10 without a paid plan.
- To be verified in T016 before Phase 2 is marked done.
- **Verified 2026-10-30 (T016):** `studio/scripts/test-draft-privacy.ts` created a draft and queried the public API without a token using the `published`, `drafts` and `raw` perspectives. All three returned nothing, while the logged-in client could read the draft.
  - Control check: the 16 published categories are returned publicly.
  - Preview is the Studio "Preview" tab (`studio/components/ArticlePreview.tsx`), with a desktop/mobile toggle.
- Project: `mpsmehrh`, dataset `production` (public). Studio: https://statwise.sanity.studio.
- The dataset already held 7 trial documents from 2026-10-29 (types post, story, author, tag, siteSettings, a "Fundamentals" category, one image). The new schema uses only `article` and `category`.
  - **Deleted 2026-10-30** at the owner's request. A copy is in the backup `exports/statwise-2026-10-30.tar.gz`. The dataset now holds only the 16 seeded categories.

## D003 — Hosting: Cloudflare Pages Free (T003) — 2026-10-30 — Accepted

| Item | Free limit | Notes |
|---|---|---|
| Builds | 500 / month, 1 concurrent | Roughly 1 build per publish; plenty |
| Build timeout | 20 min | An Astro build should take about 1–2 min |
| Files per site | 20,000 | Images are served by Sanity, not stored on Pages |
| Custom domains | 100 per project | statwise.in + www |
| Redirects | 2,000 static (`_redirects`) | Used when an article's slug changes |
| Rollback | Previous deployments are kept; a failed build does not replace the live site | Meets PRD §7 |

Deploy hook:
- A secret URL; a POST to it starts a build. **It must be treated as a secret**: store it only in Sanity's webhook settings, never in code.

## D003a — Hosting change: Cloudflare Workers (static assets) instead of Pages — 2026-10-30 — Accepted

- Cloudflare's dashboard now creates **Workers** projects by default, and the owner's account showed only the Workers flow.
- The site is served as **static assets on a Worker**, configured in `web/wrangler.jsonc`, with no Worker script.
- Still free; the site is still static HTML.
- Build settings: root `web`, build `npm run build`, deploy `npx wrangler deploy`. Node version comes from `web/.nvmrc`.
- ⚠️ Workers Builds documents **no deploy hook**; builds start only on a git push. So D004 changes:
  - The Sanity webhook will trigger a **GitHub Actions** workflow (`repository_dispatch`).
  - That workflow either builds and deploys with Wrangler, or pushes an empty commit that Workers Builds picks up.
  - To be designed and tested in T032/T033, using a narrowly scoped token stored only in Sanity and GitHub secrets.

## D003b — Workers Builds Deploy Hook (supersedes the GitHub Actions plan in D003a) — 2026-10-30 — Accepted

- Cloudflare Workers Builds now offers **Deploy Hooks**: a secret URL that starts a build of `main` on POST. It allows 10 builds per minute per Worker, and triggers that arrive while a build is still queued are merged.
- So the setup is now **Sanity webhook → Deploy Hook**. No GitHub token and no GitHub Actions are needed.
- The hook URL is stored only in the Sanity webhook settings.

## D004 — Publish → deploy automation — 2026-10-30 — Accepted

- One Sanity GROQ webhook (filter `_type in ["article", "category"]`) calls the Cloudflare deploy hook.
- Sanity webhooks **do not fire on draft saves by default**, so "saving a draft must not deploy" is met without extra work. ✅
- Delivery is at-least-once, so duplicates are possible. A duplicate only triggers one more identical build, which is harmless. ✅
- Unpublish and delete are document changes too, so they also trigger a rebuild, which removes the article from listings and the sitemap.

## D005 — Architecture (T004) — 2026-10-30 — Accepted

**Astro (static output) + Sanity Studio / Content Lake + Cloudflare Pages + GitHub.**

- The public site is plain static HTML and makes no CMS calls when someone reads a page.
- Sanity Studio is the admin. It is hosted free at `<name>.sanity.studio`, with login handled by Sanity.
- Only the Sanity project ID and dataset name, which are not secret, go into the site build. No write token is ever used by the site.

Alternatives considered:
- **Decap/Git-based CMS:** articles would live in Git, which breaks the goal of publishing without Git. Rejected.
- **WordPress:** needs paid hosting, updates and security patching. Too much upkeep. Rejected.
- **Custom backend:** forbidden by the PRD unless required. Rejected.

## D006 — Domain (T005) — Pending (owner)

- Cloudflare Registrar **does not sell `.in` domains**, so statwise.in has to be bought from another registrar (e.g. GoDaddy, Hostinger, BigRock, Namecheap).
- After buying, change the domain's **nameservers to Cloudflare** (free plan) so DNS, HTTPS and email forwarding work.
- Record here: registrar, first-year price, renewal price, renewal date.

## D007 — Site identity and editorial decisions — 2026-10-30 — Accepted

- **Brand:** text wordmark. "StatWise" in vibrant red and ".in" in near-black.
- **Author:** single owner. **No author name is shown publicly**; articles show no byline, and structured data uses the organisation "StatWise.in" as author.
- **Contact email:** not shown yet. The Contact page has a reserved slot that appears once an email is set in the site config.
- **Analytics:** Google Search Console only. No Google Analytics, so the privacy policy will say there is no tracking analytics.
- **Design:** minimalist news/media look: white background, black text, red accent, serif headlines, clean sans-serif body text, no clutter.
- **URLs:** articles at `/stories/<slug>/`, categories at `/category/<slug>/`, listing at `/stories/`.
- **Categories:** see `docs/categories.md`. A category page is generated only once it has at least one published article, to avoid thin pages.
- **Launch content:** Claude writes 2–3 demo articles from real public data, with sources cited. The owner reviews them before launch.
