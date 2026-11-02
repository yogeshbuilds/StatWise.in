# AdSense readiness review (T040) — 2026-10-30

**Verdict: not ready to apply yet.** The site is technically ready. The gap is content volume, plus a few trust signals. Approval is never guaranteed.

## Official requirements ([AdSense eligibility](https://support.google.com/adsense/answer/9724), [Program policies](https://support.google.com/adsense/answer/48182))

| Requirement | Status |
|---|---|
| Applicant is 18+ | ✅ (owner) |
| You can edit the site's HTML (to add the ad code and `ads.txt`) | ✅ Code in GitHub, via `web/` |
| High-quality, original content that attracts an audience | ⚠️ **7 articles** (4 by the owner, 3 AI-assisted demos) as of 2026-10-31, and Google is still indexing |
| Complies with Program policies (no ads on non-content pages, easy navigation, no pop-ups or forced redirects) | ✅ Static site, clear menus, no pop-ups |

## What to do before applying

1. **Publish a solid body of original stories.**
   - Google publishes no minimum count. Community experience suggests **roughly 15–30 substantial articles** over several weeks; that is an estimate, not policy.
   - Each story should add analysis and context, not just restate a press release.
   - The most common rejection is "low value content".
2. **Make the demo articles yours.**
   - They were drafted with AI assistance.
   - Before applying, re-verify every figure against the source, check for newer releases (PLFS 2024-25, NFHS-6), and revise them with your own angle. Or replace them.
   - Unreviewed AI text is a common rejection reason.
3. **Show a way to contact you.**
   - The Contact page currently has no address.
   - Free option: Cloudflare **Email Routing** (statwise.in → Email → Email Routing) to forward `hello@statwise.in` to your Gmail.
   - Then set `contactEmail` in `web/src/config/site.ts`.
4. **Strengthen the About page.**
   - Say who runs the site and why it can be trusted (your background or interest in data), even without giving your name.
   - Transparency helps both readers and reviewers.
5. **Wait for indexing and some organic traffic.**
   - There is no official traffic minimum. Still, a site Google has indexed, with a few weeks of history, tends to review better than a brand-new domain.

## How the site is wired (2026-10-31, D008)

All switches live in `ADS` in `web/src/config/site.ts`. Commit and push, and the site rebuilds.

| Step | What you do | What the site does |
|---|---|---|
| 1. Sign up | Create an AdSense account at adsense.google.com with your Google account and add the site `statwise.in`. | — |
| 2. Verify and apply | Copy your publisher ID (`ca-pub-…`) into `ADS.client`. In AdSense choose **Meta tag** (or **ads.txt**) verification, then **Request review**. | Adds the `google-adsense-account` meta tag on every page and a valid `/ads.txt`, and shows the advertising section in the privacy policy. |
| 3. Consent message | AdSense → **Privacy & messaging → European regulations** → create and publish the message (free Google-certified CMP). | Nothing to change; it loads with the ad script. |
| 4. After approval | AdSense → **Ads → By ad unit → Display ads**: create two responsive units, *in-article* and *after-article*. Paste each `data-ad-slot` number into `ADS.slots`. | Story pages load the ad script and show the two slots. Other pages stay ad-free. |
| 5. Keep Auto ads off | AdSense → Ads → By site → statwise.in → Auto ads: **off**. | The layout stays as designed. |

Also change the `effective` date in `web/src/pages/privacy-policy.astro` in the same commit as step 2.

## Revenue planning (assumption, not a promise)

Monthly revenue ≈ monthly page views ÷ 1,000 × page RPM. Indian-audience RPMs are typically low, so treat any number as an assumption until real AdSense data exists (PRD §9).
