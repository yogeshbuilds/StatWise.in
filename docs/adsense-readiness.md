# AdSense readiness review (T040) — 2026-10-30

**Verdict: not ready to apply yet.** The site is technically ready. The gap is content volume, plus a few trust signals. Approval is never guaranteed.

## Official requirements ([AdSense eligibility](https://support.google.com/adsense/answer/9724), [Program policies](https://support.google.com/adsense/answer/48182))

| Requirement | Status |
|---|---|
| Applicant is 18+ | ✅ (owner) |
| You can edit the site's HTML (to add the ad code and `ads.txt`) | ✅ Code in GitHub, via `web/` |
| High-quality, original content that attracts an audience | ⚠️ **Only 3 articles**, all demos, and no audience yet |
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

## When you are ready to turn ads on (do these together)

- [ ] **Update the privacy policy before adding any ad code.** It must say that third-party vendors, including Google, use cookies to serve ads based on prior visits, and link to opt-outs: Google [Ads Settings](https://adssettings.google.com) and aboutads.info. See [AdSense required disclosures](https://support.google.com/adsense/answer/1348695).
- [ ] **Consent for Europe and the UK.** Google requires a Google-certified consent tool (CMP) for visitors from the EEA, UK and Switzerland. AdSense's built-in **Privacy & messaging → European regulations message** is free.
- [ ] **`ads.txt`.** After approval, add `web/public/ads.txt` with the line AdSense gives you (`google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0`).
- [ ] **Ad slots.** Planned positions that don't block reading:
  - one in-article slot after the 3rd paragraph,
  - one below the article, before "Related stories",
  - none above the headline, and none on policy, contact or 404 pages.
  - Use **manual ad units** rather than Auto ads at first, so the layout stays clean.
- [ ] Record the decision and any recurring changes in `docs/decision-log.md`.

## Revenue planning (assumption, not a promise)

Monthly revenue ≈ monthly page views ÷ 1,000 × page RPM. Indian-audience RPMs are typically low, so treat any number as an assumption until real AdSense data exists (PRD §9).
