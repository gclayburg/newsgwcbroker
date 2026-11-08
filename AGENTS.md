# AGENTS.md

Instructions for automated agents working in this repository. `CLAUDE.md` is a symlink to this file.

- **Publishing agents (Grok Bot / the News365 routine):** read [Publishing news editions](#publishing-news-editions). You only add or update edition files.
- **Coding agents:** also read [Developing the site](#developing-the-site).

## Project at a glance

| | |
|---|---|
| Site | https://news.gwcbroker.com |
| Repository | https://github.com/gclayburg/newsgwcbroker (public) |
| Production branch | `main`: every push to `main` is built and deployed by Vercel |
| Framework | Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Node.js 24 |
| News content | `content/news/YYYY-MM-DD.json`: one JSON file per daily edition |

There is no database and no publishing API. **Publishing = committing a valid edition file to `main`.** Vercel sees the push, builds the site, and the new edition goes live when that build succeeds.

> **Current status:** the site does not yet render editions. Edition files are stored and validated on every build, but pages that display them are still to be built. Publish normally anyway. The files you add now will appear once those pages exist.

---

## Publishing news editions

### 1. Where files go

```
content/
  news/
    2026-11-08.json
    2026-11-09.json
    ...
```

- One file per edition, named `YYYY-MM-DD.json`, using the **edition date**.
- The edition date is the calendar date in **US Mountain Time (`America/Denver`)**, the site's home timezone.
- Put **nothing else** in `content/news/`: no subfolders, drafts, `.md` files or images. The only other allowed file is `.gitkeep`.
- **The latest edition** is the file with the greatest date. Never put a future date on an edition to make it "newer".

### 2. File format (schema version 1)

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
| `date` | yes | `YYYY-MM-DD`; **must equal the filename** |
| `title` | yes | Plain text, single line, ≤ 120 chars |
| `publishedAt` | yes | ISO 8601 timestamp **with seconds and a UTC offset** (`-07:00` / `-06:00`) or `Z` |
| `updatedAt` | no | Same format as `publishedAt`; set it when you revise an edition; must not be earlier than `publishedAt` |
| `stories` | yes | Array of 1–50 story objects, in display order (most important first) |

**Story fields**

| Field | Required | Type / rule |
|---|---|---|
| `id` | yes | Lowercase kebab-case (`a-z`, `0-9`, `-`), ≤ 80 chars, **must start with the edition date** (`2026-11-08-…`), unique within the edition. Once published, never change a story's `id`. |
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

### 3. New edition vs. update

- **First publish of the day:** create `content/news/<today>.json` with `publishedAt` set to now.
- **Later updates the same day:** edit that same file. Add, reorder or correct stories, and set `updatedAt` to now. Keep `publishedAt` unchanged.
- **Past editions:** don't modify them, except to fix a factual error or a broken link. Never delete or rename edition files.

### 4. What you may change

- ✅ Files in `content/news/` only.
- ❌ Never edit application code, configuration, `package.json`, `package-lock.json`, this file, or anything else. If something outside `content/news/` seems to need a change, stop and report it instead.

### 5. Validate before you commit

From the repository root:

```bash
npm ci                     # first run, or whenever package-lock.json changed
npm run validate:content   # checks every edition file against the schema above
npm run build              # full production build; also re-runs validation
```

All commands must exit with code 0. `validate:content` prints `✓ <file>` for each good file and lists every problem otherwise. **If any check fails, fix your file and re-run. If you can't fix it, do not commit or push; report the error output.**

Vercel runs the same validation as part of every build. A bad file therefore fails the deployment and **the previous version of the site stays live**. A failed build still counts as a failed publish.

### 6. Commit and push

1. Start from an up-to-date `main`: `git checkout main && git pull --ff-only`
2. Add or update the edition file, then validate (step 5).
3. Stage only that file: `git add content/news/2026-11-08.json`
4. Commit with one of these messages:
   - New edition: `news: publish 2026-11-08`
   - Same-day update: `news: update 2026-11-08`
   - Fix to an older edition: `news: fix 2026-11-05 (<short reason>)`
5. Push straight to `main`: `git push origin main`. If the push is rejected because `main` moved, run `git pull --rebase` and validate again, then push. Never force-push.

### 7. Verify the deployment

A push is **not** published until Vercel has deployed it successfully:

1. Wait for the Vercel check on your commit to finish (typically 1–3 minutes). With the GitHub CLI:
   ```bash
   gh api repos/gclayburg/newsgwcbroker/commits/$(git rev-parse HEAD)/status --jq '.state'
   ```
   `success` means it deployed. `failure` or `error` means it did not. `pending` means the build is still running, so check again shortly.
2. Confirm the site is up: `https://news.gwcbroker.com/api/health` should return HTTP 200 with `{"status":"ok",...}`.
3. Once edition pages exist, also confirm the new edition's headlines appear on https://news.gwcbroker.com.

### 8. Reporting

After every run, report one of:

- **Published:** the edition date, the number of stories, the commit SHA, and confirmation that the Vercel check succeeded.
- **Failed:** what failed (validation, build, push or deployment), the exact error output, and whether anything was pushed. Never report a failed or unverified run as published.

---

## Developing the site

- `npm run dev` starts the dev server. Other checks: `npm run lint`, `npm run typecheck`, `npm run validate:content`, `npm run build`.
- App code lives in `src/app/`; the health endpoint is `src/app/api/health/route.ts`.
- `scripts/validate-content.mjs` is the source of truth for the edition schema. Keep it, this file, and any TypeScript types for editions in sync. Bump `schemaVersion` for breaking changes.
- Pages that read `content/news/` must treat the greatest filename date as the latest edition, and must tolerate an empty folder.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
