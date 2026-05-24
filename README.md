# PULSE — Daily News Digest (Email Bot)

Emails you a clean news digest every morning. **Free to run.** No server to
manage — it runs on GitHub Actions (free) and sends mail via Resend (free tier:
100 emails/day, 3,000/month). Pulls from the same public news feeds as the
PULSE web page.

There is **no AI here**, so there is **no per-message cost** — just free
headline-fetching and free email.

---

## How it works

```
GitHub Actions (free scheduler)
   └─ wakes up every morning on a timer
        └─ runs send-digest.js
             ├─ fetches headlines from public RSS feeds   (free)
             └─ emails them to you via Resend             (free tier)
```

Everything runs in the cloud, so your computer doesn't need to be on.

---

## What you'll need (all free)

1. A free [GitHub](https://github.com) account (this is also where the bot lives).
2. A free [Resend](https://resend.com) account — for sending the email.

No payment method required for either, at this usage level.

---

## Setup (about 10 minutes, all point-and-click)

### 1. Get a Resend API key
- Sign up at [resend.com](https://resend.com).
- In the dashboard, go to **API Keys → Create API Key**. Name it "pulse".
- Copy the key (starts with `re_...`). You'll paste it into GitHub in a moment.
- For zero setup, the bot sends *from* `onboarding@resend.dev` (Resend's shared
  testing address) — fine for emailing yourself. Later, you can verify your own
  domain in Resend to send from your own address.

### 2. Put this bot's files in a GitHub repo
- Create a new repository on GitHub (e.g. `pulse-digest`).
- Upload the contents of this folder to it (drag-and-drop in the GitHub web
  uploader works — just make sure the hidden `.github` folder goes up too; if
  drag-and-drop skips it, the easy fix is to use git, or create the file
  manually via GitHub's "Add file → Create new file" and name it
  `.github/workflows/daily.yml`, pasting in the contents).

### 3. Add your secrets to GitHub
- In your repo, go to **Settings → Secrets and variables → Actions**.
- Click **New repository secret** and add these:
  | Name | Value |
  |------|-------|
  | `RESEND_API_KEY` | your `re_...` key from step 1 |
  | `TO_EMAIL` | the email address you want the digest sent to |
  | `FROM_EMAIL` | *(optional)* leave unset to use the default sender |

  Secrets are encrypted and never visible in the code — this is the safe place
  for your key.

### 4. Test it immediately (don't wait until morning)
- Go to the **Actions** tab in your repo.
- If prompted, click to enable workflows.
- Click **Daily News Digest** in the left list, then the **Run workflow**
  button on the right. This triggers a send right now.
- Check your inbox in a minute. (Also peek in spam the first time.)

### 5. It now runs automatically
- By default it sends at **07:00 UTC** every day.
- To change the time, edit the `cron:` line in
  `.github/workflows/daily.yml`. The time is in **UTC**. A few examples are
  written in the comments of that file. For example, for ~7am Singapore time
  use `0 23 * * *` (Singapore is UTC+8, so 23:00 UTC = 07:00 next day).

---

## Customizing

- **Which topics / feeds:** edit the `FEEDS` object at the top of
  `send-digest.js`. Add or remove RSS URLs — any public RSS feed works.
- **How many headlines per section:** change `PER_SECTION` in `send-digest.js`.
- **Send more than once a day:** add more `- cron:` lines under `schedule:` in
  the workflow file.

---

## Costs

Zero, at personal-use volume. GitHub Actions gives generous free minutes for
this tiny daily job, and Resend's free tier (3,000 emails/month) is far more
than one daily email needs. The only thing that *would* cost money is if you
later added AI summaries — that part would use a paid model. The headline
digest itself is free.

---

## Troubleshooting

- **No email arrived:** check the **Actions** tab — click the latest run to see
  logs. The most common cause is a missing or mistyped `RESEND_API_KEY` or
  `TO_EMAIL` secret.
- **Email in spam:** mark it "not spam" once; sending from your own verified
  domain (set up in Resend) also helps long-term.
- **"No stories fetched":** a feed was briefly down. The bot skips quietly and
  tries again the next run.
