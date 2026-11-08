# AGENTS.md

Instructions for automated agents working in this repository. `CLAUDE.md` is a symlink to this file.

- **Publishing agents (Grok Bot / the News365 routine):** read [Publishing news editions](#publishing-news-editions). You only add edition files and their photos.
- **Coding agents:** also read [Developing the site](#developing-the-site).

## Project at a glance

| | |
|---|---|
| Site | https://news.gwcbroker.com |
| Repository | https://github.com/gclayburg/newsgwcbroker (public) |
| Production branch | `main`: every push to `main` is built and deployed by Vercel |
| Framework | Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Node.js 24 |
| News content | `content/news/YYYY-MM-DD-HHMM.json`: one JSON file per edition, named by its publish date and time in Mountain Time |
| Story photos | `public/news-images/<story id>.webp`: WebP, 600 px wide, stored in the repository and served by the site at `/news-images/<file>` |
| Timezone | All edition dates and times are **US Mountain Time (`America/Denver`)** |
| Pages | `/` = latest edition · `/editions` = archive · `/editions/<file name without .json>` = one edition (e.g. `/editions/2026-11-08-0700`) |

There is no database and no publishing API. **Publishing = committing a valid edition file to `main`.** Vercel sees the push, builds the site, and the new edition goes live when that build succeeds.

**The homepage always shows the single latest edition**, meaning the edition with the latest publish date and time. Publishing a new edition replaces the homepage contents. Older editions stay in the repository as the archive.

Each story is shown with its headline (linked to the original article), source, date, category and summary. When a story has an `image`, the photo is shown beside it with its caption and credit underneath. Stories without an image are shown as text only.

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
- Put **nothing else** in `content/news/`: no subfolders, drafts, `.md` files or images (photos go in `public/news-images/`; see step 4). The only other allowed file is `.gitkeep`.

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
  "subtitle": "Ten leading U.S. and Colorado stories from overnight and the past day.",
  "intro": "Six national stories and four Colorado stories, ranked by prominence and relevance across reputable outlets.",
  "publishedAt": "2026-11-08T07:00:00-07:00",
  "stories": [
    {
      "id": "2026-11-08-fed-holds-rates-steady",
      "headline": "Fed holds rates steady, signals patience into 2027",
      "summary": "The Federal Reserve left its benchmark rate unchanged on Wednesday...",
      "sourceName": "Reuters",
      "sourceUrl": "https://www.reuters.com/markets/us/example-article",
      "category": "Markets",
      "publishedAt": "2026-11-08T06:15:00-07:00",
      "image": {
        "file": "2026-11-08-fed-holds-rates-steady.webp",
        "alt": "The Federal Reserve chair speaks at a podium during a news conference",
        "caption": "the Federal Reserve chair at a news conference in Washington on Nov. 5, 2026.",
        "credit": "Jane Doe/Reuters, via Reuters."
      }
    },
    {
      "id": "2026-11-08-i-70-closure-de-beque",
      "headline": "Semi crash briefly closes eastbound I-70 near De Beque",
      "summary": "A semi hauling a transformer lost its load Saturday afternoon...",
      "sourceName": "KKCO",
      "sourceUrl": "https://www.example.com/kkco/i-70-closure"
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
| `subtitle` | no | One-line description shown under the title. Plain text, single line, ≤ 300 chars |
| `intro` | no | Short paragraph shown under the date heading (e.g. how stories were chosen, which stories lack photos and why). Plain text, ≤ 1200 chars; line breaks allowed |
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
| `image` | no | The story's photo; see **Image fields** below. Omit it for a text-only story. |

**Image fields** (inside `image`)

| Field | Required | Type / rule |
|---|---|---|
| `file` | yes | File name of the stored photo in `public/news-images/` (no folder), named after the story: `<story id>.webp`, or `<story id>-2.webp` (`-3`, ...) for a replacement photo. See **Storing photos** below. |
| `alt` | yes | What the photo shows, for screen readers. Plain text, single line, ≤ 300 chars |
| `caption` | no | Describes the photo. Shown as `Photo: <caption> <credit>`, so start lowercase and end with a period (e.g. `supporters at a rally in Denver on Nov. 5, 2026.`). Plain text, ≤ 300 chars |
| `credit` | yes | Photographer and/or agency and outlet, ending with a period (e.g. `Brian Eason, The Colorado Sun.` or `Finn Gomez/Getty Images, via Axios.`). Plain text, ≤ 150 chars |

**Photo rules**

- Use the article's own lead photo, or another photo that genuinely shows the story's subject. Say in `caption` when it is a file photo (e.g. `file photo of ... from July 2026.`).
- **Skip the image** (text-only story) when the photo is blocked, broken, a logo or a generic stock image (e.g. a police light bar). Mention this in `intro` if you like.
- Always credit the photographer/agency and the outlet in `credit`.

**Storing photos**

The site never loads images from news sites. Each photo is **downloaded once, resized, and stored in this repository** as a file in `public/news-images/`. Use the helper, which downloads, converts and names the file correctly:

```bash
npm run news:image -- "<image URL or local file>" <story id>
# e.g.
npm run news:image -- "https://cdn.example.com/photo.jpg" 2026-11-08-fed-holds-rates-steady
```

- It saves `public/news-images/<story id>.webp`: **WebP, 600 px wide** (smaller originals are not enlarged), at most 900 px tall and 150 KB, with camera/location metadata removed. It then prints the `"image"` JSON to put in the story (fill in `alt`, `caption`, `credit`).
- The URL must be the **image file itself** (usually the article's lead image, e.g. its `og:image`), not the article page. If the download fails (blocked, 404, not an image, smaller than 200 px), the helper says why. Then **publish the story without a photo**.
- **Carried-over stories reuse their existing photo file.** Don't download it again. If the helper says the file already exists, just reference it.
- To give a story a **different** photo, run the helper with `--replace`. It saves `<story id>-2.webp` (then `-3`, ...). Point the story's `image.file` at the new name. Never overwrite or delete an existing photo: older editions still use it.
- If you can't run the helper, produce the same result yourself: a WebP file 600 px wide (200–600 px if the original is narrower), ≤ 900 px tall, ≤ 150 KB, saved under the name above. Validation checks all of this.

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

- ✅ Edition files in `content/news/`.
- ✅ **New** photo files in `public/news-images/` for the stories you publish. Add only; never modify or delete existing photos.
- ❌ Never edit application code, configuration, `package.json`, `package-lock.json`, this file, or anything else. If something outside `content/news/` and `public/news-images/` seems to need a change, stop and report it instead.

### 7. Validate before you commit

From the repository root:

```bash
npm ci                     # first run, or whenever package-lock.json changed
npm run validate:content   # checks every edition file and its photos against the rules above
npm run build              # full production build; also re-runs validation
```

All commands must exit with code 0. `validate:content` prints `✓ <file>` for each good file and lists every problem otherwise, including photos that are missing, the wrong size, or not WebP. (A "Note: ... photos are not used by any edition" line is informational, not an error.) **If any check fails, fix your file and re-run. If you can't fix it, do not commit or push; report the error output.**

Vercel runs the same validation as part of every build. A bad file therefore fails the deployment and **the previous version of the site stays live**. A failed build still counts as a failed publish.

### 8. Commit and push

1. Start from an up-to-date `main`: `git checkout main && git pull --ff-only`
2. Save the new photos (`npm run news:image`), add the new edition file (or correct an existing one), then validate (step 7).
3. Stage only the edition file and the photos you added:
   `git add content/news/2026-11-08-1530.json public/news-images/2026-11-08-*.webp`
   Check with `git status` that nothing else is staged and no new photo is left out.
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
3. Open https://news.gwcbroker.com and confirm it shows **your** edition as the latest: its title appears at the top under a "Latest edition" label, with your headlines and photos. Your edition is also listed first at https://news.gwcbroker.com/editions.

### 10. Reporting

After every run, report one of:

- **Published:** the edition file name (date and time), the number of stories, the commit SHA, and confirmation that the Vercel check succeeded.
- **Failed:** what failed (validation, build, push or deployment), the exact error output, and whether anything was pushed. Never report a failed or unverified run as published.

---

## Developing the site

- `npm run dev` starts the dev server. Other checks: `npm run lint`, `npm run typecheck`, `npm run validate:content`, `npm run build`.
- App code lives in `src/app/`; the health endpoint is `src/app/api/health/route.ts`.
- `scripts/validate-content.mjs` is the source of truth for the edition schema. Keep it, this file, and any TypeScript types for editions in sync. Bump `schemaVersion` for breaking changes.
- Pages: `src/app/page.tsx` (latest edition), `src/app/editions/page.tsx` (archive), `src/app/editions/[id]/page.tsx` (one edition). Layout in `src/components/edition-view.tsx`; header (Download PDF = print dialog, Copy link, theme toggle) in `src/components/site-chrome.tsx` and `header-actions.tsx`. Editions are loaded by `src/lib/editions.ts`.
- Theme: CSS tokens in `src/app/globals.css`. It follows the OS light/dark setting until the visitor clicks the toggle; that choice is saved in `localStorage("theme")` and applied before paint by an inline script in `layout.tsx`. Use the token colors (`bg-background`, `text-muted`, `border-border`, ...), not Tailwind's `dark:` variant, which ignores the toggle.
- Photos: `image.file` is resolved to `/<NEWS_IMAGES_PATH>/<file>` by `imageUrl()` in `src/lib/editions.ts` (default `news-images`, i.e. `public/news-images/`). They are plain `<img>` tags; files are already sized, so no runtime image optimization is used. Photo rules live in `scripts/lib/news-images.mjs`; conversion (sharp) in `scripts/lib/image-convert.mjs`; the helper is `scripts/prepare-image.mjs` (`npm run news:image`).
- Pages that read `content/news/` must:
  - show the edition with the **greatest `publishedAt`** on the homepage. Compare parsed timestamps, not file names: the name only has minute precision, and Mountain Time repeats the 1 a.m. hour when daylight saving ends;
  - treat each edition as a complete front page (no merging across editions);
  - tolerate an empty folder.

### Testing locally with the sandbox

Never put test editions in `content/news/` or test photos in `public/news-images/`. Use the sandbox instead. It holds made-up editions in `.sandbox/news/` and their photos in `public/news-images-sandbox/` (both git-ignored). The site reads them when `NEWS_CONTENT_DIR=.sandbox/news` and `NEWS_IMAGES_PATH=news-images-sandbox` are set (the `*:sandbox` scripts do this):

```bash
npm run sandbox:seed      # replace the sandbox with ~4 days of made-up editions (--days N, --seed N)
npm run dev:sandbox       # dev server reading .sandbox/news; header shows a SANDBOX badge
npm run sandbox:publish   # add an edition stamped "now", like Grok Bot would; reload to see it as latest
npm run sandbox:list      # list sandbox editions (★ = latest)
npm run sandbox:clear     # delete the sandbox
npm run build:sandbox     # production build from the sandbox (then npm start); run npm run build afterwards to go back
```

`scripts/sandbox.mjs` refuses to write inside `content/` or `public/news-images/`. Sandbox stories, outlets and towns are fictional, and links go to `example.com`. Photos are downloaded once from the placeholder service picsum.photos (needs internet) and converted with the same code as `npm run news:image`, so they match real photos exactly (600 px WebP). A photo that fails to download makes its story text-only.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
