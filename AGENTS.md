# AGENTS.md

Instructions for automated agents working in this repository. `CLAUDE.md` is a symlink to this file.

- **Publishing agents (Grok Bot / the News365 routine):** read [Publishing news editions](#publishing-news-editions). You only add edition files.
- **Coding agents:** also read [Developing the site](#developing-the-site).

## Project at a glance

| | |
|---|---|
| Site | https://news.gwcbroker.com |
| Repository | https://github.com/gclayburg/newsgwcbroker (public) |
| Production branch | `main`: every push to `main` is built and deployed by Vercel |
| Framework | Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Node.js 24 |
| News content | `content/news/YYYY-MM-DD-HHMM.json`: one JSON file per edition, named by its publish date and time in Mountain Time |
| Timezone | All edition dates and times are **US Mountain Time (`America/Denver`)** |

There is no database and no publishing API. **Publishing = committing a valid edition file to `main`.** Vercel sees the push, builds the site, and the new edition goes live when that build succeeds.

**The homepage always shows the single latest edition**, meaning the edition with the latest publish date and time. Publishing a new edition replaces the homepage contents. Older editions stay in the repository as the archive.

> **Current status:** the site does not yet render editions. Edition files are stored and validated on every build, but pages that display them are still to be built. Publish normally anyway. The files you add now will appear once those pages exist.

---

## Publishing news editions

### 1. Editions: usually one a day, sometimes more

- Normally there is **one edition per day**, e.g. a morning edition.
- Later the same day there may be **additional editions**: an update, a breaking-news edition, an evening edition. There may be several.
- **Every edition is a new, separate file** named with its publish date *and* time. Never overwrite or rename an existing edition to publish newer news.
- **Each edition is a complete front page.** The homepage shows only the latest edition, so a later edition must contain **every story that should appear on the homepage**: stories carried over from earlier editions plus new ones, in display order. It is not a list of only what changed.

### 2. Where files go and how they are named

```
content/
  news/
    2026-11-08-0700.json   ← morning edition, 7:00 a.m. MT
    2026-11-08-1530.json   ← later update, 3:30 p.m. MT
    2026-11-08-2015.json   ← evening edition, 8:15 p.m. MT  (latest, so this one shows on the homepage)
    2026-11-09-0700.json
    ...
```

- File name: **`YYYY-MM-DD-HHMM.json`**
  - `YYYY-MM-DD`: the publish date in Mountain Time
  - `HHMM`: the publish time in Mountain Time, **24-hour clock**, hours and minutes, no colon (`0700` = 7:00 a.m., `1530` = 3:30 p.m., `0005` = 12:05 a.m.)
- The file name must match the edition's `publishedAt` timestamp converted to Mountain Time (see below). Example: `publishedAt` `2026-11-08T15:30:00-07:00` → `2026-11-08-1530.json`.
- If a file with that name already exists (two editions in the same minute), wait until the next minute and use the new time. Never overwrite an existing edition.
- Put **nothing else** in `content/news/`: no subfolders, drafts, `.md` files or images. The only other allowed file is `.gitkeep`.

### 3. Which edition is "latest"

The **latest edition is the one with the latest `publishedAt`** timestamp. Its file name is also the latest date and time. That edition is what the homepage shows.

- `publishedAt` must be the actual time you publish. **Never use a future time.** A future timestamp would make the edition "latest" too early and is rejected by validation.
- Two editions may not share the same `publishedAt`.

### 4. File format (schema version 1)

Example file `content/news/2026-11-08-0700.json`:

```json
{
  "schemaVersion": 1,
  "date": "2026-11-08",
  "title": "Morning Briefing — November 8, 2026",
  "publishedAt": "2026-11-08T07:00:00-07:00",
  "stories": [
    {
      "id": "2026-11-08-fed-holds-rates-steady",
      "headline": "Fed holds rates steady, signals patience into 2027",
      "summary": "The Federal Reserve left its benchmark rate unchanged on Wednesday...",
      "sourceName": "Reuters",
      "sourceUrl": "https://www.reuters.com/markets/us/example-article",
      "category": "Markets",
      "publishedAt": "2026-11-08T06:15:00-07:00"
    }
  ]
}
```

**Edition fields**

| Field | Required | Type / rule |
|---|---|---|
| `schemaVersion` | yes | The number `1` |
| `date` | yes | `YYYY-MM-DD`, the Mountain Time publish date; **must equal the date in the file name** |
| `title` | yes | Plain text, single line, ≤ 120 chars (e.g. `Morning Briefing — November 8, 2026`, `Afternoon Update — November 8, 2026`) |
| `publishedAt` | yes | When this edition is published: ISO 8601 **with seconds and a UTC offset**. Use the Mountain Time offset: `-07:00` while standard time is in effect (roughly November–March), `-06:00` during daylight saving time (roughly March–November). Converted to Mountain Time, it must match the file name's date and `HHMM`. Must not be in the future. |
| `updatedAt` | no | Same format; set it **only** when correcting an error in an already-published edition (see step 5); must not be earlier than `publishedAt` |
| `stories` | yes | Array of 1–50 story objects, in display order (most important first) |

**Story fields**

| Field | Required | Type / rule |
|---|---|---|
| `id` | yes | Lowercase kebab-case (`a-z`, `0-9`, `-`), ≤ 80 chars, **must start with the date the story first appeared** (`2026-11-08-…`), unique within the edition. **When a story carries over into a later edition, keep the same `id`.** Never change an `id` once published. |
| `headline` | yes | Plain text, single line, ≤ 200 chars |
| `summary` | yes | Plain text, ≤ 800 chars; may contain line breaks; **no HTML, no Markdown** |
| `sourceName` | yes | Publication name, plain text, ≤ 100 chars (e.g. `Reuters`) |
| `sourceUrl` | yes | Full `https://` URL to the original article |
| `category` | no | Plain text, ≤ 40 chars (e.g. `Markets`, `Technology`, `Local`) |
| `publishedAt` | no | When the source published the story; same timestamp format |

**Any other field is rejected.** Don't add fields; ask the repository owner to extend the schema instead.

**Content rules**

- Write summaries **in your own words**. Do not paste article text or long quotes. Always link the original in `sourceUrl`.
- Use plain UTF-8 text. Typographic quotes and dashes are fine. No HTML tags, Markdown syntax, emoji-only headlines or tracking parameters in URLs (strip `utm_*`).
- Files must be valid JSON: double quotes, no comments, no trailing commas. Format with 2-space indentation and a final newline.

### 5. New editions vs. corrections

- **New or updated news (any time of day):** create a **new** edition file with the current Mountain Time date and time. Include all stories that should be on the homepage. Carried-over stories keep their `id`, and you may revise their headline or summary.
- **Correcting a mistake in an edition you already published** (a factual error, typo or broken link): edit that edition's file in place and set `updatedAt` to now. Keep `publishedAt` and the file name unchanged. If the edition is still the latest one, the correction appears on the homepage after deployment.
- Never delete or rename edition files.

### 6. What you may change

- ✅ Files in `content/news/` only.
- ❌ Never edit application code, configuration, `package.json`, `package-lock.json`, this file, or anything else. If something outside `content/news/` seems to need a change, stop and report it instead.

### 7. Validate before you commit

From the repository root:

```bash
npm ci                     # first run, or whenever package-lock.json changed
npm run validate:content   # checks every edition file against the rules above
npm run build              # full production build; also re-runs validation
```

All commands must exit with code 0. `validate:content` prints `✓ <file>` for each good file and lists every problem otherwise. **If any check fails, fix your file and re-run. If you can't fix it, do not commit or push; report the error output.**

Vercel runs the same validation as part of every build. A bad file therefore fails the deployment and **the previous version of the site stays live**. A failed build still counts as a failed publish.

### 8. Commit and push

1. Start from an up-to-date `main`: `git checkout main && git pull --ff-only`
2. Add the new edition file (or correct an existing one), then validate (step 7).
3. Stage only that file: `git add content/news/2026-11-08-1530.json`
4. Commit with one of these messages:
   - New edition: `news: publish 2026-11-08 15:30`
   - Correction: `news: fix 2026-11-08 07:00 (<short reason>)`
5. Push straight to `main`: `git push origin main`. If the push is rejected because `main` moved, run `git pull --rebase` and validate again, then push. Never force-push.

### 9. Verify the deployment

A push is **not** published until Vercel has deployed it successfully:

1. Wait for the Vercel check on your commit to finish (typically 1–3 minutes). With the GitHub CLI:
   ```bash
   gh api repos/gclayburg/newsgwcbroker/commits/$(git rev-parse HEAD)/status --jq '.state'
   ```
   `success` means it deployed. `failure` or `error` means it did not. `pending` means the build is still running, so check again shortly.
2. Confirm the site is up: `https://news.gwcbroker.com/api/health` should return HTTP 200 with `{"status":"ok",...}`.
3. Once edition pages exist, also confirm that https://news.gwcbroker.com shows **your** edition (its title and headlines) as the latest.

### 10. Reporting

After every run, report one of:

- **Published:** the edition file name (date and time), the number of stories, the commit SHA, and confirmation that the Vercel check succeeded.
- **Failed:** what failed (validation, build, push or deployment), the exact error output, and whether anything was pushed. Never report a failed or unverified run as published.

---

## Developing the site

- `npm run dev` starts the dev server. Other checks: `npm run lint`, `npm run typecheck`, `npm run validate:content`, `npm run build`.
- App code lives in `src/app/`; the health endpoint is `src/app/api/health/route.ts`.
- `scripts/validate-content.mjs` is the source of truth for the edition schema. Keep it, this file, and any TypeScript types for editions in sync. Bump `schemaVersion` for breaking changes.
- Pages that read `content/news/` must:
  - show the edition with the **greatest `publishedAt`** on the homepage. Compare parsed timestamps, not file names: the name only has minute precision, and Mountain Time repeats the 1 a.m. hour when daylight saving ends;
  - treat each edition as a complete front page (no merging across editions);
  - tolerate an empty folder.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
