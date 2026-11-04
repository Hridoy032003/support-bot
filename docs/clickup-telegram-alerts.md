# ClickUp -> Telegram Alert Bot

Sends a Telegram message to your group the moment someone posts a new comment on a
ClickUp task. Built into this Next.js app as an API route, run under PM2.

## Why Telegram, not WhatsApp

- **WhatsApp's official Cloud API cannot post into a WhatsApp Group at all.** It can only
  send a message to one individual phone number. Group delivery is only possible through
  unofficial automation (e.g. Baileys/whatsapp-web.js) that drives a real WhatsApp account
  through a hidden session — free of monetary cost, but against WhatsApp's Terms of Service
  and carries a real risk of that number being banned.
- **Telegram's Bot API officially and permanently supports posting into a group, for free,
  with no usage limit that matters here.** No ban risk, no billing.

This build uses Telegram only. If you still want WhatsApp later, see "Adding WhatsApp
later" at the bottom — but go in with the ban-risk tradeoff above in mind.

## Cost

| Component | Cost |
|---|---|
| ClickUp API / webhooks | Free (included with any ClickUp plan) |
| Telegram Bot API | Free, no limits that apply here |
| This server (Node/PM2) | Whatever you already pay for hosting |

Total incremental cost: **$0**.

## Architecture

```
ClickUp task comment posted
        |
        v
ClickUp sends a signed POST webhook
        |
        v
POST /api/clickup-webhook   (this Next.js app, app/api/clickup-webhook/route.ts)
  1. verify HMAC signature (X-Signature header, using CLICKUP_WEBHOOK_SECRET)
  2. parse event, pull out comment text + author + task link
  3. call Telegram Bot API sendMessage
        |
        v
Message appears in your Telegram group
```

No polling, no Gmail access, no browser automation. ClickUp pushes the event to you in
real time.

## Files added

- `app/api/clickup-webhook/route.ts` — the webhook endpoint. `GET` is a health check,
  `POST` is what ClickUp calls.
- `scripts/list-clickup-teams.mjs` — one-off script to find your ClickUp Team ID.
- `scripts/register-clickup-webhook.mjs` — one-off script that registers the webhook with
  ClickUp and prints the signing secret.
- `scripts/get-telegram-chat-id.mjs` — one-off script to find your Telegram group's chat ID.
- `.env.local.example` — copy to `.env.local` and fill in.
- `ecosystem.config.js` — PM2 process definition.

## Setup

### 1. Create the Telegram bot and group

1. In Telegram, message **@BotFather** -> `/newbot` -> follow the prompts. You get back a
   token like `123456789:AAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`. That's `TELEGRAM_BOT_TOKEN`.
2. Create (or pick) the Telegram **group** you want alerts in, and add the bot to it as a
   member.
3. Send any message in that group (e.g. "hi").
4. Copy `.env.local.example` to `.env.local`, fill in `TELEGRAM_BOT_TOKEN`, then run:
   ```bash
   node --env-file=.env.local scripts/get-telegram-chat-id.mjs
   ```
   This prints recent updates — find the `"chat": { "id": ... }` for your group (it's a
   negative number, e.g. `-1001234567890`). Put that in `TELEGRAM_CHAT_ID` in `.env.local`.

### 2. Get a ClickUp API token and Team ID

1. ClickUp -> click your avatar (bottom-left) -> **Settings** -> **Apps** -> generate a
   personal **API Token** (starts with `pk_`). Put it in `CLICKUP_API_TOKEN`.
2. Find your Team ID:
   ```bash
   node --env-file=.env.local scripts/list-clickup-teams.mjs
   ```
   Copy the `id` of the workspace/team you want and put it in `CLICKUP_TEAM_ID`.

### 3. Deploy the app so ClickUp can reach it

ClickUp needs to be able to POST to your webhook endpoint over the public internet with
HTTPS. Point a domain/subdomain at this server (e.g. via your existing Nginx/Caddy reverse
proxy to port 3000), so the endpoint is reachable at:

```
https://your-domain.com/api/clickup-webhook
```

Set that as `CLICKUP_WEBHOOK_TARGET_URL` in `.env.local`.

### 4. Build and run under PM2

```bash
npm run build
pm2 start ecosystem.config.js
pm2 save
```

Confirm it's up:
```bash
curl https://your-domain.com/api/clickup-webhook
# -> "ClickUp webhook endpoint is live"
```

### 5. Register the webhook with ClickUp

```bash
node --env-file=.env.local scripts/register-clickup-webhook.mjs
```

This prints a `secret`. Copy it into `CLICKUP_WEBHOOK_SECRET` in `.env.local`, then restart
the app so it picks up the new value:

```bash
pm2 restart autobot --update-env
```

By default the webhook is registered for the whole Team (every Space/task). To scope it to
one List/Space/Folder/Task instead, set `CLICKUP_LIST_ID` / `CLICKUP_SPACE_ID` /
`CLICKUP_FOLDER_ID` / `CLICKUP_TASK_ID` in `.env.local` before running the register script.

### 6. Test it

Post a comment on a ClickUp task covered by the webhook. Within a few seconds it should
appear in your Telegram group. If nothing shows up:

```bash
pm2 logs autobot
```

Check for `Invalid signature` (secret mismatch — re-run step 5 and restart), or
`Telegram not configured` (missing bot token/chat id).

## Chat Channel alerts (separate feature)

ClickUp's Chat/DM feature is newer and more limited than Task comments:

- **DMs cannot be monitored at all.** Neither ClickUp's Webhooks API nor its Automations
  support a trigger for direct messages. (Open ClickUp feature request, unresolved as of
  Nov 2026: [Chat Message Received](https://feedback.clickup.com/public-api/p/chat-message-received-webhook-events-vs-api).)
- **Chat *Channels*** (not DMs) can trigger an alert, via ClickUp's Automation feature
  (different mechanism than the Task webhook above) calling our second endpoint:
  `app/api/clickup-chat-webhook/route.ts`.
- This is a **manual, per-Channel setup done in ClickUp's UI** — there's no public API to
  create Automations, so each Channel you want alerts from needs its own Automation created
  by hand, repeating the steps below with that Channel's ID.
- Triggers for a message from **any** member of the Channel, not just the person who set it
  up.

### How ClickUp actually calls the webhook (learned by testing, not documented)

ClickUp's **"Test webhook"** button only ever sends a generic dummy payload
(`{"body":"Test message from ClickUp Webhooks Service"}`) — it proves connectivity only,
never real message data. A **real** message instead POSTs a body shaped like:

```json
{
  "auto_id": "...",
  "trigger_id": "...",
  "date": "...",
  "payload": {
    "data": {
      "id": "80140065512893",
      "parent": "dfma0-153914",
      "userid": 106237137,
      "text_content": "the actual message text"
    }
  }
}
```

`payload.data.text_content`, `.userid`, and `.parent` (Channel ID) have everything needed —
no follow-up call to ClickUp's Chat API is required. The route handles both shapes: the test
ping is logged and ignored, a real payload triggers the Telegram alert.

### Setup

1. In ClickUp, open the **Chat Channel** you want alerts from -> click the **robot icon**
   (top-right of the channel) -> **Create Automation**.
2. Trigger: **Message is posted**. Action: **Call webhook**.
3. URL — hardcode the Channel ID as a static query param (no dynamic-field picker needed,
   since the real payload already carries everything in the body):
   ```
   https://autobot.omegley.in/api/clickup-chat-webhook?channel_id=<that channel's ID>
   ```
4. Custom header: `X-Webhook-Secret: <value of CLICKUP_CHAT_WEBHOOK_SECRET>` (already
   generated and set in `.env.local`).
5. Save, and make sure the automation shows **Active**.
6. Post a real message in the Channel (not "Test webhook" — that won't produce a real
   payload) and confirm it reaches Telegram. If nothing arrives, check ClickUp's own
   **Activity** tab in that Automations panel first — if it shows "No activity found", the
   problem is on ClickUp's side (it never attempted the call); if it shows an attempt, check
   `pm2 logs autobot` for what we received.

## Security notes

- Every incoming webhook request is verified against `CLICKUP_WEBHOOK_SECRET` using an
  HMAC-SHA256 signature check before anything is processed — requests without a valid
  signature are rejected with `401`.
- Secrets live only in `.env.local`, which is already gitignored.
- The endpoint only reacts to `taskCommentPosted` / `taskCommentUpdated` events; anything
  else is logged and ignored.

## Adding WhatsApp later

If you decide the ban risk is acceptable:
- **Individual number, official, free-tier-then-paid:** use Meta's WhatsApp Cloud API to
  message one phone number (not a group). Needs a Meta Business account, a verified
  WhatsApp Business phone number, and approved message templates for anything you initiate
  (free-form replies only work within a 24h customer-service window).
- **Real group, unofficial:** run a library like Baileys alongside this app, log in by
  scanning a QR code with a real WhatsApp account, and call its group-send function from
  the same webhook handler instead of (or alongside) the Telegram call. No Meta approval
  needed, no cost, but it's against WhatsApp's ToS and the number can be banned without
  notice — don't use a number you depend on.
