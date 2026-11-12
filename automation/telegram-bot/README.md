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
| pasted release text, then `/go` | Drafts from text you copied (for pages the bot can't read); several messages are fine |
| `/clear` | Throws away pasted text and starts over |
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

### 3. Start the bot

1. In the editor toolbar, choose the function **`setupPolling`** and click **▷ Run**.
   - Allow the permissions Google asks for. It warns the app isn't verified, because it's your own script: click **Advanced → Go to StatWise bot (unsafe) → Allow**.
   - This removes any old webhook and makes the bot check Telegram **every minute**.
2. In Telegram, send `/start` to your bot. **Within a minute** it replies with your **chat ID**.
   - Add it as the script property `OWNER_CHAT_ID`.
3. Send `/ping`. All four lines should be ✅.

There's no web app to deploy: the bot runs on a timer.

Optional: run **`installMorningDigest`** once to get the `/today` list every morning at about 8 am.

### If it doesn't reply

Run **`diagnose`** from the editor and read the log. It shows:
- which properties are set,
- whether the every-minute timer is installed,
- the bot's name,
- the last thing the bot did, e.g. "Ignored: message from chat 123, but OWNER_CHAT_ID is 456".

It doesn't print your secrets.

### Updating the code later

Paste the new `Code.gs` and click **Save**. That's it: the timer always runs the saved code.

## Limits and safety

- **Free quotas:**
  - Apps Script runs are capped at 6 minutes each. A draft takes about 20–60 seconds.
  - Gemini's free tier and QuickChart (a public chart service) are rate-limited. 2–3 stories a day is well within the limits.
- **PIB blocks Google's servers (403).** This was confirmed by `/ping` on 2026-11-12, so the bot can't read PIB pages or the `/today` feed itself. Instead:
  1. Send the link. The bot keeps it as the source.
  2. Open the release on your phone → long-press → **Select all** → **Copy**, and paste it into the chat.
  3. Send `/go`.

  The bot reads the ministry, title and date from the copied text. Other official sites that allow the bot work with the link alone.
- **Replies take up to a minute,** because the bot checks Telegram every minute.
  - This uses about 15 minutes of the 90-minute daily Apps Script timer allowance, leaving plenty for drafting.
  - It's used instead of a webhook because Apps Script web apps answer with redirects, which Telegram treats as failures.
- **The source link always comes from the page the bot read, not from the model.** This prevents wrong-release links.
- **If a token leaks,** revoke it where you created it (BotFather `/revoke`, AI Studio or sanity.io/manage), make a new one and update the script property.
- **What the bot can't judge:** whether a release is worth a story, and whether the angle is fair. That's your 10 minutes.
