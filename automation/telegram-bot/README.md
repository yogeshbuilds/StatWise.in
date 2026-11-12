# StatWise story bot (Telegram + Google Apps Script)

Draft, check and publish stories from your phone. The bot runs free on Google Apps Script, so no laptop is needed after setup.

```
Telegram  ──▶  Apps Script (Code.gs)  ──▶  reads the PIB release
                                      ──▶  Gemini writes the draft in house style
                                      ──▶  code checks every number against the release
                                      ──▶  QuickChart draws the featured chart
                                      ──▶  saves a DRAFT in Sanity (never live)
You reply /publish slug  ─────────────▶  Sanity publishes → webhook rebuilds statwise.in (~1 min)
```

Nothing goes live without your `/publish`.

## Daily use (10–15 minutes)

| You send | What happens |
|---|---|
| `/today` | Today's PIB releases with numbers in the headline, numbered |
| `/draft 3` | Drafts release 3 from that list |
| a PIB link | Drafts that release |
| pasted release text (first line: the link) | Drafts from the text, if the link can't be read |
| `/drafts` | Drafts waiting for review |
| `/publish slug` | Puts the draft live |
| `/publish slug checked` | Same, after you've checked the warnings |
| `/discard slug` | Deletes the draft |
| a photo with caption `slug \| alt text` | Replaces the draft's chart with your image |
| `/ping` | Checks PIB, Sanity, Gemini and the chart service |

For each draft, the bot replies with a summary, a **Preview** link to Studio and a list of anything to check. Typical items:
- a number that is in neither the release nor a calculation the bot could re-do;
- a calculation that doesn't add up;
- a category it couldn't match.

Open the preview, fix anything in Studio if needed (it works in a phone browser), then send `/publish slug`. A draft with warnings needs `/publish slug checked`, so you confirm you've looked.

## One-time setup (about 20 minutes, easiest on a computer)

### 1. Create the three keys

- **Telegram bot:**
  1. In Telegram, open **@BotFather** and send `/newbot`.
  2. Give it a name (e.g. *StatWise Desk*) and a username ending in `bot`.
  3. Copy the **token**.
- **Gemini:**
  1. Go to https://aistudio.google.com, then **Get API key → Create API key**.
  2. Copy it.
  3. On the free tier, Google may use your prompts to improve its products. That's acceptable here, because everything sent is public government data.
- **Sanity:**
  1. Go to https://www.sanity.io/manage, then project **StatWise → API → Tokens → Add API token**.
  2. Name it `telegram-bot` and set permissions to **Editor**.
  3. Copy it. It's shown only once.

### 2. Create the Apps Script project

1. Go to https://script.google.com, then **New project**. Rename it *StatWise bot*.
2. Delete everything in `Code.gs` and paste in the whole of [`Code.gs`](Code.gs) from this folder. Click **Save**.
3. **Project Settings** (gear icon):
   - Set **Time zone** to *(GMT+05:30) India Standard Time*.
   - Under **Script properties**, add:

| Property | Value |
|---|---|
| `TELEGRAM_TOKEN` | the BotFather token |
| `GEMINI_API_KEY` | the Gemini key |
| `SANITY_TOKEN` | the Sanity token |

Optional: `GEMINI_MODEL`. The default is `gemini-2.5-flash`; if `/ping` says the model isn't found, enter the current *Flash* model name shown in AI Studio.

### 3. Deploy

1. **Deploy → New deployment → Select type: Web app.**
2. Set **Execute as:** *Me*, and **Who has access:** *Anyone*.
   - "Anyone" is needed so Telegram can reach it.
   - The bot ignores any request without its secret, and any chat that isn't yours.
3. Click **Deploy** and allow the permissions.
   - Google warns that the app isn't verified, because it's your own script.
   - Click **Advanced → Go to StatWise bot (unsafe) → Allow**.
4. Copy the **Web app URL** (it ends in `/exec`) and add it as the script property `WEB_APP_URL`.
5. In the editor toolbar, choose the function **`setupWebhook`** and click **Run**.
   - The log should show `"ok":true`. This also creates `WEBHOOK_SECRET`.
6. In Telegram, open your bot and send `/start`. It replies with your **chat ID**.
   - Add it as the script property `OWNER_CHAT_ID`.
7. Send `/ping`. All four lines should be ✅.

Optional: run **`installMorningDigest`** once to get the `/today` list every morning at about 8 am.

### Updating the code later

Paste the new `Code.gs`, save, then **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**. The web app URL stays the same; skip this step and Telegram keeps running the old version.

## Limits and safety

- **Free quotas:**
  - Apps Script runs are capped at 6 minutes each. A draft takes about 20–60 seconds.
  - Gemini's free tier and QuickChart (a public chart service) are rate-limited. 2–3 stories a day is well within the limits.
- **PIB pages are read from Google's servers.** If PIB blocks them, the bot says so; paste the release text instead.
- **Telegram's delivery log may show "302" errors.** Apps Script answers web requests with a redirect, so Telegram's webhook info may show `Wrong response from the webhook: 302`. The bot handles each message once, so duplicates are ignored.
- **The source link always comes from the page the bot read, not from the model.** This prevents wrong-release links.
- **If a token leaks,** revoke it where you created it (BotFather `/revoke`, AI Studio or sanity.io/manage), make a new one and update the script property.
- **What the bot can't judge:** whether a release is worth a story, and whether the angle is fair. That's your 10 minutes.
